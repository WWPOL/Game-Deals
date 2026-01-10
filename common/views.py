"""
Views for common app functionality.
"""
from django.contrib import messages
from django.contrib.auth import logout as auth_logout
from django.shortcuts import redirect
from django.conf import settings


def logout_view(request):
    """
    Custom logout view that clears messages before logging out.
    This prevents admin success messages from appearing on the login page.
    """
    # Clear all messages from the session
    storage = messages.get_messages(request)
    storage.used = True

    # Log out the user
    auth_logout(request)

    # Redirect to the login page
    return redirect(settings.LOGIN_URL)
