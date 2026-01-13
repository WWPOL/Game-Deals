"""Custom Django model fields"""
from django.db import models
from django.core.exceptions import ValidationError
from PIL import Image


# Web browser supported image formats
# Based on MDN: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types
SUPPORTED_IMAGE_FORMATS = ['JPEG', 'PNG', 'GIF', 'WEBP', 'AVIF', 'SVG']


def validate_image_content(image_file):
    """
    Validate that a file is a valid, readable image.

    Validates in-memory before writing to storage.

    Args:
        image_file: File-like object (ContentFile, UploadedFile, etc.)

    Raises:
        ValidationError: If image is invalid or corrupted
    """
    if not image_file:
        return

    try:
        # Save current position
        current_pos = image_file.tell() if hasattr(image_file, 'tell') else 0

        # Open the image file
        img = Image.open(image_file)

        # Verify the image by loading it (detects truncated/corrupted files)
        img.verify()

        # Reset file pointer after verify (verify() makes the file unusable)
        image_file.seek(0)

        # Try to open again and load the image data to ensure it's readable
        img = Image.open(image_file)
        img.load()

        # Check if format is supported by web browsers
        if img.format not in SUPPORTED_IMAGE_FORMATS:
            raise ValidationError(
                f'Unsupported image format: {img.format}. '
                f'Supported formats for web: {", ".join(SUPPORTED_IMAGE_FORMATS)}'
            )

        # Reset file pointer to original position for subsequent operations
        image_file.seek(current_pos)

    except ValidationError:
        # Re-raise ValidationErrors as-is
        raise
    except Exception as e:
        # Catch any PIL errors (IOError, SyntaxError, etc.)
        raise ValidationError(
            f'Invalid or corrupted image file: {str(e)}'
        )


class ValidatedImageField(models.ImageField):
    """
    ImageField that validates images before writing to storage.

    This prevents corrupted or invalid images from being saved to disk/S3/etc.
    Validation happens in memory before the file is written to storage.
    """

    def pre_save(self, model_instance, add):
        """
        Validate the image before saving to storage.

        This is called before the file is written to the storage backend.
        """
        file = super().pre_save(model_instance, add)

        # If a new file was uploaded, validate it
        if file and hasattr(file, 'file'):
            # file.file is the actual file object (ContentFile, UploadedFile, etc.)
            validate_image_content(file.file)

        return file
