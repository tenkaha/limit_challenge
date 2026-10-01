import datetime
from decimal import Decimal

from django.test import TestCase

from fleet import selectors, services
from fleet.selectors import VehicleFilters
from fleet.tests.helpers import make_mechanic, make_office, make_record, make_vehicle

TODAY = datetime.date(2026, 6, 15)


class OneYearBeforeTests(TestCase):
    def test_leap_day_falls_back_to_feb_28(self) -> None:
        self.assertEqual(
            selectors.one_year_before(datetime.date(2028, 2, 29)), datetime.date(2027, 2, 28)
        )


class SearchVehiclesTests(TestCase):
    def test_make_and_model_match_case_insensitively(self) -> None:
        office = make_office()
        honda = make_vehicle(office, make="Honda", model="Civic")
        make_vehicle(office, make="Ford", model="Civic")
        found = selectors.search_vehicles(VehicleFilters(make="honda", model="CIVIC"))
        self.assertQuerySetEqual(found, [honda])

    def test_date_range_and_mechanic_must_match_the_same_record(self) -> None:
        office = make_office()
        ana, bruno = make_mechanic("Ana", "ASE-1"), make_mechanic("Bruno", "ASE-2")
        matching = make_vehicle(office)
        make_record(matching, ana, datetime.date(2026, 2, 1))
        split = make_vehicle(office)
        make_record(split, ana, datetime.date(2025, 6, 1))  # right mechanic, out of range
        make_record(split, bruno, datetime.date(2026, 2, 1))  # in range, wrong mechanic
        found = selectors.search_vehicles(
            VehicleFilters(
                maintenance_from=datetime.date(2026, 1, 1),
                maintenance_to=datetime.date(2026, 3, 31),
                mechanic_certification="ASE-1",
            )
        )
        self.assertQuerySetEqual(found, [matching])

    def test_many_matching_records_return_vehicle_once(self) -> None:
        office, mechanic = make_office(), make_mechanic()
        vehicle = make_vehicle(office)
        for day in (1, 2, 3):
            make_record(vehicle, mechanic, datetime.date(2026, 1, day))
        found = selectors.search_vehicles(
            VehicleFilters(maintenance_from=datetime.date(2026, 1, 1))
        )
        self.assertQuerySetEqual(found, [vehicle])

    def test_office_and_active_filters(self) -> None:
        austin, boston = make_office(), make_office("Downtown", "Boston")
        active = make_vehicle(austin)
        make_vehicle(austin, is_active=False)
        make_vehicle(boston)
        found = selectors.search_vehicles(VehicleFilters(office=austin.pk, is_active=True))
        self.assertQuerySetEqual(found, [active])


class OfficeSummaryTests(TestCase):
    def test_summary_values(self) -> None:
        office, mechanic = make_office(), make_mechanic()
        active_a, active_b = make_vehicle(office), make_vehicle(office)
        retired = make_vehicle(office, is_active=False)
        since = datetime.date(2025, 6, 15)
        make_record(active_a, mechanic, since, "100.00")  # boundary: included
        make_record(active_a, mechanic, since - datetime.timedelta(days=1), "999.00")  # excluded
        make_record(active_b, mechanic, datetime.date(2026, 1, 10), "50.25")
        make_record(active_b, mechanic, datetime.date(2026, 3, 1), "25.00")
        make_record(retired, mechanic, datetime.date(2026, 5, 20), "10.00")  # inactive counts

        (summary,) = selectors.office_summary(today=TODAY)

        self.assertEqual(summary.active_vehicle_count, 2)
        self.assertEqual(summary.maintenance_cost_last_year, Decimal("185.25"))
        self.assertEqual(summary.last_maintenance, datetime.date(2026, 5, 20))

    def test_office_without_vehicles(self) -> None:
        make_office()
        (summary,) = selectors.office_summary(today=TODAY)
        self.assertEqual(summary.active_vehicle_count, 0)
        self.assertEqual(summary.maintenance_cost_last_year, Decimal(0))
        self.assertIsNone(summary.last_maintenance)


