from typing import override

from django.db import models

from fleet.models.base import TimeStampedModel


class Mechanic(TimeStampedModel):
    name = models.CharField(max_length=255)
    certification_number = models.CharField(
        max_length=64,
        unique=True,
        error_messages={"unique": "A mechanic with this certification number already exists."},
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name",)

    @override
    def __str__(self) -> str:
        return f"{self.name} #{self.certification_number}"
