import time
from argparse import ArgumentParser
from typing import Any, override

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from fleet import seeding


class Command(BaseCommand):
    help = "Fill the database with realistic fleet data (Faker) plus hand-picked edge cases."

    @override
    def add_arguments(self, parser: ArgumentParser) -> None:
        defaults = seeding.SeedConfig()
        parser.add_argument("--offices", type=int, default=defaults.offices)
        parser.add_argument("--mechanics", type=int, default=defaults.mechanics)
        parser.add_argument("--vehicles", type=int, default=defaults.vehicles)
        parser.add_argument("--max-records", type=int, default=defaults.max_records)
        parser.add_argument("--heavy-vehicles", type=int, default=defaults.heavy_vehicles)
        parser.add_argument("--heavy-records", type=int, default=defaults.heavy_records)
        parser.add_argument("--seed", type=int, default=defaults.seed)
        parser.add_argument("--flush", action="store_true", help="Delete fleet data first.")

    @override
    def handle(self, *args: Any, **options: Any) -> None:
        if options["flush"]:
            seeding.flush()
        config = seeding.SeedConfig(
            offices=options["offices"],
            mechanics=options["mechanics"],
            vehicles=options["vehicles"],
            max_records=options["max_records"],
            heavy_vehicles=options["heavy_vehicles"],
            heavy_records=options["heavy_records"],
            seed=options["seed"],
        )
        started = time.perf_counter()
        try:
            result = seeding.seed(config, today=timezone.localdate())
        except seeding.DataExistsError as exc:
            raise CommandError(str(exc)) from exc
        elapsed = time.perf_counter() - started
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {result.offices} offices, {result.mechanics} mechanics, "
                f"{result.vehicles} vehicles, {result.records} maintenance records "
                f"in {elapsed:.1f}s."
            )
        )
