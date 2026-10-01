from typing import Any

from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    if isinstance(exc, ProtectedError):
        # blocked_count lets clients build their own wording instead of parsing detail.
        blocked = len(exc.protected_objects)
        return Response(
            {"detail": _protected_message(exc, blocked), "blocked_count": blocked},
            status=status.HTTP_409_CONFLICT,
        )
    return exception_handler(exc, context)


def _protected_message(exc: ProtectedError, blocked: int) -> str:
    sample = next(iter(exc.protected_objects))
    meta = sample._meta  # noqa: SLF001
    noun = meta.verbose_name if blocked == 1 else meta.verbose_name_plural
    return f"Cannot delete: it is referenced by {blocked} {noun}."
