"""Custom widgets for Deal admin"""
import json
from django import forms
from django.utils.safestring import mark_safe


class ColorPaletteWidget(forms.Widget):
    """Widget to display and edit color palette with color pickers"""

    def render(self, name, value, attrs=None, renderer=None):
        """Render the color palette with editable color pickers"""
        if not value:
            value = []

        # Ensure value is a list
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                value = []

        # Ensure we have at least 6 colors
        while len(value) < 6:
            value.append('#3b82f6')

        attrs_id = attrs.get('id', f'id_{name}') if attrs else f'id_{name}'

        widget_html = f'''
        <div id="{attrs_id}_container" style="display: flex; flex-direction: column; gap: 15px;">
            <div id="{attrs_id}_swatches" style="display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-start;">
        '''

        for i, color in enumerate(value):
            widget_html += f'''
                <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                    <input type="color"
                           value="{color}"
                           onchange="updatePaletteColor_{attrs_id.replace('-', '_')}({i}, this.value)"
                           style="width: 60px; height: 60px; border: 2px solid #ddd; border-radius: 4px; cursor: pointer;">
                    <input type="text"
                           value="{color}"
                           onchange="updatePaletteColor_{attrs_id.replace('-', '_')}({i}, this.value)"
                           style="width: 70px; font-size: 10px; text-align: center; padding: 2px; border: 1px solid #ddd; border-radius: 3px;">
                    <div style="font-size: 9px; color: #999;">Color {i + 1}</div>
                </div>
            '''

        widget_html += f'''
            </div>
            <input type="hidden" name="{name}" value='{json.dumps(value)}' id="{attrs_id}">
        </div>

        <script>
        function updatePaletteColor_{attrs_id.replace('-', '_')}(index, newColor) {{
            const hiddenInput = document.getElementById('{attrs_id}');
            let palette = JSON.parse(hiddenInput.value);
            palette[index] = newColor;
            hiddenInput.value = JSON.stringify(palette);

            // Update both the color picker and text input
            const container = document.getElementById('{attrs_id}_swatches');
            const colorInputs = container.querySelectorAll('input[type="color"]');
            const textInputs = container.querySelectorAll('input[type="text"]');

            if (colorInputs[index]) colorInputs[index].value = newColor;
            if (textInputs[index]) textInputs[index].value = newColor;
        }}
        </script>
        '''

        return mark_safe(widget_html)

    def value_from_datadict(self, data, files, name):
        """Extract value from form data"""
        value = data.get(name, '[]')
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return []
        return value
