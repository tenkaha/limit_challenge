from typing import Any, override

from django.db.models import Model, QuerySet
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from fleet import selectors, services
from fleet.models import MaintenanceRecord, Mechanic, Office, Vehicle
from fleet.pagination import DefaultPagination
from fleet.serializers import (
    ActiveFilterSerializer,
    AssignVehicleSerializer,
    DuplicateCheckSerializer,
    MaintenanceHistorySerializer,
    MaintenanceRecordSerializer,
    MechanicSerializer,
    MechanicWorkloadSerializer,
    OfficeSerializer,
    OfficeSummarySerializer,
    VehicleDetailSerializer,
    VehicleFilterSerializer,
    VehicleNeedingMaintenanceSerializer,
    VehicleSerializer,
)


class OfficeViewSet(viewsets.ModelViewSet[Office]):
    queryset = Office.objects.all()
    serializer_class = OfficeSerializer
    ordering_fields = ("name", "city")

    @action(detail=False)
    def summary(self, request: Request) -> Response:
        offices = selectors.office_summary(today=timezone.localdate())
        return Response(OfficeSummarySerializer(offices, many=True).data)


class VehicleViewSet(viewsets.ModelViewSet[Vehicle]):
    ordering_fields = ("vin", "license_plate", "make", "model", "year")

    @override
    def get_queryset(self) -> QuerySet[Vehicle]:
        if self.action == "list":
            params = _validated(VehicleFilterSerializer, self.request)
            return selectors.search_vehicles(params.to_filters())
        if self.action == "retrieve":
            return selectors.vehicle_with_history()
        return Vehicle.objects.all()

    @override
    def get_serializer_class(self) -> type[serializers.BaseSerializer[Any]]:
        if self.action == "retrieve":
            return VehicleDetailSerializer
        return VehicleSerializer

    @action(detail=True, url_path="maintenance")
    def maintenance_history(self, request: Request, pk: str) -> Response:
        records = selectors.vehicle_history(self.get_object())
        return _paginated(records, MaintenanceHistorySerializer, request, self)

    @action(detail=True, methods=["post"], serializer_class=AssignVehicleSerializer)
    def assign(self, request: Request, pk: str) -> Response:
        payload = AssignVehicleSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        vehicle = services.assign_vehicle(self.get_object(), payload.validated_data["office"])
        return Response(VehicleSerializer(vehicle).data)

    @action(detail=False, url_path="needing-maintenance")
    def needing_maintenance(self, request: Request) -> Response:
        vehicles = selectors.vehicles_needing_maintenance(today=timezone.localdate())
        return _paginated(vehicles, VehicleNeedingMaintenanceSerializer, request, self)

    @action(detail=False, url_path="duplicate-check")
    def duplicate_check(self, request: Request) -> Response:
        params = _validated(DuplicateCheckSerializer, request)
        return Response({"conflicts": selectors.vehicle_conflicts(**params.validated_data)})


class MechanicViewSet(viewsets.ModelViewSet[Mechanic]):
    serializer_class = MechanicSerializer
    ordering_fields = ("name", "certification_number")

    @override
    def get_queryset(self) -> QuerySet[Mechanic]:
        mechanics = Mechanic.objects.all()
        if self.action == "list":
            is_active = _validated(ActiveFilterSerializer, self.request).validated_data["is_active"]
            if is_active is not None:
                mechanics = mechanics.filter(is_active=is_active)
        return mechanics

    @action(detail=False)
    def workload(self, request: Request) -> Response:
        mechanics = selectors.mechanic_workload(year=timezone.localdate().year)
        return Response(MechanicWorkloadSerializer(mechanics, many=True).data)


class MaintenanceRecordViewSet(viewsets.ModelViewSet[MaintenanceRecord]):
    queryset = MaintenanceRecord.objects.all()
    serializer_class = MaintenanceRecordSerializer
    ordering_fields = ("performed_on", "cost")


def _validated[S: serializers.Serializer[dict[str, Any]]](
    serializer_class: type[S], request: Request
) -> S:
    params = serializer_class(data=request.query_params)
    params.is_valid(raise_exception=True)
    return params


def _paginated[M: Model](
    queryset: QuerySet[M],
    serializer_class: type[serializers.ModelSerializer[M]],
    request: Request,
    view: APIView,
) -> Response:
    paginator = DefaultPagination()
    page = paginator.paginate_queryset(queryset, request, view=view)
    return paginator.get_paginated_response(serializer_class(page, many=True).data)
