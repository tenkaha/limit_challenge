import datetime
from decimal import Decimal
from itertools import count

from fleet.models import MaintenanceRecord, MaintenanceType, Mechanic, Office, Vehicle

_serial = count(1)


def make_office(name: str = "Downtown", city: str = "Austin") -> Office:
    return Office.objects.create(name=name, city=city)


def make_mechanic(
    name: str = "Ana", certification_number: str | None = None, *, is_active: bool = True
) -> Mechanic:
    return Mechanic.objects.create(
        name=name,
        certification_number=certification_number or f"CERT{next(_serial)}",
        is_active=is_active,
    )


def make_vehicle(office: Office, **overrides: object) -> Vehicle:
    n = next(_serial)
    fields: dict[str, object] = {
        "vin": f"1HGCM826{n:09d}",
        "license_plate": f"PLATE{n}",
        "make": "Honda",
        "model": "Accord",
        "year": 2020,
        "office": office,
    }
    fields.update(overrides)
    return Vehicle.objects.create(**fields)


def make_record(
    vehicle: Vehicle,
    mechanic: Mechanic,
    performed_on: datetime.date,
    cost: str = "100.00",
) -> MaintenanceRecord:
    return MaintenanceRecord.objects.create(
        vehicle=vehicle,
        mechanic=mechanic,
        performed_on=performed_on,
        maintenance_type=MaintenanceType.OIL_CHANGE,
        cost=Decimal(cost),
    )
