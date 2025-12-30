"""Custom widgets for Deal admin"""
import json
from django import forms
from django.utils.safestring import mark_safe
from django.utils.html import format_html


class ColorPickerWidget(forms.Widget):
    """Widget for a single color picker"""

    def render(self, name, value, attrs=None, renderer=None):
        """Render a single color picker with text input"""
        if not value:
            value = '#ffffff'

        attrs_id = attrs.get('id', f'id_{name}') if attrs else f'id_{name}'

        widget_html = f'''
        <div style="display: flex; align-items: center; gap: 10px;">
            <input type="color"
                   value="{value}"
                   onchange="updateSingleColor_{attrs_id.replace('-', '_')}(this.value)"
                   style="width: 60px; height: 60px; border: 2px solid #ddd; border-radius: 4px; cursor: pointer;">
            <input type="text"
                   name="{name}"
                   value="{value}"
                   id="{attrs_id}"
                   onchange="updateColorPicker_{attrs_id.replace('-', '_')}(this.value)"
                   style="width: 100px; font-size: 14px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
        </div>

        <script>
        function updateSingleColor_{attrs_id.replace('-', '_')}(newColor) {{
            document.getElementById('{attrs_id}').value = newColor;
        }}
        function updateColorPicker_{attrs_id.replace('-', '_')}(newColor) {{
            const colorPicker = document.querySelector('input[type="color"][onchange*="updateSingleColor_{attrs_id.replace('-', '_')}"]');
            if (colorPicker) colorPicker.value = newColor;
        }}
        </script>
        '''

        return mark_safe(widget_html)


class ColorPaletteWidget(forms.Widget):
    """Widget to display and edit color palette with color pickers"""

    def render(self, name, value, attrs=None, renderer=None):
        """Render the color palette with editable color pickers"""
        if not value:
            value = []

        # Ensure value is a list
        if isinstance(value, list):
            # Already a list, use as-is
            pass
        elif isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                value = []
        else:
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
        if isinstance(value, list):
            # Convert list to JSON string for JSONField
            return json.dumps(value)
        elif isinstance(value, str):
            # Already a JSON string, validate it and return
            try:
                json.loads(value)  # Validate it's valid JSON
                return value
            except json.JSONDecodeError:
                return '[]'
        return '[]'


class ColorPalettePreviewWidget(forms.Widget):
    """Read-only widget displaying foreground/background color combination preview."""

    def render(self, name, value, attrs=None, renderer=None):
        """Render color preview showing TEXT on background color."""
        if not value or not isinstance(value, dict):
            bg_color = value if value else '#000000'
            fg_color = '#ffffff'
            weight = 0
        else:
            bg_color = value.get('background_color', '#000000')
            fg_color = value.get('foreground_color', '#ffffff')
            weight = value.get('weight', 0)

        # Pre-format percentage since format_html doesn't support format specifiers
        weight_pct = f"{weight:.1%}"

        return format_html(
            '<div style="display: inline-flex; gap: 8px; align-items: center;">'
            '<div style="width: 100px; height: 40px; background: {}; color: {}; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; font-weight: 600;">TEXT</div>'
            '<span style="font-size: 11px; color: #666; font-family: monospace;">{}</span>'
            '</div>',
            bg_color,
            fg_color,
            weight_pct
        )


class ColorPaletteEditWidget(forms.MultiWidget):
    """Composite widget that shows preview by default, expands to edit colors when clicked."""

    def __init__(self, attrs=None):
        widgets = [
            ColorPickerWidget(attrs=attrs),  # background_color
            ColorPickerWidget(attrs=attrs),  # foreground_color
        ]
        super().__init__(widgets, attrs)

    def decompress(self, value):
        """Split value into background and foreground colors."""
        if value:
            if isinstance(value, dict):
                return [value.get('background_color'), value.get('foreground_color')]
            elif isinstance(value, (list, tuple)) and len(value) == 2:
                return value
        return ['#000000', '#ffffff']

    def render(self, name, value, attrs=None, renderer=None):
        """Render preview with click-to-edit functionality."""
        if not attrs:
            attrs = {}

        attrs_id = attrs.get('id', f'id_{name}')

        # Decompress value to get bg and fg colors
        if value:
            if isinstance(value, dict):
                bg_color = value.get('background_color', '#000000')
                fg_color = value.get('foreground_color', '#ffffff')
            elif isinstance(value, (list, tuple)) and len(value) == 2:
                bg_color = value[0] or '#000000'
                fg_color = value[1] or '#ffffff'
            else:
                bg_color = '#000000'
                fg_color = '#ffffff'
        else:
            bg_color = '#000000'
            fg_color = '#ffffff'

        # Render the two ColorPickerWidgets
        bg_widget_html = self.widgets[0].render(f'{name}_0', bg_color, {'id': f'{attrs_id}_0'})
        fg_widget_html = self.widgets[1].render(f'{name}_1', fg_color, {'id': f'{attrs_id}_1'})

        widget_html = f'''
        <div id="{attrs_id}_container" style="display: inline-block;">
            <!-- Preview Mode (default) -->
            <div id="{attrs_id}_preview" style="cursor: pointer; display: inline-flex; gap: 8px; align-items: center;"
                 onclick="toggleColorEdit_{attrs_id.replace('-', '_')}()">
                <div id="{attrs_id}_preview_box" style="
                    width: 100px;
                    height: 40px;
                    background: {bg_color};
                    color: {fg_color};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                ">TEXT</div>
                <span style="font-size: 11px; color: #999;">✏️ Click to edit</span>
            </div>

            <!-- Edit Mode (hidden by default) -->
            <div id="{attrs_id}_edit" style="display: none;">
                <div style="display: flex; flex-direction: column; gap: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">
                    <div>
                        <label style="font-size: 11px; font-weight: bold; color: #666; display: block; margin-bottom: 4px;">Background Color:</label>
                        {bg_widget_html}
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: bold; color: #666; display: block; margin-bottom: 4px;">Foreground Color:</label>
                        {fg_widget_html}
                    </div>
                    <button type="button" onclick="toggleColorEdit_{attrs_id.replace('-', '_')}()"
                            style="padding: 6px 12px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        ✓ Done
                    </button>
                </div>
            </div>
        </div>

        <script>
        function toggleColorEdit_{attrs_id.replace('-', '_')}() {{
            const preview = document.getElementById('{attrs_id}_preview');
            const edit = document.getElementById('{attrs_id}_edit');
            const previewBox = document.getElementById('{attrs_id}_preview_box');

            if (preview.style.display === 'none') {{
                // Switch back to preview mode
                preview.style.display = 'inline-flex';
                edit.style.display = 'none';

                // Update preview with current values
                const bgInput = document.getElementById('{attrs_id}_0');
                const fgInput = document.getElementById('{attrs_id}_1');
                if (bgInput && fgInput) {{
                    previewBox.style.background = bgInput.value;
                    previewBox.style.color = fgInput.value;
                }}
            }} else {{
                // Switch to edit mode
                preview.style.display = 'none';
                edit.style.display = 'block';
            }}
        }}
        </script>
        '''

        return mark_safe(widget_html)
