import datetime

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from fleet.tests.helpers import make_mechanic, make_office, make_record, make_vehicle


class VehicleDetailApiTests(APITestCase):
    def test_details_embed_office_and_history_with_mechanics(self) -> None:
        office, mechanic = make_office(), make_mechanic("Ana", "ASE-1")
        vehicle = make_vehicle(office)
        make_record(vehicle, mechanic, datetime.date(2025, 1, 1))
        make_record(vehicle, mechanic, datetime.date(2025, 6, 1))

        data = self.client.get(f"/api/vehicles/{vehicle.pk}/").json()

        self.assertEqual(data["office"], {"id": office.pk, "name": "Downtown", "city": "Austin"})
        self.assertEqual(
            [r["performed_on"] for r in data["maintenance_records"]], ["2025-06-01", "2025-01-01"]
        )
        self.assertEqual(
            data["maintenance_records"][0]["mechanic"]["certification_number"], "ASE-1"
        )

    def test_detail_query_count_is_constant_with_hundreds_of_records(self) -> None:
        office = make_office()
        vehicle = make_vehicle(office)
        mechanics = [make_mechanic() for _ in range(20)]
        for i in range(300):
            make_record(vehicle, mechanics[i % 20], datetime.date(2025, 1, 1))

        # vehicle + office, then records + mechanics
        with self.assertNumQueries(2):
            response = self.client.get(f"/api/vehicles/{vehicle.pk}/")
        self.assertEqual(len(response.json()["maintenance_records"]), 300)


class MaintenanceHistoryApiTests(APITestCase):
    def test_history_is_paginated_newest_first(self) -> None:
        vehicle, mechanic = make_vehicle(make_office()), make_mechanic()
        for day in (3, 1, 2):
            make_record(vehicle, mechanic, datetime.date(2025, 1, day))

        data = self.client.get(f"/api/vehicles/{vehicle.pk}/maintenance/", {"page_size": 2}).json()

        self.assertEqual(data["count"], 3)
        self.assertEqual([r["performed_on"] for r in data["results"]], ["2025-01-03", "2025-01-02"])


class VehicleSearchApiTests(APITestCase):
    def test_query_params_are_applied(self) -> None:
        office = make_office()
        honda = make_vehicle(office, make="Honda")
        make_vehicle(office, make="Ford")
        data = self.client.get("/api/vehicles/", {"make": "honda"}).json()
        self.assertEqual([v["id"] for v in data["results"]], [honda.pk])

    def test_invalid_params_return_field_errors(self) -> None:
        response = self.client.get(
            "/api/vehicles/", {"maintenance_from": "2026-02-01", "maintenance_to": "2026-01-01"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("maintenance_from", response.json())

        response = self.client.get("/api/vehicles/", {"maintenance_to": "banana"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AssignVehicleApiTests(APITestCase):
    def test_assign_moves_vehicle(self) -> None:
        vehicle = make_vehicle(make_office())
        boston = make_office("Downtown", "Boston")
        response = self.client.post(f"/api/vehicles/{vehicle.pk}/assign/", {"office": boston.pk})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["office"], boston.pk)

    def test_unknown_office_returns_400(self) -> None:
        vehicle = make_vehicle(make_office())
        response = self.client.post(f"/api/vehicles/{vehicle.pk}/assign/", {"office": 999})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("office", response.json())


class DuplicateCheckApiTests(APITestCase):
    def test_input_is_normalized_before_checking(self) -> None:
        vehicle = make_vehicle(make_office(), license_plate="ABC1234")
        response = self.client.get(
            "/api/vehicles/duplicate-check/",
            {"vin": vehicle.vin.lower(), "license_plate": "abc-1234"},
        )
        self.assertEqual(response.json(), {"conflicts": ["vin", "license_plate"]})

    def test_requires_vin_or_plate(self) -> None:
        response = self.client.get("/api/vehicles/duplicate-check/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ReportApiTests(APITestCase):
    def test_office_summary_shape_matches_readme(self) -> None:
        office, mechanic = make_office(), make_mechanic()
        make_record(make_vehicle(office), mechanic, timezone.localdate(), "81250.50")

        (row,) = self.client.get("/api/offices/summary/").json()

        self.assertEqual(row["maintenance_cost_last_year"], 81250.50)
        self.assertEqual(row["active_vehicle_count"], 1)
        self.assertEqual(row["last_maintenance"], timezone.localdate().isoformat())

    def test_mechanic_workload_endpoint(self) -> None:
        mechanic = make_mechanic("Ana")
        make_record(make_vehicle(make_office()), mechanic, timezone.localdate(), "10.00")
        (row,) = self.client.get("/api/mechanics/workload/").json()
        self.assertEqual(
            (row["name"], row["jobs_this_year"], row["cost_this_year"]), ("Ana", 1, 10.0)
        )

    def test_needing_maintenance_endpoint_includes_last_maintenance(self) -> None:
        vehicle = make_vehicle(make_office())
        data = self.client.get("/api/vehicles/needing-maintenance/").json()
        self.assertEqual(data["results"][0]["id"], vehicle.pk)
        self.assertIsNone(data["results"][0]["last_maintenance"])


class MechanicListApiTests(APITestCase):
    def test_is_active_filter(self) -> None:
        make_mechanic("Ana")
        retired = make_mechanic("Old", is_active=False)
        data = self.client.get("/api/mechanics/", {"is_active": "false"}).json()
        self.assertEqual([m["id"] for m in data["results"]], [retired.pk])
