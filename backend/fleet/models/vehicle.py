from typing import override

from django.core.validators import MinValueValidator, RegexValidator
from django.db import models

from fleet.models.base import TimeStampedModel
from fleet.models.office import Office

# ISO 3779: 17 characters, letters I, O and Q are never used.
VIN_PATTERN = r"^[A-HJ-NPR-Z0-9]{17}$"
# Plates are stored normalized: uppercase letters and digits, no separators.
PLATE_CHARS = "A-Z0-9"
PLATE_PATTERN = rf"^[{PLATE_CHARS}]+$"
FIRST_MODEL_YEAR = 1886

PLATE_TAKEN_MESSAGE = "An active vehicle with this license plate already exists."
plate_format_validator = RegexValidator(
    PLATE_PATTERN, "License plate must contain only A-Z and 0-9."
)


class Vehicle(TimeStampedModel):
    vin = models.CharField(
        "VIN",
        max_length=17,
        unique=True,
        error_messages={"unique": "A vehicle with this VIN already exists."},
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
        # Matches the default ordering, so list pages read rows in order instead of
        # sorting the whole table for every page.
        indexes = (models.Index(fields=("make", "model", "vin"), name="vehicle_list_order_idx"),)
        constraints = (
            models.UniqueConstraint(
                fields=("license_plate",),
                condition=models.Q(is_active=True),
                name="uniq_active_vehicle_license_plate",
                # "unique" makes Django attach the error to the license_plate field.
                violation_error_code="unique",
                violation_error_message=PLATE_TAKEN_MESSAGE,
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

    @override
    def __str__(self) -> str:
        return f"{self.year} {self.make} {self.model} ({self.license_plate})"
