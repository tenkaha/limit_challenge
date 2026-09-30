import datetime
from collections.abc import Callable, Mapping
from typing import Any, ClassVar, override

from django.http import QueryDict
from django.utils import timezone
from rest_framework import serializers

from fleet.models import MaintenanceRecord, Mechanic, Office, Vehicle
from fleet.models.vehicle import PLATE_TAKEN_MESSAGE, plate_format_validator
from fleet.normalization import normalize_certification, normalize_plate, normalize_vin
from fleet.selectors import VehicleFilters, active_plate_taken

MAX_YEARS_AHEAD = 1


class OfficeSerializer(serializers.ModelSerializer[Office]):
    class Meta:
        model = Office
        fields = ("id", "name", "city")


class MechanicSerializer(serializers.ModelSerializer[Mechanic]):
    class Meta:
        model = Mechanic
        fields = ("id", "name", "certification_number", "is_active")

    @override
    def to_internal_value(self, data: Any) -> Any:
        return super().to_internal_value(
            _normalize(data, certification_number=normalize_certification)
        )


class VehicleSerializer(serializers.ModelSerializer[Vehicle]):
    class Meta:
        model = Vehicle
        fields: tuple[str, ...] = (
            "id",
            "vin",
            "license_plate",
            "make",
            "model",
            "year",
            "office",
            "is_active",
        )
        # DRF's auto UniqueValidator for the conditional plate constraint ignores
        # the incoming is_active, so validate() checks it instead.
        extra_kwargs: ClassVar = {"license_plate": {"validators": [plate_format_validator]}}

    @override
    def to_internal_value(self, data: Any) -> Any:
        return super().to_internal_value(
            _normalize(data, vin=normalize_vin, license_plate=normalize_plate)
        )

    @override
    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        plate = attrs.get("license_plate", getattr(self.instance, "license_plate", None))
        active = attrs.get("is_active", getattr(self.instance, "is_active", True))
        exclude_pk = self.instance.pk if self.instance is not None else None
        if active and plate and active_plate_taken(plate, exclude_pk=exclude_pk):
            raise serializers.ValidationError({"license_plate": PLATE_TAKEN_MESSAGE})
        return attrs

    def validate_year(self, value: int) -> int:
        latest = timezone.localdate().year + MAX_YEARS_AHEAD
        if value > latest:
            msg = f"Year cannot be later than {latest}."
            raise serializers.ValidationError(msg)
        return value


class MaintenanceRecordSerializer(serializers.ModelSerializer[MaintenanceRecord]):
    class Meta:
        model = MaintenanceRecord
        fields = (
            "id",
            "vehicle",
            "mechanic",
            "performed_on",
            "maintenance_type",
            "cost",
            "notes",
        )

    def validate_performed_on(self, value: datetime.date) -> datetime.date:
        if value > timezone.localdate():
            msg = "Maintenance date cannot be in the future."
            raise serializers.ValidationError(msg)
        return value


class MaintenanceHistorySerializer(serializers.ModelSerializer[MaintenanceRecord]):
    mechanic = MechanicSerializer(read_only=True)

    class Meta:
        model = MaintenanceRecord
        fields = ("id", "performed_on", "maintenance_type", "cost", "notes", "mechanic")


class VehicleDetailSerializer(VehicleSerializer):
    office = OfficeSerializer(read_only=True)
    maintenance_records = MaintenanceHistorySerializer(many=True, read_only=True)

    class Meta(VehicleSerializer.Meta):
        fields = (*VehicleSerializer.Meta.fields, "maintenance_records")


class VehicleNeedingMaintenanceSerializer(VehicleSerializer):
    last_maintenance = serializers.DateField(allow_null=True, read_only=True)

    class Meta(VehicleSerializer.Meta):
        fields = (*VehicleSerializer.Meta.fields, "last_maintenance")


class OfficeSummarySerializer(serializers.ModelSerializer[Office]):
    active_vehicle_count = serializers.IntegerField(read_only=True)
    maintenance_cost_last_year = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    last_maintenance = serializers.DateField(allow_null=True, read_only=True)

    class Meta:
        model = Office
        fields = (
            "id",
            "name",
            "city",
            "active_vehicle_count",
            "maintenance_cost_last_year",
            "last_maintenance",
        )


class MechanicWorkloadSerializer(serializers.ModelSerializer[Mechanic]):
    jobs_this_year = serializers.IntegerField(read_only=True)
    cost_this_year = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Mechanic
        fields = ("id", "name", "certification_number", "jobs_this_year", "cost_this_year")


class AssignVehicleSerializer(serializers.Serializer[dict[str, Any]]):
    office = serializers.PrimaryKeyRelatedField(queryset=Office.objects.all())


class ActiveFilterSerializer(serializers.Serializer[dict[str, Any]]):
    is_active = serializers.BooleanField(required=False, allow_null=True, default=None)


class VehicleFilterSerializer(ActiveFilterSerializer):
    office = serializers.IntegerField(required=False)
    make = serializers.CharField(required=False)
    model = serializers.CharField(required=False)
    maintenance_from = serializers.DateField(required=False)
    maintenance_to = serializers.DateField(required=False)
    mechanic_certification = serializers.CharField(required=False)

    @override
    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        start, end = attrs.get("maintenance_from"), attrs.get("maintenance_to")
        if start and end and start > end:
            msg = "maintenance_from must be on or before maintenance_to."
            raise serializers.ValidationError({"maintenance_from": msg})
        return attrs

    def to_filters(self) -> VehicleFilters:
        return VehicleFilters(**self.validated_data)


class DuplicateCheckSerializer(serializers.Serializer[dict[str, Any]]):
    vin = serializers.CharField(required=False)
    license_plate = serializers.CharField(required=False)
    exclude = serializers.IntegerField(required=False)

    @override
    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if not attrs.get("vin") and not attrs.get("license_plate"):
            msg = "Provide vin, license_plate, or both."
            raise serializers.ValidationError(msg)
        return {
            "vin": normalize_vin(attrs["vin"]) if attrs.get("vin") else None,
            "plate": normalize_plate(attrs["license_plate"])
            if attrs.get("license_plate")
            else None,
            "exclude_pk": attrs.get("exclude"),
        }


def _normalize(data: object, **normalizers: Callable[[str], str]) -> object:
    # Runs before field validators, so regex/unique checks see the stored form.
    if not isinstance(data, Mapping):
        return data
    # QueryDict (form/multipart) must be copied as-is; dict() would turn values into lists.
    normalized = data.copy() if isinstance(data, QueryDict) else dict(data)
    for field, normalize in normalizers.items():
        if isinstance(value := normalized.get(field), str):
            normalized[field] = normalize(value)
    return normalized
