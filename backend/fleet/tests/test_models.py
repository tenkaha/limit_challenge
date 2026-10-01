import datetime
from decimal import Decimal
from typing import override

from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from django.test import TestCase
from django.utils import timezone

from fleet.models import MaintenanceRecord, MaintenanceType, Mechanic, Office, Vehicle

VIN_A = "1HGCM82633A004352"
VIN_B = "2FTRX18W1XCA12345"


class ModelTestCase(TestCase):
    office: Office
    mechanic: Mechanic

    @classmethod
    @override
    def setUpTestData(cls) -> None:
        cls.office = Office.objects.create(name="New York", city="New York")
        cls.mechanic = Mechanic.objects.create(name="Ana", certification_number="ASE-1")

    def make_vehicle(self, **overrides: object) -> Vehicle:
        fields: dict[str, object] = {
            "vin": VIN_A,
            "license_plate": "ABC1234",
            "make": "Honda",
            "model": "Accord",
            "year": 2020,
            "office": self.office,
        }
        fields.update(overrides)
        return Vehicle.objects.create(**fields)


class OfficeConstraintTests(ModelTestCase):
    def test_same_name_allowed_in_different_city(self) -> None:
        Office.objects.create(name="New York", city="Albany")

    def test_same_name_and_city_rejected(self) -> None:
        with transaction.atomic(), self.assertRaises(IntegrityError):
            Office.objects.create(name="New York", city="New York")


class VehicleConstraintTests(ModelTestCase):
    def test_vin_is_unique(self) -> None:
        self.make_vehicle()
        with transaction.atomic(), self.assertRaises(IntegrityError):
            self.make_vehicle(license_plate="XYZ9999")

    def test_active_vehicles_cannot_share_plate(self) -> None:
        self.make_vehicle()
        with transaction.atomic(), self.assertRaises(IntegrityError):
            self.make_vehicle(vin=VIN_B)

    def test_inactive_vehicle_can_reuse_plate(self) -> None:
        self.make_vehicle(is_active=False)
        self.make_vehicle(vin=VIN_B, is_active=False)
        self.make_vehicle(vin="3VWFE21C04M000001")
        self.assertEqual(Vehicle.objects.filter(license_plate="ABC1234").count(), 3)

    def test_reactivating_vehicle_with_taken_plate_fails(self) -> None:
        retired = self.make_vehicle(is_active=False)
        self.make_vehicle(vin=VIN_B)
        retired.is_active = True
        with transaction.atomic(), self.assertRaises(IntegrityError):
            retired.save()

    def test_valid_vin_with_edge_letters_accepted(self) -> None:
        vehicle = self.make_vehicle(vin="ZHJPR0123456789AB")
        vehicle.full_clean()

    def test_invalid_vin_rejected_by_database(self) -> None:
        for vin in ("SHORT", "1HGCM82633A00435O", VIN_A.lower()):
            with self.subTest(vin=vin), transaction.atomic(), self.assertRaises(IntegrityError):
                self.make_vehicle(vin=vin)

    def test_non_normalized_plate_rejected_by_database(self) -> None:
        for plate in ("abc1234", "ABC-1234", "ABC 1234"):
            with (
                self.subTest(plate=plate),
                transaction.atomic(),
                self.assertRaises(IntegrityError),
            ):
                self.make_vehicle(license_plate=plate)

    def test_year_before_first_car_rejected(self) -> None:
        with transaction.atomic(), self.assertRaises(IntegrityError):
            self.make_vehicle(year=1800)

    def test_office_with_vehicles_cannot_be_deleted(self) -> None:
        self.make_vehicle()
        with self.assertRaises(ProtectedError):
            self.office.delete()


class MechanicConstraintTests(ModelTestCase):
    def test_certification_number_is_unique(self) -> None:
        with transaction.atomic(), self.assertRaises(IntegrityError):
            Mechanic.objects.create(name="Bruno", certification_number="ASE-1")


class MaintenanceRecordConstraintTests(ModelTestCase):
    def make_record(self, **overrides: object) -> MaintenanceRecord:
        fields: dict[str, object] = {
            "vehicle": self.make_vehicle(),
            "mechanic": self.mechanic,
            "performed_on": datetime.date(2025, 1, 10),
            "maintenance_type": MaintenanceType.OIL_CHANGE,
            "cost": Decimal("89.90"),
        }
        fields.update(overrides)
        return MaintenanceRecord.objects.create(**fields)

    def test_negative_cost_rejected(self) -> None:
        with transaction.atomic(), self.assertRaises(IntegrityError):
            self.make_record(cost=Decimal("-1.00"))

    def test_unknown_type_rejected(self) -> None:
        with transaction.atomic(), self.assertRaises(IntegrityError):
            self.make_record(maintenance_type="car_wash")

    def test_vehicle_with_history_cannot_be_deleted(self) -> None:
        record = self.make_record()
        with self.assertRaises(ProtectedError):
            record.vehicle.delete()


class TimeStampTests(ModelTestCase):
    def test_explicit_created_at_is_kept(self) -> None:
        past = timezone.now() - datetime.timedelta(days=200)
        office = Office.objects.create(name="Austin", city="Austin", created_at=past)
        office.refresh_from_db()
        self.assertEqual(office.created_at, past)
