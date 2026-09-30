import datetime
from io import StringIO

from django.core.management import CommandError, call_command
from django.test import TestCase

from fleet import seeding, selectors
from fleet.models import MaintenanceRecord, Office, Vehicle

TODAY = datetime.date(2026, 6, 15)
SMALL = seeding.SeedConfig(
    offices=2, mechanics=3, vehicles=5, max_records=3, heavy_vehicles=1, heavy_records=10
)


class SeedTests(TestCase):
    def test_refuses_to_seed_over_existing_data(self) -> None:
        Office.objects.create(name="Mine", city="Austin")
        with self.assertRaises(seeding.DataExistsError):
            seeding.seed(SMALL, today=TODAY)

    def test_scenarios_exercise_every_report_rule(self) -> None:
        seeding.seed(SMALL, today=TODAY)

        needing = {v.license_plate for v in selectors.vehicles_needing_maintenance(today=TODAY)}
        self.assertIn("NEVER1", needing)
        self.assertIn("DUE366", needing)
        self.assertNotIn("DUE365", needing)

        reused = Vehicle.objects.filter(license_plate="REUSE1")
        self.assertEqual(sorted(reused.values_list("is_active", flat=True)), [False, True])

        workload = {m.name: m.jobs_this_year for m in selectors.mechanic_workload(year=TODAY.year)}
        self.assertEqual(workload["Idle Ivy"], 0)
        self.assertEqual(workload["Retired Rex"], 1)

        empty = next(o for o in selectors.office_summary(today=TODAY) if o.name == "Empty Lot")
        self.assertEqual(empty.active_vehicle_count, 0)

    def test_same_seed_produces_same_data(self) -> None:
        seeding.seed(SMALL, today=TODAY)
        first = list(Vehicle.objects.order_by("vin").values_list("vin", "license_plate", "make"))
        first_costs = list(
            MaintenanceRecord.objects.order_by("cost").values_list("cost", flat=True)
        )

        seeding.flush()
        seeding.seed(SMALL, today=TODAY)

        self.assertEqual(
            list(Vehicle.objects.order_by("vin").values_list("vin", "license_plate", "make")), first
        )
        self.assertEqual(
            list(MaintenanceRecord.objects.order_by("cost").values_list("cost", flat=True)),
            first_costs,
        )


class SeedCommandTests(TestCase):
    ARGS = ("--offices=1", "--mechanics=2", "--vehicles=2", "--max-records=1", "--heavy-vehicles=0")

    def test_refuses_without_flush_and_reseeds_with_it(self) -> None:
        call_command("seed", *self.ARGS, stdout=StringIO())
        with self.assertRaisesMessage(CommandError, "--flush"):
            call_command("seed", *self.ARGS, stdout=StringIO())

        out = StringIO()
        call_command("seed", *self.ARGS, "--flush", stdout=out)
        self.assertIn("Seeded", out.getvalue())
        self.assertEqual(Office.objects.filter(name="Empty Lot").count(), 1)
