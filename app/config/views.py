"""Global views for error pages and other site-wide functionality"""

from django.shortcuts import render
from django.contrib.auth.mixins import PermissionRequiredMixin
from django.conf import settings
from django.urls import reverse_lazy
from revproxy.views import ProxyView
from common.permissions import CommonPermission


def handler404(request, exception):
    """Custom 404 page handler"""
    return render(request, "404.html", status=404)


def handler500(request):
    """Custom 500 page handler"""
    return render(request, "500.html", status=500)


class FlowerProxyView(PermissionRequiredMixin, ProxyView):
    """Proxy view to secure Flower with Django authentication"""

    permission_required = CommonPermission.CAN_VIEW_FLOWER.value
    upstream = settings.FLOWER_URL
    add_remote_user = False
