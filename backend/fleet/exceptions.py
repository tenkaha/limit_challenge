from typing import Any

from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    if isinstance(exc, ProtectedError):
        return Response(
            {"detail": _protected_message(exc)},
            status=status.HTTP_409_CONFLICT,
        )
    return exception_handler(exc, context)


def _protected_message(exc: ProtectedError) -> str:
    blockers = exc.protected_objects
    sample = next(iter(blockers))
    meta = sample._meta  # noqa: SLF001
    noun = meta.verbose_name if len(blockers) == 1 else meta.verbose_name_plural
    return f"Cannot delete: it is referenced by {len(blockers)} {noun}."
