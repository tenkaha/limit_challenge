from fleet.models.base import TimeStampedModel
from fleet.models.maintenance import MaintenanceRecord, MaintenanceType
from fleet.models.mechanic import Mechanic
from fleet.models.office import Office
from fleet.models.vehicle import Vehicle

__all__ = [
    "MaintenanceRecord",
    "MaintenanceType",
    "Mechanic",
    "Office",
    "TimeStampedModel",
    "Vehicle",
]
