"""Custom forms for Deal admin"""
from django import forms
from .models import Deal
from .widgets import ColorPaletteWidget, ColorPickerWidget


class DealAdminForm(forms.ModelForm):
    """Custom form for Deal with color palette and color picker widgets"""

    class Meta:
        model = Deal
        fields = '__all__'
        widgets = {
            'palette_colors': ColorPaletteWidget(),
            'foreground_color': ColorPickerWidget(),
        }
