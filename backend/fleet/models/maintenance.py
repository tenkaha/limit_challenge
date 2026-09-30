from decimal import Decimal
from typing import override

from django.core.validators import MinValueValidator
from django.db import models

from fleet.models.base import TimeStampedModel
from fleet.models.mechanic import Mechanic
from fleet.models.vehicle import Vehicle


class MaintenanceType(models.TextChoices):
    OIL_CHANGE = "oil_change", "Oil change"
    TIRE_ROTATION = "tire_rotation", "Tire rotation"
    BRAKES = "brakes", "Brakes"
    INSPECTION = "inspection", "Inspection"
    REPAIR = "repair", "Repair"
    OTHER = "other", "Other"


class MaintenanceRecord(TimeStampedModel):
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.PROTECT, related_name="maintenance_records"
    )
    mechanic = models.ForeignKey(
        Mechanic, on_delete=models.PROTECT, related_name="maintenance_records"
    )
    performed_on = models.DateField()
    maintenance_type = models.CharField(max_length=32, choices=MaintenanceType.choices)
    cost = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal(0))]
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-performed_on", "-id")
        constraints = (
            models.CheckConstraint(condition=models.Q(cost__gte=0), name="maintenance_cost_gte_0"),
            models.CheckConstraint(
                condition=models.Q(maintenance_type__in=MaintenanceType.values),
                name="maintenance_type_valid",
            ),
        )
        indexes = (
            models.Index(fields=("vehicle", "-performed_on"), name="maint_vehicle_date_idx"),
            models.Index(fields=("mechanic", "performed_on"), name="maint_mechanic_date_idx"),
            models.Index(fields=("performed_on",), name="maint_date_idx"),
        )

    @override
    def __str__(self) -> str:
        return f"{self.get_maintenance_type_display()} on {self.performed_on}"
