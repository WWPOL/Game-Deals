"""
Middleware for storing current request context in thread-local storage.
"""

import threading

_thread_locals = threading.local()


def get_current_user():
    """Get the current user from thread-local storage."""
    return getattr(_thread_locals, "user", None)


def get_current_request():
    """Get the current request from thread-local storage."""
    return getattr(_thread_locals, "request", None)


class CurrentUserMiddleware:
    """
    Middleware that stores the current user in thread-local storage.

    This allows background tasks to access the user who initiated them
    without requiring explicit parameter passing.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = getattr(request, "user", None)
        _thread_locals.request = request

        try:
            response = self.get_response(request)
        finally:
            # Clean up thread-local storage after request
            _thread_locals.user = None
            _thread_locals.request = None

        return response