class MechanicWorkloadTests(TestCase):
    def test_membership_and_order(self) -> None:
        office = make_office()
        vehicle = make_vehicle(office)
        busy = make_mechanic("Busy")
        expensive = make_mechanic("Expensive")
        left_this_year = make_mechanic("Left", is_active=False)
        make_mechanic("Idle")
        make_mechanic("Al")  # same jobs and cost as Idle: name breaks the tie
        long_gone = make_mechanic("Gone", is_active=False)
        for day in (1, 2):
            make_record(vehicle, busy, datetime.date(2026, 1, day), "10.00")
        make_record(vehicle, expensive, datetime.date(2026, 1, 5), "500.00")
        make_record(vehicle, left_this_year, datetime.date(2026, 2, 1), "20.00")
        make_record(vehicle, long_gone, datetime.date(2025, 12, 31), "80.00")  # previous year

        rows = [(m.name, m.jobs_this_year) for m in selectors.mechanic_workload(year=2026)]

        self.assertEqual(rows, [("Busy", 2), ("Expensive", 1), ("Left", 1), ("Al", 0), ("Idle", 0)])


class VehiclesNeedingMaintenanceTests(TestCase):
    def test_threshold_membership_and_order(self) -> None:
        office, mechanic = make_office(), make_mechanic()
        never = make_vehicle(office, vin="ZZZZZZZZZZZZZZZZZ")
        exactly_365 = make_vehicle(office)
        make_record(exactly_365, mechanic, TODAY - datetime.timedelta(days=365))
        overdue_366 = make_vehicle(office)
        make_record(overdue_366, mechanic, TODAY - datetime.timedelta(days=366))
        very_overdue = make_vehicle(office)
        make_record(very_overdue, mechanic, TODAY - datetime.timedelta(days=900))
        make_record(very_overdue, mechanic, TODAY - datetime.timedelta(days=400))
        retired = make_vehicle(office, is_active=False)
        make_record(retired, mechanic, TODAY - datetime.timedelta(days=900))

        found = selectors.vehicles_needing_maintenance(today=TODAY)

        self.assertQuerySetEqual(found, [never, very_overdue, overdue_366])


class OfficeTakenTests(TestCase):
    def test_same_name_and_city_is_taken_except_by_itself(self) -> None:
        office = make_office("Downtown", "Austin")
        self.assertTrue(selectors.office_taken("Downtown", "Austin"))
        self.assertFalse(selectors.office_taken("Downtown", "Boston"))
        self.assertFalse(selectors.office_taken("Downtown", "Austin", exclude_pk=office.pk))


class VehicleConflictTests(TestCase):
    def test_vin_conflicts_with_any_vehicle_plate_only_with_active(self) -> None:
        office = make_office()
        retired = make_vehicle(office, is_active=False)
        self.assertEqual(
            selectors.vehicle_conflicts(vin=retired.vin, plate=retired.license_plate), ["vin"]
        )
        active = make_vehicle(office)
        self.assertEqual(
            selectors.vehicle_conflicts(vin=active.vin, plate=active.license_plate),
            ["vin", "license_plate"],
        )

    def test_excluded_vehicle_does_not_conflict_with_itself(self) -> None:
        vehicle = make_vehicle(make_office())
        conflicts = selectors.vehicle_conflicts(
            vin=vehicle.vin, plate=vehicle.license_plate, exclude_pk=vehicle.pk
        )
        self.assertEqual(conflicts, [])


class AssignVehicleTests(TestCase):
    def test_moves_vehicle(self) -> None:
        vehicle = make_vehicle(make_office())
        boston = make_office("Downtown", "Boston")
        services.assign_vehicle(vehicle, boston)
        vehicle.refresh_from_db()
        self.assertEqual(vehicle.office, boston)

    def test_same_office_is_a_no_op(self) -> None:
        office = make_office()
        vehicle = make_vehicle(office)
        before = vehicle.updated_at
        services.assign_vehicle(vehicle, office)
        vehicle.refresh_from_db()
        self.assertEqual(vehicle.updated_at, before)
