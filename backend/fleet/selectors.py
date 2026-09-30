import datetime
from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING, TypedDict

from django.db.models import (
    Count,
    DecimalField,
    Exists,
    F,
    Max,
    OuterRef,
    Prefetch,
    Q,
    QuerySet,
    Sum,
    Value,
)
from django.db.models.functions import Coalesce

from fleet.models import MaintenanceRecord, Mechanic, Office, Vehicle

if TYPE_CHECKING:
    from django_stubs_ext import WithAnnotations

NEEDS_MAINTENANCE_AFTER = datetime.timedelta(days=365)
ZERO_COST = Value(Decimal(0), output_field=DecimalField(max_digits=12, decimal_places=2))


class OfficeSummaryFields(TypedDict):
    active_vehicle_count: int
    maintenance_cost_last_year: Decimal
    last_maintenance: datetime.date | None


class WorkloadFields(TypedDict):
    jobs_this_year: int
    cost_this_year: Decimal


class LastMaintenanceFields(TypedDict):
    last_maintenance: datetime.date | None


@dataclass(frozen=True, kw_only=True)
class VehicleFilters:
    office: int | None = None
    is_active: bool | None = None
    make: str | None = None
    model: str | None = None
    maintenance_from: datetime.date | None = None
    maintenance_to: datetime.date | None = None
    mechanic_certification: str | None = None


def one_year_before(day: datetime.date) -> datetime.date:
    try:
        return day.replace(year=day.year - 1)
    except ValueError:  # Feb 29 -> Feb 28
        return day.replace(year=day.year - 1, day=28)


def search_vehicles(filters: VehicleFilters) -> QuerySet[Vehicle]:
    vehicles = Vehicle.objects.all()
    if filters.office is not None:
        vehicles = vehicles.filter(office_id=filters.office)
    if filters.is_active is not None:
        vehicles = vehicles.filter(is_active=filters.is_active)
    if filters.make:
        vehicles = vehicles.filter(make__iexact=filters.make)
    if filters.model:
        vehicles = vehicles.filter(model__iexact=filters.model)

    # Date range and mechanic must match the same maintenance record, so they
    # share one Exists() subquery instead of separate joins.
    record_filters = Q()
    if filters.maintenance_from:
        record_filters &= Q(performed_on__gte=filters.maintenance_from)
    if filters.maintenance_to:
        record_filters &= Q(performed_on__lte=filters.maintenance_to)
    if filters.mechanic_certification:
        record_filters &= Q(mechanic__certification_number=filters.mechanic_certification)
    if record_filters:
        records = MaintenanceRecord.objects.filter(record_filters, vehicle=OuterRef("pk"))
        vehicles = vehicles.filter(Exists(records))
    return vehicles


def vehicle_with_history() -> QuerySet[Vehicle]:
    history = MaintenanceRecord.objects.select_related("mechanic")
    return Vehicle.objects.select_related("office").prefetch_related(
        Prefetch("maintenance_records", queryset=history)
    )


def vehicle_history(vehicle: Vehicle) -> QuerySet[MaintenanceRecord]:
    return vehicle.maintenance_records.select_related("mechanic").order_by("-performed_on", "-id")


def active_plate_taken(plate: str, *, exclude_pk: int | None = None) -> bool:
    taken = Vehicle.objects.filter(license_plate=plate, is_active=True)
    if exclude_pk is not None:
        taken = taken.exclude(pk=exclude_pk)
    return taken.exists()


def vehicle_conflicts(
    *, vin: str | None, plate: str | None, exclude_pk: int | None = None
) -> list[str]:
    conflicts = []
    others = Vehicle.objects.all() if exclude_pk is None else Vehicle.objects.exclude(pk=exclude_pk)
    if vin and others.filter(vin=vin).exists():
        conflicts.append("vin")
    if plate and active_plate_taken(plate, exclude_pk=exclude_pk):
        conflicts.append("license_plate")
    return conflicts


def office_summary(
    *, today: datetime.date
) -> "QuerySet[WithAnnotations[Office, OfficeSummaryFields]]":
    # Single join chain office -> vehicle -> record: each record appears once,
    # so Sum isn't inflated; Count needs distinct because of the record join.
    since = one_year_before(today)
    in_window = Q(vehicles__maintenance_records__performed_on__gte=since)
    return Office.objects.annotate(
        active_vehicle_count=Count("vehicles", filter=Q(vehicles__is_active=True), distinct=True),
        maintenance_cost_last_year=Coalesce(
            Sum("vehicles__maintenance_records__cost", filter=in_window), ZERO_COST
        ),
        last_maintenance=Max("vehicles__maintenance_records__performed_on"),
    ).order_by("name", "city")


def mechanic_workload(*, year: int) -> "QuerySet[WithAnnotations[Mechanic, WorkloadFields]]":
    this_year = Q(maintenance_records__performed_on__year=year)
    return (
        Mechanic.objects.annotate(
            jobs_this_year=Count("maintenance_records", filter=this_year),
            cost_this_year=Coalesce(Sum("maintenance_records__cost", filter=this_year), ZERO_COST),
        )
        .filter(Q(is_active=True) | Q(jobs_this_year__gt=0))
        .order_by("-jobs_this_year", "-cost_this_year", "name")
    )


def vehicles_needing_maintenance(
    *, today: datetime.date
) -> "QuerySet[WithAnnotations[Vehicle, LastMaintenanceFields]]":
    cutoff = today - NEEDS_MAINTENANCE_AFTER
    return (
        Vehicle.objects.filter(is_active=True)
        .annotate(last_maintenance=Max("maintenance_records__performed_on"))
        .filter(Q(last_maintenance__isnull=True) | Q(last_maintenance__lt=cutoff))
        .order_by(F("last_maintenance").asc(nulls_first=True), "vin")
    )
