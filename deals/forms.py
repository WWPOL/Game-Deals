"""Custom forms for Deal admin"""
from django import forms
from .models import Deal
from .widgets import ColorPaletteWidget


class DealAdminForm(forms.ModelForm):
    """Custom form for Deal with color palette widget"""

    class Meta:
        model = Deal
        fields = '__all__'
        widgets = {
            'palette_colors': ColorPaletteWidget(),
        }
