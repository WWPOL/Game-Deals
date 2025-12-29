"""Extract dominant colors from images"""
import io
import requests
from colorthief import ColorThief
from typing import Tuple, Optional, List


def rgb_to_hex(rgb: Tuple[int, int, int]) -> str:
    """Convert RGB tuple to hex color string"""
    return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"


def get_luminance(rgb: Tuple[int, int, int]) -> float:
    """Calculate relative luminance of an RGB color"""
    # Convert to 0-1 range and apply gamma correction
    r, g, b = [x / 255.0 for x in rgb]
    r = r / 12.92 if r <= 0.03928 else ((r + 0.055) / 1.055) ** 2.4
    g = g / 12.92 if g <= 0.03928 else ((g + 0.055) / 1.055) ** 2.4
    b = b / 12.92 if b <= 0.03928 else ((b + 0.055) / 1.055) ** 2.4
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def extract_colors_from_url(image_url: str) -> Tuple[str, str]:
    """
    Extract primary and secondary colors from an image URL.

    Args:
        image_url: URL of the image to analyze

    Returns:
        Tuple of (primary_color, secondary_color) as hex strings
    """
    try:
        # Download the image
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()

        # Create ColorThief object from image bytes
        color_thief = ColorThief(io.BytesIO(response.content))

        # Get the dominant color (primary)
        dominant_color = color_thief.get_color(quality=1)
        primary_hex = rgb_to_hex(dominant_color)

        # Get color palette (6 colors for variety)
        palette = color_thief.get_palette(color_count=6, quality=1)

        # Find the color with most contrast to primary for secondary
        # This gives us a better complementary color
        primary_lum = get_luminance(dominant_color)
        best_contrast = 0
        secondary_color = palette[1] if len(palette) > 1 else dominant_color

        for color in palette[1:]:
            color_lum = get_luminance(color)
            contrast = abs(primary_lum - color_lum)
            if contrast > best_contrast:
                best_contrast = contrast
                secondary_color = color

        secondary_hex = rgb_to_hex(secondary_color)

        print(f"Extracted colors from {image_url}:")
        print(f"  Primary: {primary_hex} (RGB: {dominant_color})")
        print(f"  Secondary: {secondary_hex} (RGB: {secondary_color})")
        print(f"  Full palette: {[rgb_to_hex(c) for c in palette]}")

        return primary_hex, secondary_hex

    except Exception as e:
        print(f"Error extracting colors from {image_url}: {e}")
        # Return default colors if extraction fails
        return "#1a1a1a", "#2d2d2d"
