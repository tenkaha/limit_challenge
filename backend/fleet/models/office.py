from typing import override

from django.db import models

from fleet.models.base import TimeStampedModel


class Office(TimeStampedModel):
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=255)

    class Meta:
        ordering = ("name", "city")
        constraints = (
            models.UniqueConstraint(
                "name",
                "city",
                name="uniq_office_name_city",
                violation_error_message="An office with this name already exists in this city.",
            ),
        )

    @override
    def __str__(self) -> str:
        return f"{self.name} ({self.city})"
