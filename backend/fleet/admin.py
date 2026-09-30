from django.contrib import admin

from fleet.models import MaintenanceRecord, Mechanic, Office, Vehicle

# ModelAdmin is generic only in django-stubs; subscripting it at runtime needs
# django-stubs-ext, which is a dev-only dependency.


@admin.register(Office)
class OfficeAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ("name", "city")
    search_fields = ("name", "city")


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ("vin", "license_plate", "make", "model", "year", "office", "is_active")
    list_filter = ("is_active", "office")
    list_select_related = ("office",)
    search_fields = ("vin", "license_plate", "make", "model")


@admin.register(Mechanic)
class MechanicAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ("name", "certification_number", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "certification_number")


@admin.register(MaintenanceRecord)
class MaintenanceRecordAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ("performed_on", "vehicle", "mechanic", "maintenance_type", "cost")
    list_filter = ("maintenance_type",)
    list_select_related = ("vehicle", "mechanic")
    autocomplete_fields = ("vehicle", "mechanic")
    date_hierarchy = "performed_on"
