"""Custom forms for Deal admin"""
from django import forms
from .models import Deal


class DealAdminForm(forms.ModelForm):
    """Custom form for Deal admin"""

    class Meta:
        model = Deal
        fields = '__all__'
