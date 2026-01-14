"""Custom permissions for the common app."""
from enum import Enum


class CommonPermission(str, Enum):
    """Enum for common app custom permissions."""

    CAN_VIEW_FLOWER = 'common.can_view_flower'

    @property
    def codename(self) -> str:
        """Get the permission codename without app prefix."""
        return self.value.split('.', 1)[1]

    @property
    def app_label(self) -> str:
        """Get the app label."""
        return self.value.split('.', 1)[0]
