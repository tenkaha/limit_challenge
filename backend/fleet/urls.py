from rest_framework.routers import DefaultRouter

from fleet import views

router = DefaultRouter()
router.register("offices", views.OfficeViewSet)
router.register("vehicles", views.VehicleViewSet, basename="vehicle")
router.register("mechanics", views.MechanicViewSet, basename="mechanic")
router.register("maintenance-records", views.MaintenanceRecordViewSet)

urlpatterns = router.urls
