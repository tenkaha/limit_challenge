from typing import override

from django.db import models

from fleet.models.base import TimeStampedModel

OFFICE_TAKEN_MESSAGE = "An office with this name already exists in this city."


class Office(TimeStampedModel):
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=255)

    class Meta:
        ordering = ("name", "city")
        constraints = (
            models.UniqueConstraint(
                fields=("name", "city"),
                name="uniq_office_name_city",
                violation_error_message=OFFICE_TAKEN_MESSAGE,
            ),
        )

    @override
    def __str__(self) -> str:
        return f"{self.name} ({self.city})"
