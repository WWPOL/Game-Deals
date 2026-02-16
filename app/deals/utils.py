"""
Utility functions for the deals app.
"""

from urllib.parse import urljoin
from django.conf import settings


def build_site_url(path: str) -> str:
    """
    Build an absolute URL by joining a path with the SITE_URL setting.

    This is useful for converting relative paths (like media URLs) into
    absolute URLs that can be used in external contexts like webhooks,
    emails, or API responses.

    Args:
        path: Relative path (e.g., '/media/images/game.jpg')

    Returns:
        Absolute URL (e.g., 'http://localhost:8000/media/images/game.jpg')

    Example:
        >>> build_site_url('/media/images/game.jpg')
        'http://localhost:8000/media/images/game.jpg'
    """
    return urljoin(settings.SITE_URL, path)
