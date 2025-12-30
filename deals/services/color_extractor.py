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


def get_contrast_ratio(lum1: float, lum2: float) -> float:
    """Calculate WCAG contrast ratio between two luminance values"""
    lighter = max(lum1, lum2)
    darker = min(lum1, lum2)
    return (lighter + 0.05) / (darker + 0.05)


def find_foreground_color(palette: List[Tuple[int, int, int]], primary_color: Tuple[int, int, int]) -> str:
    """
    Find the best foreground color from the palette or fallback to black/white.

    Args:
        palette: List of RGB color tuples
        primary_color: The primary/dominant color RGB tuple

    Returns:
        Hex string for foreground color
    """
    primary_lum = get_luminance(primary_color)

    # WCAG AA requires contrast ratio of at least 4.5:1 for normal text
    MIN_CONTRAST = 4.5

    best_contrast = 0
    best_color = None

    # Try to find a color from the palette with good contrast
    for color in palette:
        if color == primary_color:
            continue
        color_lum = get_luminance(color)
        contrast = get_contrast_ratio(primary_lum, color_lum)

        if contrast >= MIN_CONTRAST and contrast > best_contrast:
            best_contrast = contrast
            best_color = color

    # If we found a good color from palette, use it
    if best_color:
        return rgb_to_hex(best_color)

    # Fallback to black or white based on luminance
    white_lum = 1.0
    black_lum = 0.0

    white_contrast = get_contrast_ratio(primary_lum, white_lum)
    black_contrast = get_contrast_ratio(primary_lum, black_lum)

    return "#ffffff" if white_contrast > black_contrast else "#000000"


def extract_colors_from_url(image_url: str) -> Tuple[List[str], str]:
    """
    Extract color palette and foreground color from an image URL.

    Args:
        image_url: URL of the image to analyze

    Returns:
        Tuple of (palette_colors, foreground_color) where:
        - palette_colors is a list of 6 hex color strings
        - foreground_color is a hex string for text color
    """
    try:
        # Download the image
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()

        # Create ColorThief object from image bytes
        color_thief = ColorThief(io.BytesIO(response.content))

        # Get the dominant color (primary)
        dominant_color = color_thief.get_color(quality=1)

        # Get color palette (6 colors for variety)
        palette = color_thief.get_palette(color_count=6, quality=1)

        # Convert palette to hex strings
        palette_hex = [rgb_to_hex(color) for color in palette]

        # Find best foreground color
        foreground_hex = find_foreground_color(palette, dominant_color)

        print(f"Extracted colors from {image_url}:")
        print(f"  Palette: {palette_hex}")
        print(f"  Foreground: {foreground_hex}")

        return palette_hex, foreground_hex

    except Exception as e:
        print(f"Error extracting colors from {image_url}: {e}")
        # Return default colors if extraction fails
        return ["#1a1a1a", "#2d2d2d", "#3a3a3a", "#4a4a4a", "#5a5a5a", "#6a6a6a"], "#ffffff"
