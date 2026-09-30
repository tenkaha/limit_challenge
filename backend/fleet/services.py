from fleet.models import Office, Vehicle


def assign_vehicle(vehicle: Vehicle, office: Office) -> Vehicle:
    if vehicle.office_id != office.pk:
        vehicle.office = office
        vehicle.save(update_fields=["office", "updated_at"])
    return vehicle
