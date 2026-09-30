from django.core.management import call_command
from django.test import SimpleTestCase


class SystemChecksTests(SimpleTestCase):
    def test_system_checks_pass(self) -> None:
        call_command("check", fail_level="WARNING")
