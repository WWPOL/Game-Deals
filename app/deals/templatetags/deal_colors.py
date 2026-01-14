"""Template tags for working with color palettes"""

from django import template

register = template.Library()


@register.filter
def palette_gradient_css(color_palette):
    """
    Generate CSS gradient stops from weighted color palette.

    Distributes colors evenly across the gradient for smooth blending,
    ordered by weight (most prominent first).
    Returns: "color1 0%, color2 33%, color3 66%, color4 100%"
    """
    if not color_palette:
        return "#3b82f6 0%, #1e40af 100%"

    # Sort by weight descending (most prominent first)
    entries = sorted(color_palette, key=lambda x: x.weight, reverse=True)

    # Distribute colors evenly across gradient
    count = len(entries)
    stops = []
    for i, entry in enumerate(entries):
        if count == 1:
            percentage = 0
        else:
            percentage = (i / (count - 1)) * 100
        stops.append(f"{entry.background_color} {percentage:.0f}%")

    return ", ".join(stops)


@register.filter
def palette_backgrounds(color_palette):
    """Get list of background colors sorted by weight descending"""
    return [
        e.background_color
        for e in sorted(color_palette, key=lambda x: x.weight, reverse=True)
    ]


@register.filter
def palette_foregrounds(color_palette):
    """Get list of foreground colors sorted by weight descending"""
    return [
        e.foreground_color
        for e in sorted(color_palette, key=lambda x: x.weight, reverse=True)
    ]


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


@register.simple_tag
def deal_scope(deal):
    """
    Generate CSS scope class for a deal container.

    Usage: <div class="{% deal_scope deal %}">
    Returns: "deal-123"
    """
    return f"deal-{deal.id}"


@register.simple_tag
def deal_css(deal, *utilities):
    """
    Generate scoped CSS classes combining scope and utilities.

    Usage: <button class="{% deal_css deal 'bg-primary' 'fg-primary' 'glow-sm' %}">
    Returns: "deal-123 deal-bg-primary deal-fg-primary deal-glow-sm"
    """
    scope = f"deal-{deal.id}"
    utility_classes = " ".join(f"deal-{util}" for util in utilities)
    return f"{scope} {utility_classes}" if utilities else scope


@register.inclusion_tag("deals/partials/deal_variables.html")
def deal_variables(deal):
    """
    Generate CSS variable definitions for a deal.

    Usage: {% deal_variables deal %}
    Renders: <style>.deal-123 { --deal-bg-primary: #...; }</style>
    """
    # Get primary color (highest weight)
    primary = deal.color_palette.order_by("-weight").first()

    # Get gradient string using existing filter
    gradient_css = palette_gradient_css(deal.color_palette.all())

    return {
        "deal_id": deal.id,
        "bg_primary": primary.background_color,
        "fg_primary": primary.foreground_color,
        "gradient": f"linear-gradient(135deg, {gradient_css})",
        "gradient_shimmer": f"linear-gradient(110deg, {gradient_css})",
    }
