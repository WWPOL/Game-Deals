import threading
from django.conf import settings
from contextlib import contextmanager
import requests
import io # Added for BytesIO in image_memory_manager's get_managed_image

class ImageTooLargeError(Exception):
    pass

class MemoryAllocationError(Exception):
    pass


class ImageMemoryManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._init()
        return cls._instance

    def _init(self):
        # Default to 128MB if not set, or ensure it's at least 1MB
        self._max_memory = max(1, getattr(settings, 'IMAGE_PROCESSING_MAX_MEMORY_MB', 128)) * 1024 * 1024
        self._current_memory = 0
        self._lock = threading.Lock()

    def can_allocate(self, size_in_bytes: int) -> bool:
        """Check if a certain amount of memory can be allocated."""
        with self._lock:
            return self._current_memory + size_in_bytes <= self._max_memory

    def allocate(self, size_in_bytes: int) -> bool:
        """
        Allocate memory for an image. Returns True on success, False on failure.
        """
        with self._lock:
            if self.can_allocate(size_in_bytes):
                self._current_memory += size_in_bytes
                return True
            return False

    def release(self, size_in_bytes: int):
        """Release allocated memory."""
        with self._lock:
            self._current_memory = max(0, self._current_memory - size_in_bytes)


@contextmanager
def get_managed_image(image_url: str = None, django_file = None):
    memory_manager = ImageMemoryManager()
    image_content = None
    image_size = 0
    max_size_bytes = getattr(settings, 'IMAGE_PROCESSING_MAX_MEMORY_MB', 128) * 1024 * 1024

    try:
        if image_url:
            with requests.head(image_url, timeout=5) as r:
                r.raise_for_status()
                content_length = int(r.headers.get('Content-Length', 0))
                if content_length > max_size_bytes:
                    raise ImageTooLargeError(f"Image is {content_length / 1024**2:.2f}MB, exceeds the total available processing memory of {settings.IMAGE_PROCESSING_MAX_MEMORY_MB}MB")
                image_size = content_length
        elif django_file:
            # Django FileField's file object usually has a .size attribute
            image_size = django_file.size
        else:
            raise ValueError("Either image_url or django_file must be provided.")

        if image_size > max_size_bytes:
            raise ImageTooLargeError(f"Image is {image_size / 1024**2:.2f}MB, exceeds the total available processing memory of {settings.IMAGE_PROCESSING_MAX_MEMORY_MB}MB")

        if not memory_manager.allocate(image_size):
            raise MemoryAllocationError(f"Cannot allocate {image_size / 1024**2:.2f}MB, not enough memory available.")

        if image_url:
            with requests.get(image_url, timeout=10) as r: # Removed stream=True as we're reading all at once now
                r.raise_for_status()
                image_content = r.content
        else: # django_file
            # Ensure the file pointer is at the beginning before reading
            django_file.seek(0)
            image_content = django_file.read()
            # Reset file pointer for any subsequent operations if needed, though usually not after context exits
            django_file.seek(0)
        
        yield image_content

    finally:
        if image_size > 0:
            memory_manager.release(image_size)