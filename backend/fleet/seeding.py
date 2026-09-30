import datetime
import random
from collections.abc import Callable
from dataclasses import dataclass
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from faker import Faker

from fleet.models import MaintenanceRecord, MaintenanceType, Mechanic, Office, Vehicle
from fleet.normalization import normalize_plate

VIN_CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"
BATCH_SIZE = 1000
HISTORY_DAYS = 3 * 365
MAKES = {
    "Ford": ("F-150", "Transit", "Escape", "Ranger"),
    "Toyota": ("Camry", "Corolla", "Tacoma", "RAV4"),
    "Honda": ("Civic", "Accord", "CR-V"),
    "Chevrolet": ("Silverado", "Express", "Malibu"),
    "Ram": ("1500", "ProMaster"),
    "Tesla": ("Model 3", "Model Y"),
}
COST_RANGES = {
    MaintenanceType.OIL_CHANGE: (40, 120),
    MaintenanceType.TIRE_ROTATION: (30, 90),
    MaintenanceType.BRAKES: (150, 900),
    MaintenanceType.INSPECTION: (50, 200),
    MaintenanceType.REPAIR: (200, 5000),
    MaintenanceType.OTHER: (20, 600),
}


@dataclass(frozen=True, kw_only=True)
class SeedConfig:
    offices: int = 12
    mechanics: int = 40
    vehicles: int = 600
    max_records: int = 200
    heavy_vehicles: int = 5
    heavy_records: int = 800
    seed: int = 42


@dataclass(frozen=True)
class SeedResult:
    offices: int
    mechanics: int
    vehicles: int
    records: int


class DataExistsError(Exception):
    pass


def flush() -> None:
    MaintenanceRecord.objects.all().delete()
    Vehicle.objects.all().delete()
    Mechanic.objects.all().delete()
    Office.objects.all().delete()


def has_data() -> bool:
    return any(m.objects.exists() for m in (Office, Mechanic, Vehicle, MaintenanceRecord))


@transaction.atomic
def seed(config: SeedConfig, *, today: datetime.date) -> SeedResult:
    if has_data():
        msg = "Database already has fleet data; rerun with --flush to replace it."
        raise DataExistsError(msg)
    return _Seeder(config, today).run()


