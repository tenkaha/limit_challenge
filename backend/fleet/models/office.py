from typing import override

from django.db import models

from fleet.models.base import TimeStampedModel


class Office(TimeStampedModel):
    name = models.CharField(max_length=255, unique=True)
    city = models.CharField(max_length=255)

    class Meta:
        ordering = ("name",)

    @override
    def __str__(self) -> str:
        return f"{self.name} ({self.city})"
