"""Extract dominant colors from images"""
import io
import requests
from colorthief import ColorThief
from typing import Tuple, Optional


def rgb_to_hex(rgb: Tuple[int, int, int]) -> str:
    """Convert RGB tuple to hex color string"""
    return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"


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

        # Get color palette (take second color as secondary)
        palette = color_thief.get_palette(color_count=3, quality=1)
        secondary_hex = rgb_to_hex(palette[1]) if len(palette) > 1 else primary_hex

        return primary_hex, secondary_hex

    except Exception as e:
        print(f"Error extracting colors from {image_url}: {e}")
        # Return default colors if extraction fails
        return "#1a1a1a", "#2d2d2d"