class _Seeder:
    def __init__(self, config: SeedConfig, today: datetime.date) -> None:
        self.config = config
        self.today = today
        self.rng = random.Random(config.seed)  # noqa: S311 - reproducible fake data, not crypto
        self.fake = Faker("en_US")
        self.fake.seed_instance(config.seed)
        self.vins: set[str] = set()
        self.plates: set[str] = set()
        self.certifications = iter(range(1, 1_000_000))

    def run(self) -> SeedResult:
        offices = Office.objects.bulk_create(self._offices())
        mechanics = Mechanic.objects.bulk_create(self._mechanics())
        vehicles = Vehicle.objects.bulk_create(self._vehicles(offices), batch_size=BATCH_SIZE)
        records = self._random_history(vehicles, mechanics)
        records += self._scenarios(offices[0], mechanics)
        MaintenanceRecord.objects.bulk_create(records, batch_size=BATCH_SIZE)
        return SeedResult(
            offices=Office.objects.count(),
            mechanics=Mechanic.objects.count(),
            vehicles=Vehicle.objects.count(),
            records=MaintenanceRecord.objects.count(),
        )

    def _offices(self) -> list[Office]:
        cities = self.fake.unique
        return [
            Office(name=f"{city} {self.rng.choice(('Depot', 'Yard', 'Hub'))}", city=city)
            for city in (cities.city() for _ in range(self.config.offices))
        ]

    def _mechanics(self) -> list[Mechanic]:
        return [
            Mechanic(
                name=self.fake.name(),
                certification_number=self._certification(),
                is_active=self.rng.random() > 0.15,  # noqa: PLR2004
            )
            for _ in range(self.config.mechanics)
        ]

    def _vehicles(self, offices: list[Office]) -> list[Vehicle]:
        return [
            self._vehicle(self.rng.choice(offices), is_active=self.rng.random() > 0.1)  # noqa: PLR2004
            for _ in range(self.config.vehicles)
        ]

    def _vehicle(
        self, office: Office, *, is_active: bool = True, plate: str | None = None
    ) -> Vehicle:
        make = self.rng.choice(tuple(MAKES))
        return Vehicle(
            vin=self._vin(),
            license_plate=plate or self._plate(),
            make=make,
            model=self.rng.choice(MAKES[make]),
            year=self.rng.randint(2012, self.today.year),
            office=office,
            is_active=is_active,
            created_at=self._moment(self.today - datetime.timedelta(days=HISTORY_DAYS)),
        )

    def _random_history(
        self, vehicles: list[Vehicle], mechanics: list[Mechanic]
    ) -> list[MaintenanceRecord]:
        heavy = set(
            self.rng.sample(range(len(vehicles)), k=min(self.config.heavy_vehicles, len(vehicles)))
        )
        records = []
        for index, vehicle in enumerate(vehicles):
            count = (
                self.config.heavy_records
                if index in heavy
                else self.rng.randint(0, self.config.max_records)
            )
            records += [self._record(vehicle, self.rng.choice(mechanics)) for _ in range(count)]
        return records

    def _scenarios(self, office: Office, mechanics: list[Mechanic]) -> list[MaintenanceRecord]:
        # Hand-picked cases so every report rule is visible in manual testing.
        mechanic = mechanics[0]
        _never_serviced, due_365, due_366, retired, reused = Vehicle.objects.bulk_create(
            [
                self._vehicle(office, plate="NEVER1"),
                self._vehicle(office, plate="DUE365"),
                self._vehicle(office, plate="DUE366"),
                self._vehicle(office, plate="REUSE1", is_active=False),
                self._vehicle(office, plate="REUSE1"),
            ]
        )
        Office.objects.create(name="Empty Lot", city="Nowhere")
        Mechanic.objects.create(name="Idle Ivy", certification_number="IDLE-0001")
        retired_mechanic = Mechanic.objects.create(
            name="Retired Rex", certification_number="GONE-0001", is_active=False
        )
        return [
            self._record(due_365, mechanic, self.today - datetime.timedelta(days=365)),
            self._record(due_366, mechanic, self.today - datetime.timedelta(days=366)),
            self._record(retired, mechanic, self.today - datetime.timedelta(days=10)),
            self._record(reused, retired_mechanic, self.today.replace(month=1, day=1)),
        ]

    def _record(
        self, vehicle: Vehicle, mechanic: Mechanic, performed_on: datetime.date | None = None
    ) -> MaintenanceRecord:
        performed_on = performed_on or self.today - datetime.timedelta(
            days=self.rng.randint(0, HISTORY_DAYS)
        )
        kind = self.rng.choice(tuple(COST_RANGES))
        low, high = COST_RANGES[kind]
        return MaintenanceRecord(
            vehicle=vehicle,
            mechanic=mechanic,
            performed_on=performed_on,
            maintenance_type=kind,
            cost=Decimal(self.rng.randint(low * 100, high * 100)) / 100,
            notes=self.fake.sentence() if self.rng.random() < 0.3 else "",  # noqa: PLR2004
            created_at=self._moment(performed_on),
        )

    def _vin(self) -> str:
        return _unique(lambda: "".join(self.rng.choices(VIN_CHARS, k=17)), self.vins)

    def _plate(self) -> str:
        return _unique(lambda: normalize_plate(self.fake.license_plate()), self.plates)

    def _certification(self) -> str:
        return f"ASE-{next(self.certifications):06d}"

    def _moment(self, day: datetime.date) -> datetime.datetime:
        return timezone.make_aware(datetime.datetime.combine(day, datetime.time(12)))


def _unique(generate: Callable[[], str], seen: set[str]) -> str:
    # iter(callable, sentinel) calls generate() forever; take the first unseen value.
    value = next(candidate for candidate in iter(generate, None) if candidate not in seen)
    seen.add(value)
    return value
