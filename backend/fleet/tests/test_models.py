import datetime
from decimal import Decimal
from typing import override

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from django.test import TestCase

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

    def test_invalid_vin_rejected_by_database(self) -> None:
        for vin in ("SHORT", "1HGCM82633A00435O", VIN_A.lower()):
            with self.subTest(vin=vin), transaction.atomic(), self.assertRaises(IntegrityError):
                self.make_vehicle(vin=vin)

    def test_lowercase_plate_rejected_by_database(self) -> None:
        with transaction.atomic(), self.assertRaises(IntegrityError):
            self.make_vehicle(license_plate="abc1234")

    def test_year_before_first_car_rejected(self) -> None:
        with transaction.atomic(), self.assertRaises(IntegrityError):
            self.make_vehicle(year=1800)

    def test_full_clean_reports_plate_conflict_message(self) -> None:
        self.make_vehicle()
        duplicate = Vehicle(
            vin=VIN_B,
            license_plate="ABC1234",
            make="Ford",
            model="F-150",
            year=1999,
            office=self.office,
        )
        with self.assertRaisesMessage(ValidationError, "active vehicle with this license plate"):
            duplicate.full_clean()

    def test_office_with_vehicles_cannot_be_deleted(self) -> None:
        self.make_vehicle()
        with self.assertRaises(ProtectedError):
            self.office.delete()


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

    def test_default_ordering_is_newest_first(self) -> None:
        older = self.make_record()
        newer = MaintenanceRecord.objects.create(
            vehicle=older.vehicle,
            mechanic=self.mechanic,
            performed_on=datetime.date(2025, 6, 1),
            maintenance_type=MaintenanceType.BRAKES,
            cost=Decimal("300.00"),
        )
        self.assertEqual(list(MaintenanceRecord.objects.all()), [newer, older])


class StrTests(ModelTestCase):
    def test_str_representations(self) -> None:
        vehicle = self.make_vehicle()
        record = MaintenanceRecord(
            vehicle=vehicle,
            mechanic=self.mechanic,
            performed_on=datetime.date(2025, 1, 10),
            maintenance_type=MaintenanceType.INSPECTION,
            cost=Decimal(0),
        )
        self.assertEqual(str(self.office), "New York (New York)")
        self.assertEqual(str(self.mechanic), "Ana #ASE-1")
        self.assertEqual(str(vehicle), "2020 Honda Accord (ABC1234)")
        self.assertEqual(str(record), "Inspection on 2025-01-10")
