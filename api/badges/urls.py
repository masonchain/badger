from django.urls import include, path

from rest_framework import routers

from . import views

router = routers.DefaultRouter()
router.register(r'badge_sets', views.BadgeSetViewSet)
router.register(r'badges', views.BadgeViewSet)
router.register(r'users', views.UserViewSet)


urlpatterns = [
    path('', include(router.urls))
]

