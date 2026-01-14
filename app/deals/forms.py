"""Custom forms for Deal admin"""
from django import forms
from django.utils import timezone
from datetime import datetime, time
from .models import Deal


class DealAdminForm(forms.ModelForm):
    """Custom form for Deal admin"""

    class Meta:
        model = Deal
        fields = '__all__'

    def clean_expires(self):
        """Set time to 11:59 PM if only date is provided"""
        expires_value = self.cleaned_data.get('expires')

        if expires_value:
            # Check if the time component is midnight (00:00:00)
            if expires_value.time() == time(0, 0, 0):
                # Set time to 11:59 PM
                expires_value = datetime.combine(
                    expires_value.date(),
                    time(23, 59, 59)
                )
                # Make timezone-aware if needed
                if timezone.is_naive(expires_value):
                    expires_value = timezone.make_aware(expires_value)

        return expires_value
