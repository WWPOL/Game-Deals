"""Abstract base class and implementations for image search"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional
from googleapiclient.discovery import build


@dataclass
class ImageResult:
    """Represents a single image search result"""
    url: str
    thumbnail: str
    title: str
    width: int
    height: int
    source: str  # The website/domain the image came from


class ImageSearchProvider(ABC):
    """Abstract base class for image search providers"""

    @abstractmethod
    def search(self, query: str, limit: int = 10) -> List[ImageResult]:
        """
        Search for images matching the query.

        Args:
            query: Search query string
            limit: Maximum number of results to return

        Returns:
            List of ImageResult objects
        """
        pass


class GoogleCustomSearchProvider(ImageSearchProvider):
    """Google Custom Search API implementation"""

    def __init__(self, api_key: str, search_engine_id: str):
        """
        Initialize the Google Custom Search provider.

        Args:
            api_key: Google API key
            search_engine_id: Custom Search Engine ID
        """
        self.api_key = api_key
        self.search_engine_id = search_engine_id

    def search(self, query: str, limit: int = 10) -> List[ImageResult]:
        """
        Search for images using Google Custom Search API.

        Args:
            query: Search query string
            limit: Maximum number of results to return (max 10 per request)

        Returns:
            List of ImageResult objects
        """
        if not self.api_key or not self.search_engine_id:
            return []

        try:
            service = build("customsearch", "v1", developerKey=self.api_key)

            # Limit to 10 per request (API limitation)
            num_results = min(limit, 10)

            result = service.cse().list(
                q=query,
                cx=self.search_engine_id,
                searchType='image',
                num=num_results,
                imgSize='large',  # Prefer larger images
                safe='active',    # Safe search
            ).execute()

            images = []
            for item in result.get('items', []):
                # Extract image info
                image_info = item.get('image', {})
                images.append(ImageResult(
                    url=item.get('link', ''),
                    thumbnail=image_info.get('thumbnailLink', ''),
                    title=item.get('title', ''),
                    width=image_info.get('width', 0),
                    height=image_info.get('height', 0),
                    source=item.get('displayLink', '')
                ))

            return images

        except Exception as e:
            # Log error in production
            print(f"Error searching images: {e}")
            return []


class DummyImageSearchProvider(ImageSearchProvider):
    """Dummy provider for testing without API keys"""

    def search(self, query: str, limit: int = 10) -> List[ImageResult]:
        """Return placeholder images for testing"""
        return [
            ImageResult(
                url=f"https://via.placeholder.com/800x450?text={query.replace(' ', '+')}+{i+1}",
                thumbnail=f"https://via.placeholder.com/200x150?text={query.replace(' ', '+')}+{i+1}",
                title=f"{query} - Result {i+1}",
                width=800,
                height=450,
                source="placeholder.com"
            )
            for i in range(min(limit, 10))
        ]
