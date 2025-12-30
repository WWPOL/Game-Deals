"""Extract dominant colors from images"""
import io
import logging
import requests
from colorthief import ColorThief
from typing import Tuple, Optional, List, Dict
from PIL import Image
import numpy as np
from sklearn.cluster import KMeans

from deals.models import ColorPalette

logger = logging.getLogger(__name__)


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


def color_distance(color1: Tuple[int, int, int], color2: Tuple[int, int, int]) -> float:
    """
    Calculate perceptual color distance using weighted Euclidean distance.
    Higher weight on red/green differences since human eye is more sensitive to them.
    """
    r1, g1, b1 = color1
    r2, g2, b2 = color2
    # Weighted Euclidean distance for better perceptual difference
    return np.sqrt(2 * (r1 - r2)**2 + 4 * (g1 - g2)**2 + 3 * (b1 - b2)**2)


def select_diverse_colors(colors: np.ndarray, counts: np.ndarray, max_colors: int = 6, min_colors: int = 2, min_distance: float = 100) -> List[int]:
    """
    Select 2-6 diverse colors, adapting distance threshold if needed.

    If fewer than min_colors found at current threshold, recursively
    retry with reduced threshold until min_colors achieved.

    Args:
        colors: Array of RGB colors from k-means
        counts: Number of pixels for each color
        max_colors: Maximum number of colors to return (default 6)
        min_colors: Minimum number of colors to return (default 2)
        min_distance: Minimum perceptual distance between selected colors

    Returns:
        List of indices for selected diverse colors
    """
    # Sort by count (most common first)
    sorted_indices = np.argsort(counts)[::-1]

    selected_indices = []
    selected_colors = []

    for idx in sorted_indices:
        if len(selected_indices) >= max_colors:
            break

        color = tuple(colors[idx])

        # First color is always selected
        if len(selected_indices) == 0:
            selected_indices.append(idx)
            selected_colors.append(color)
            continue

        # Check if this color is different enough from all selected colors
        is_diverse = True
        for selected_color in selected_colors:
            if color_distance(color, selected_color) < min_distance:
                is_diverse = False
                break

        if is_diverse:
            selected_indices.append(idx)
            selected_colors.append(color)

    # If we don't have enough diverse colors, retry with lower threshold
    if len(selected_indices) < min_colors and min_distance > 10:
        return select_diverse_colors(colors, counts, max_colors, min_colors, min_distance * 0.7)

    return selected_indices


def find_foreground_color(palette: List[Tuple[int, int, int]], background_color: Tuple[int, int, int]) -> str:
    """
    Find best contrasting foreground color for the given background.

    Tries palette colors first (excluding background itself), falls back to black/white.

    Args:
        palette: List of RGB color tuples
        background_color: The background color RGB tuple

    Returns:
        Hex string for foreground color
    """
    primary_lum = get_luminance(background_color)

    # WCAG AA requires contrast ratio of at least 4.5:1 for normal text
    MIN_CONTRAST = 4.5

    best_contrast = 0
    best_color = None

    # Try to find a color from the palette with good contrast
    for color in palette:
        if color == background_color:
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


def extract_colors_from_url(image_url: str, max_colors: int = 6, min_colors: int = 2) -> List[ColorPalette]:
    """
    Extract weighted color palette with foreground/background pairs.

    Returns 2-6 ColorPalette model instances (unsaved) sorted by weight descending (weights sum to 1.0).
    If fewer than min_colors diverse colors found, reduces distance threshold.

    Args:
        image_url: URL of the image to analyze
        max_colors: Maximum number of colors to extract (default 6)
        min_colors: Minimum number of colors to extract (default 2)

    Returns:
        List of unsaved ColorPalette model instances sorted by weight descending
    """
    try:
        # Download the image
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()

        # Load image and resize for faster processing
        img = Image.open(io.BytesIO(response.content))
        img = img.convert('RGB')
        img.thumbnail((200, 200))

        # Convert to numpy array
        img_array = np.array(img)
        pixels = img_array.reshape(-1, 3)

        # Use k-means clustering with more clusters to get more color candidates
        # We'll select the most diverse subset from these
        n_clusters = max(12, max_colors * 2)
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        kmeans.fit(pixels)

        # Get colors and their proportions
        colors = kmeans.cluster_centers_.astype(int)
        labels = kmeans.labels_
        counts = np.bincount(labels)

        # Select diverse colors with adaptive threshold
        diverse_indices = select_diverse_colors(colors, counts, max_colors, min_colors, min_distance=100)

        # Calculate normalized weights (sum to 1.0)
        total_pixels = sum(counts[idx] for idx in diverse_indices)
        weights = [counts[idx] / total_pixels for idx in diverse_indices]

        # Build palette RGB list for foreground color finding
        palette_rgb = [tuple(colors[idx]) for idx in diverse_indices]

        # Create ColorPalette instances (unsaved)
        palette_entries = []
        for idx, weight in zip(diverse_indices, weights):
            bg_rgb = tuple(colors[idx])
            bg_hex = rgb_to_hex(bg_rgb)

            # Find best contrasting foreground color for this background
            fg_hex = find_foreground_color(palette_rgb, bg_rgb)

            palette_entries.append(ColorPalette(
                background_color=bg_hex,
                foreground_color=fg_hex,
                weight=weight
            ))

        # Sort by weight descending (most prominent first)
        palette_entries.sort(key=lambda e: e.weight, reverse=True)

        logger.info(f"Extracted {len(palette_entries)} diverse colors from {image_url}")
        for i, entry in enumerate(palette_entries):
            logger.debug(f"  {i+1}. {entry.background_color} (fg: {entry.foreground_color}): {entry.weight:.1%}")

        return palette_entries

    except Exception as e:
        logger.error(f"Error extracting colors from {image_url}: {e}")
        # Return default color if extraction fails
        return [ColorPalette(
            background_color='#000000',
            foreground_color='#ffffff',
            weight=1.0
        )]
