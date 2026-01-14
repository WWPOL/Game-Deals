from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.contrib.auth import get_user_model
from django.http import HttpRequest


User = get_user_model()


class NoSignupAccountAdapter(DefaultAccountAdapter):
    """Prevent regular account signup - users must be manually created."""

    def is_open_for_signup(self, request: HttpRequest) -> bool:
        """Disable signup through regular forms."""
        return False


class NoSignupSocialAccountAdapter(DefaultSocialAccountAdapter):
    """Prevent automatic account creation via social login - only allow existing users."""

    def is_open_for_signup(self, request: HttpRequest, sociallogin) -> bool:
        """Disable automatic signup through social providers."""
        return False

    def pre_social_login(self, request: HttpRequest, sociallogin):
        """
        Connect social account to existing user by email.

        If a user with the same email already exists, connect the social account
        to that user automatically.
        """
        if sociallogin.is_existing:
            # Already connected
            return

        # Get email from social account
        email = sociallogin.account.extra_data.get('email')
        if not email:
            return

        # Try to find existing user by email
        try:
            user = User.objects.get(email=email)
            # Connect this social account to the existing user
            sociallogin.connect(request, user)
        except User.DoesNotExist:
            # No user with this email - will be rejected by is_open_for_signup
            pass
