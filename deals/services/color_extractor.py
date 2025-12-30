"""Extract dominant colors from images"""
import io
import requests
from colorthief import ColorThief
from typing import Tuple, Optional, List, Dict
from PIL import Image
import numpy as np
from sklearn.cluster import KMeans


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


def select_diverse_colors(colors: np.ndarray, counts: np.ndarray, num_colors: int = 6, min_distance: float = 100) -> List[int]:
    """
    Select diverse colors from clustered colors, ensuring they are visually distinct.

    Args:
        colors: Array of RGB colors from k-means
        counts: Number of pixels for each color
        num_colors: Target number of colors to return
        min_distance: Minimum perceptual distance between selected colors

    Returns:
        List of indices for selected diverse colors
    """
    # Sort by count (most common first)
    sorted_indices = np.argsort(counts)[::-1]

    selected_indices = []
    selected_colors = []

    for idx in sorted_indices:
        if len(selected_indices) >= num_colors:
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

    # If we don't have enough diverse colors, fill with remaining colors
    if len(selected_indices) < num_colors:
        for idx in sorted_indices:
            if idx not in selected_indices:
                selected_indices.append(idx)
                if len(selected_indices) >= num_colors:
                    break

    return selected_indices


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


def extract_colors_from_url(image_url: str, num_colors: int = 6) -> Tuple[List[str], str]:
    """
    Extract diverse color palette and foreground color from an image URL.
    Uses k-means clustering to find dominant colors, then selects visually distinct colors.

    Args:
        image_url: URL of the image to analyze
        num_colors: Number of colors to extract (default 6)

    Returns:
        Tuple of (palette_colors, foreground_color) where:
        - palette_colors is a list of hex color strings (diverse and sorted by prominence)
        - foreground_color is a hex string for text color
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
        n_clusters = max(12, num_colors * 2)
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        kmeans.fit(pixels)

        # Get colors and their proportions
        colors = kmeans.cluster_centers_.astype(int)
        labels = kmeans.labels_
        counts = np.bincount(labels)

        # Select diverse colors
        diverse_indices = select_diverse_colors(colors, counts, num_colors, min_distance=100)

        # Build palette from selected diverse colors
        palette_hex = []
        palette_rgb = []
        percentages = []
        for idx in diverse_indices:
            color_rgb = tuple(colors[idx])
            hex_color = rgb_to_hex(color_rgb)
            palette_hex.append(hex_color)
            palette_rgb.append(color_rgb)
            percentages.append((counts[idx] / len(labels)) * 100)

        # Find best foreground color
        dominant_color = palette_rgb[0]
        foreground_hex = find_foreground_color(palette_rgb, dominant_color)

        print(f"Extracted diverse colors from {image_url}:")
        for i, (hex_color, pct) in enumerate(zip(palette_hex, percentages)):
            print(f"  {i+1}. {hex_color}: {pct:.1f}%")
        print(f"  Foreground: {foreground_hex}")

        return palette_hex, foreground_hex

    except Exception as e:
        print(f"Error extracting colors from {image_url}: {e}")
        # Return default colors if extraction fails
        return ['#000000'], "#ffffff"
