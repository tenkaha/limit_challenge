import re


def normalize_vin(vin: str) -> str:
    return vin.strip().upper()


def normalize_plate(plate: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", plate.upper())


def normalize_certification(certification_number: str) -> str:
    return certification_number.strip()
