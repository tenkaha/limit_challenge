from typing import override

from django.core.validators import MinValueValidator, RegexValidator
from django.db import models

from fleet.models.base import TimeStampedModel
from fleet.models.office import Office

# ISO 3779: 17 characters, letters I, O and Q are never used.
VIN_PATTERN = r"^[A-HJ-NPR-Z0-9]{17}$"
# Plates are stored normalized: uppercase letters and digits, no separators.
PLATE_PATTERN = r"^[A-Z0-9]+$"
FIRST_MODEL_YEAR = 1886

plate_format_validator = RegexValidator(
    PLATE_PATTERN, "License plate must contain only A-Z and 0-9."
)


class Vehicle(TimeStampedModel):
    vin = models.CharField(
        "VIN",
        max_length=17,
        unique=True,
        validators=[RegexValidator(VIN_PATTERN, "VIN must be 17 characters, excluding I, O, Q.")],
    )
    license_plate = models.CharField(
        max_length=20,
        validators=[plate_format_validator],
    )
    make = models.CharField(max_length=255)
    model = models.CharField(max_length=255)
    year = models.PositiveSmallIntegerField(validators=[MinValueValidator(FIRST_MODEL_YEAR)])
    office = models.ForeignKey(Office, on_delete=models.PROTECT, related_name="vehicles")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("make", "model", "vin")
        constraints = (
            models.UniqueConstraint(
                fields=("license_plate",),
                condition=models.Q(is_active=True),
                name="uniq_active_vehicle_license_plate",
                # "unique" makes Django attach the error to the license_plate field.
                violation_error_code="unique",
                violation_error_message="An active vehicle with this license plate already exists.",
            ),
            models.CheckConstraint(
                condition=models.Q(vin__regex=VIN_PATTERN),
                name="vehicle_vin_format",
            ),
            models.CheckConstraint(
                condition=models.Q(license_plate__regex=PLATE_PATTERN),
                name="vehicle_license_plate_format",
            ),
            models.CheckConstraint(
                condition=models.Q(year__gte=FIRST_MODEL_YEAR),
                name="vehicle_year_min",
            ),
        )
        indexes = (models.Index(fields=("make", "model"), name="vehicle_make_model_idx"),)

    @override
    def __str__(self) -> str:
        return f"{self.year} {self.make} {self.model} ({self.license_plate})"
