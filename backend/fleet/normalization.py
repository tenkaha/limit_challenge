import re

from fleet.models.vehicle import PLATE_CHARS

DISALLOWED_PLATE_CHARS = re.compile(rf"[^{PLATE_CHARS}]")


def normalize_vin(vin: str) -> str:
    return vin.strip().upper()


def normalize_plate(plate: str) -> str:
    return DISALLOWED_PLATE_CHARS.sub("", plate.upper())


def normalize_certification(certification_number: str) -> str:
    return certification_number.strip()
