import datetime
import re
from collections.abc import Callable, Mapping
from typing import Any, ClassVar, override

from django.http import QueryDict
from django.utils import timezone
from rest_framework import serializers

from fleet.models import MaintenanceRecord, Mechanic, Office, Vehicle
from fleet.models.vehicle import PLATE_TAKEN_MESSAGE, plate_format_validator

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
        return super().to_internal_value(_normalize(data, certification_number=str.strip))


class VehicleSerializer(serializers.ModelSerializer[Vehicle]):
    class Meta:
        model = Vehicle
        fields = ("id", "vin", "license_plate", "make", "model", "year", "office", "is_active")
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
        taken = Vehicle.objects.filter(license_plate=plate, is_active=True)
        if self.instance is not None:
            taken = taken.exclude(pk=self.instance.pk)
        if active and taken.exists():
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


def normalize_vin(vin: str) -> str:
    return vin.strip().upper()


def normalize_plate(plate: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", plate.upper())


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
