"""Models for the common app."""
from django.db import models
from common.permissions import CommonPermission


class CommonPermissions(models.Model):
    """
    Dummy model to define custom permissions for the common app.

    This model is never instantiated - it exists solely to attach
    custom permissions via Meta.permissions.
    """

    class Meta:
        managed = False  # Don't create a database table
        default_permissions = ()  # Don't create default add/change/delete/view permissions
        permissions = [
            (CommonPermission.CAN_VIEW_FLOWER.codename, 'Can view Flower monitoring dashboard'),
        ]
