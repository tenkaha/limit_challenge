import copy
import datetime
import re
from collections.abc import Callable, Mapping
from typing import Any, ClassVar, cast, override

from django.core.exceptions import NON_FIELD_ERRORS
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import models
from django.http import QueryDict
from django.utils import timezone
from rest_framework import serializers
from rest_framework.settings import api_settings

from fleet.models import MaintenanceRecord, Mechanic, Office, Vehicle
from fleet.models.vehicle import plate_format_validator

MAX_YEARS_AHEAD = 1


class ConstraintValidatingSerializer[M: models.Model](serializers.ModelSerializer[M]):
    # DRF doesn't derive validators from multi-field or conditional
    # UniqueConstraints, so run the model's own constraint checks on a copy of
    # the instance with the incoming values applied. Without this, violations
    # would surface as IntegrityError (HTTP 500) instead of a 400.
    @override
    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        model = cast("type[M]", self.Meta.model)
        candidate = copy.copy(self.instance) if self.instance else model()
        for field, value in attrs.items():
            setattr(candidate, field, value)
        try:
            candidate.validate_constraints()
        except DjangoValidationError as exc:
            errors = {
                api_settings.NON_FIELD_ERRORS_KEY if key == NON_FIELD_ERRORS else key: messages
                for key, messages in exc.message_dict.items()
            }
            raise serializers.ValidationError(errors) from exc
        return attrs


class OfficeSerializer(ConstraintValidatingSerializer[Office]):
    class Meta:
        model = Office
        fields = ("id", "name", "city")


class MechanicSerializer(ConstraintValidatingSerializer[Mechanic]):
    class Meta:
        model = Mechanic
        fields = ("id", "name", "certification_number", "is_active")

    @override
    def to_internal_value(self, data: Any) -> Any:
        return super().to_internal_value(_normalize(data, certification_number=str.strip))


class VehicleSerializer(ConstraintValidatingSerializer[Vehicle]):
    class Meta:
        model = Vehicle
        fields = ("id", "vin", "license_plate", "make", "model", "year", "office", "is_active")
        # DRF's auto UniqueValidator for the conditional plate constraint ignores
        # the incoming is_active; validate() checks the constraint correctly.
        extra_kwargs: ClassVar = {"license_plate": {"validators": [plate_format_validator]}}

    @override
    def to_internal_value(self, data: Any) -> Any:
        return super().to_internal_value(
            _normalize(data, vin=normalize_vin, license_plate=normalize_plate)
        )

    def validate_year(self, value: int) -> int:
        latest = timezone.localdate().year + MAX_YEARS_AHEAD
        if value > latest:
            msg = f"Year cannot be later than {latest}."
            raise serializers.ValidationError(msg)
        return value


class MaintenanceRecordSerializer(ConstraintValidatingSerializer[MaintenanceRecord]):
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
