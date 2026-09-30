from typing import override

from django.db.models import QuerySet
from rest_framework import serializers, viewsets
from rest_framework.request import Request

from fleet.models import MaintenanceRecord, Mechanic, Office, Vehicle
from fleet.serializers import (
    MaintenanceRecordSerializer,
    MechanicSerializer,
    OfficeSerializer,
    VehicleSerializer,
)


def filter_active[T: (Vehicle, Mechanic)](queryset: QuerySet[T], request: Request) -> QuerySet[T]:
    raw = request.query_params.get("is_active")
    if raw is None:
        return queryset
    try:
        is_active = serializers.BooleanField().to_internal_value(raw)
    except serializers.ValidationError as exc:
        raise serializers.ValidationError({"is_active": exc.detail}) from exc
    return queryset.filter(is_active=is_active)


class OfficeViewSet(viewsets.ModelViewSet[Office]):
    queryset = Office.objects.all()
    serializer_class = OfficeSerializer


class VehicleViewSet(viewsets.ModelViewSet[Vehicle]):
    serializer_class = VehicleSerializer

    @override
    def get_queryset(self) -> QuerySet[Vehicle]:
        return filter_active(Vehicle.objects.all(), self.request)


class MechanicViewSet(viewsets.ModelViewSet[Mechanic]):
    serializer_class = MechanicSerializer

    @override
    def get_queryset(self) -> QuerySet[Mechanic]:
        return filter_active(Mechanic.objects.all(), self.request)


class MaintenanceRecordViewSet(viewsets.ModelViewSet[MaintenanceRecord]):
    queryset = MaintenanceRecord.objects.all()
    serializer_class = MaintenanceRecordSerializer
