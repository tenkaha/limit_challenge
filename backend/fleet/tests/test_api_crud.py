import datetime
from decimal import Decimal
from typing import Any, override

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from fleet.models import MaintenanceRecord, MaintenanceType, Mechanic, Office, Vehicle

VIN = "1HGCM82633A004352"
OTHER_VIN = "2FTRX18W1XCA12345"


class ApiTestCase(APITestCase):
    office: Office
    mechanic: Mechanic

    @classmethod
    @override
    def setUpTestData(cls) -> None:
        cls.office = Office.objects.create(name="Downtown", city="Austin")
        cls.mechanic = Mechanic.objects.create(name="Ana", certification_number="ASE-1")

    def vehicle_payload(self, **overrides: object) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "vin": VIN,
            "license_plate": "ABC1234",
            "make": "Honda",
            "model": "Accord",
            "year": 2020,
            "office": self.office.pk,
        }
        payload.update(overrides)
        return payload

    def make_vehicle(self, **overrides: object) -> Vehicle:
        fields: dict[str, Any] = {**self.vehicle_payload(), "office": self.office}
        fields.update(overrides)
        return Vehicle.objects.create(**fields)

    def make_record(self, vehicle: Vehicle) -> MaintenanceRecord:
        return MaintenanceRecord.objects.create(
            vehicle=vehicle,
            mechanic=self.mechanic,
            performed_on=datetime.date(2025, 1, 10),
            maintenance_type=MaintenanceType.OIL_CHANGE,
            cost=Decimal("89.90"),
        )


class OfficeApiTests(ApiTestCase):
    def test_duplicate_name_and_city_returns_400_with_message(self) -> None:
        response = self.client.post("/api/offices/", {"name": "Downtown", "city": "Austin"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already exists in this city", str(response.data))

    def test_same_name_in_other_city_is_created(self) -> None:
        response = self.client.post("/api/offices/", {"name": "Downtown", "city": "Boston"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_delete_office_with_vehicles_returns_409(self) -> None:
        self.make_vehicle(is_active=False)
        response = self.client.delete(f"/api/offices/{self.office.pk}/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["detail"], "Cannot delete: it is referenced by 1 vehicle.")


class VehicleApiTests(ApiTestCase):
    def test_vin_and_plate_are_normalized(self) -> None:
        payload = self.vehicle_payload(vin=f" {VIN.lower()} ", license_plate="abc-12 34")
        response = self.client.post("/api/vehicles/", payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["vin"], VIN)
        self.assertEqual(response.data["license_plate"], "ABC1234")

    def test_invalid_vin_returns_field_error(self) -> None:
        response = self.client.post("/api/vehicles/", self.vehicle_payload(vin="1HGCM82633A00435O"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("vin", response.data)

    def test_active_plate_conflict_after_normalization_returns_400(self) -> None:
        self.make_vehicle()
        payload = self.vehicle_payload(vin=OTHER_VIN, license_plate="abc-1234")
        response = self.client.post("/api/vehicles/", payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["license_plate"],
            ["An active vehicle with this license plate already exists."],
        )

    def test_inactive_vehicle_can_reuse_active_plate(self) -> None:
        self.make_vehicle()
        payload = self.vehicle_payload(vin=OTHER_VIN, is_active=False)
        response = self.client.post("/api/vehicles/", payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_reactivating_with_taken_plate_returns_400(self) -> None:
        retired = self.make_vehicle(is_active=False)
        self.make_vehicle(vin=OTHER_VIN)
        response = self.client.patch(f"/api/vehicles/{retired.pk}/", {"is_active": True})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["license_plate"],
            ["An active vehicle with this license plate already exists."],
        )

    def test_patching_own_fields_does_not_conflict_with_itself(self) -> None:
        vehicle = self.make_vehicle()
        response = self.client.patch(f"/api/vehicles/{vehicle.pk}/", {"make": "Acura"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_year_more_than_one_ahead_rejected(self) -> None:
        too_new = timezone.localdate().year + 2
        response = self.client.post("/api/vehicles/", self.vehicle_payload(year=too_new))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("year", response.data)

    def test_delete_without_history_returns_204(self) -> None:
        vehicle = self.make_vehicle()
        response = self.client.delete(f"/api/vehicles/{vehicle.pk}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_with_history_returns_409(self) -> None:
        vehicle = self.make_vehicle()
        self.make_record(vehicle)
        self.make_record(vehicle)
        response = self.client.delete(f"/api/vehicles/{vehicle.pk}/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            response.data["detail"], "Cannot delete: it is referenced by 2 maintenance records."
        )

    def test_is_active_filter(self) -> None:
        self.make_vehicle()
        self.make_vehicle(vin=OTHER_VIN, license_plate="XYZ9", is_active=False)
        response = self.client.get("/api/vehicles/", {"is_active": "false"})
        self.assertEqual([v["vin"] for v in response.data["results"]], [OTHER_VIN])

    def test_non_object_body_returns_400(self) -> None:
        response = self.client.post("/api/vehicles/", [self.vehicle_payload()])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_is_active_filter_returns_400(self) -> None:
        response = self.client.get("/api/vehicles/", {"is_active": "maybe"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("is_active", response.data)


class MechanicApiTests(ApiTestCase):
    def test_certification_number_is_trimmed_before_uniqueness(self) -> None:
        response = self.client.post(
            "/api/mechanics/", {"name": "Bruno", "certification_number": " ASE-1 "}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("certification_number", response.data)

    def test_delete_with_history_returns_409(self) -> None:
        self.make_record(self.make_vehicle())
        response = self.client.delete(f"/api/mechanics/{self.mechanic.pk}/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)


class MaintenanceRecordApiTests(ApiTestCase):
    def record_payload(self, **overrides: object) -> dict[str, Any]:
        if "vehicle" not in overrides:
            overrides["vehicle"] = self.make_vehicle().pk
        payload: dict[str, Any] = {
            "mechanic": self.mechanic.pk,
            "performed_on": "2025-01-10",
            "maintenance_type": MaintenanceType.BRAKES,
            "cost": "450.50",
        }
        payload.update(overrides)
        return payload

    def test_cost_is_serialized_as_number(self) -> None:
        response = self.client.post("/api/maintenance-records/", self.record_payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["cost"], 450.5)

    def test_future_date_rejected(self) -> None:
        tomorrow = timezone.localdate() + datetime.timedelta(days=1)
        response = self.client.post(
            "/api/maintenance-records/", self.record_payload(performed_on=tomorrow.isoformat())
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("performed_on", response.data)

    def test_record_for_inactive_vehicle_and_mechanic_allowed(self) -> None:
        vehicle = self.make_vehicle(is_active=False)
        mechanic = Mechanic.objects.create(name="Old", certification_number="X", is_active=False)
        response = self.client.post(
            "/api/maintenance-records/",
            self.record_payload(vehicle=vehicle.pk, mechanic=mechanic.pk),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_negative_cost_rejected(self) -> None:
        response = self.client.post("/api/maintenance-records/", self.record_payload(cost="-1"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cost", response.data)
