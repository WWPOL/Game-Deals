"""Template tags for working with color palettes"""
from django import template

register = template.Library()


@register.filter
def palette_gradient_css(color_palette):
    """
    Generate CSS gradient stops from weighted color palette.

    Calculates percentages dynamically from weights.
    Returns: "color1 0%, color2 33%, color3 100%"
    """
    if not color_palette:
        return "#3b82f6 0%, #1e40af 100%"

    # Sort by weight descending (most prominent first)
    entries = sorted(color_palette, key=lambda x: x.weight, reverse=True)

    # Calculate total weight
    total_weight = sum(e.weight for e in entries)
    if total_weight == 0:
        total_weight = 1.0

    # Generate cumulative gradient stops
    position = 0
    stops = []
    for entry in entries:
        percentage = (entry.weight / total_weight) * 100
        stops.append(f"{entry.background_color} {position:.0f}%")
        position += percentage

    return ", ".join(stops)


@register.filter
def palette_backgrounds(color_palette):
    """Get list of background colors sorted by weight descending"""
    return [e.background_color for e in sorted(color_palette, key=lambda x: x.weight, reverse=True)]


@register.filter
def palette_foregrounds(color_palette):
    """Get list of foreground colors sorted by weight descending"""
    return [e.foreground_color for e in sorted(color_palette, key=lambda x: x.weight, reverse=True)]


@register.filter
def palette_total_weight(color_palette):
    """Calculate total weight of all palette entries"""
    return sum(e.weight for e in color_palette) if color_palette else 1.0


@register.filter
def color_percentage(color_entry, total_weight):
    """Calculate percentage for a single color entry"""
    if not total_weight or total_weight == 0:
        return 0
    return (color_entry.weight / total_weight) * 100
