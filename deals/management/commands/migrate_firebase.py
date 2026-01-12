"""Django management command to migrate deals from Firebase JSON export to Django"""
import argparse
import json
import logging
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Optional, Any

from django.core.management.base import BaseCommand
from django.utils.text import slugify
from pydantic import BaseModel, Field, BeforeValidator
from typing_extensions import Annotated

from deals.models import Deal

logger = logging.getLogger(__name__)


def parse_firebase_timestamp(value: Any) -> Optional[datetime]:
    """Parse Firebase timestamp to Python datetime

    Handles multiple Firebase timestamp formats:
    - Firestore Timestamp object: {"_seconds": 1234567890, "_nanoseconds": 0}
    - ISO string: "2024-12-31T23:59:59Z"
    - Unix timestamp: 1234567890
    """
    if not value:
        return None

    # Firestore Timestamp object
    if isinstance(value, dict) and '_seconds' in value:
        return datetime.fromtimestamp(value['_seconds'])

    # ISO string
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace('Z', '+00:00'))

    # Unix timestamp
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value)

    # Already a datetime
    if isinstance(value, datetime):
        return value

    return None


def parse_price(value: Any) -> Optional[Decimal]:
    """Parse price value to Decimal

    Handles multiple formats:
    - Empty string: "" -> None
    - String: "19.99" -> Decimal('19.99')
    - Number: 19.99 or 19 -> Decimal('19.99')
    """
    # Treat empty/falsy values as None (except 0)
    if not value and value != 0:
        return None

    # Already a Decimal
    if isinstance(value, Decimal):
        return value

    # Number or string
    if isinstance(value, (int, float, str)):
        try:
            return Decimal(str(value))
        except Exception:
            return None

    return None


# Custom Pydantic type for Firebase timestamps
FirebaseTimestamp = Annotated[Optional[datetime], BeforeValidator(parse_firebase_timestamp)]

# Custom Pydantic type for price values
FirebasePrice = Annotated[Optional[Decimal], BeforeValidator(parse_price)]


class FirebaseDeal(BaseModel):
    """Firebase Firestore deal document structure"""
    id: str = Field(default='', description="Document ID from Firestore")
    name: str
    price: FirebasePrice = None
    is_free: bool = False
    expires: FirebaseTimestamp
    image: str  # URL to image
    link: str  # Store URL
    created_at: FirebaseTimestamp = None
    updated_at: FirebaseTimestamp = None
    notifications_sent: dict = Field(default_factory=dict)


@dataclass
class MappedDealData:
    """Typed data for creating Django Deal model"""
    name: str
    status: str
    slug: str
    price: Decimal
    expires: Optional[datetime]
    link: str
    image_attribution: str
    auto_extract_palette: bool


class Command(BaseCommand):
    help = 'Migrate deals from Firebase JSON export to Django'

    def create_parser(self, prog_name, subcommand, **kwargs):
        kwargs['formatter_class'] = argparse.RawTextHelpFormatter # so multi line help text works
        parser = super().create_parser(prog_name, subcommand, **kwargs)
        parser.epilog = """
WORKFLOW:

Step 1: Download from Firebase
    First, use the download_firebase command to export your Firestore data to JSON:

    $ export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
    $ python manage.py download_firebase deals-export.json

Step 2: Migrate to Django
    Then use this command to migrate the JSON data to Django:

    $ python manage.py migrate_firebase deals-export.json

EXPECTED JSON FORMAT:

Format 1 (Firestore export with nested object):
    {
      "deals": {
        "deal-id-1": {"name": "...", "price": 19.99, ...},
        "deal-id-2": {"name": "...", "price": 9.99, ...}
      }
    }

Format 2 (Array of deals):
    [
      {"id": "deal-id-1", "name": "...", "price": 19.99, ...},
      {"id": "deal-id-2", "name": "...", "price": 9.99, ...}
    ]

WHAT THIS COMMAND DOES:

- Parses and validates JSON using Pydantic
- Maps Firebase fields to Django Deal model
- Creates Deal records in the database
- Stores Firebase image URLs in image_attribution field
- Generates unique slugs in year/month/name format
- Converts is_free boolean to price=0 decimal

NOTE: This command only creates database records. To download images and extract
colors, run these commands after migration:
    $ python manage.py queue_download_images
    $ python manage.py queue_extract_colors

EXAMPLES:

    # Dry run to preview what will be migrated
    $ python manage.py migrate_firebase deals-export.json --dry-run

    # Full migration (creates database records)
    $ python manage.py migrate_firebase deals-export.json
        """
        return parser

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='Path to Firebase export JSON')
        parser.add_argument('--dry-run', action='store_true', help='Preview without saving')

    def handle(self, *args, **options):
        json_file = options['json_file']
        dry_run = options['dry_run']

        # Parse Firebase export with Pydantic validation
        firebase_deals = self.parse_firestore_export(json_file)
        total = len(firebase_deals)

        logger.info(f"Found {total} deals to migrate")

        migrated = 0
        errors = 0

        for index, fb_deal in enumerate(firebase_deals, 1):
            try:
                # Map fields with type safety
                mapped_data = self.map_firebase_to_django(fb_deal)

                progress_pct = (index / total * 100)
                progress_str = f"[{index}/{total}] ({progress_pct:.1f}%)"

                if dry_run:
                    logger.info(f"{progress_str} [DRY RUN] Would create: {mapped_data.name}")
                    continue

                # Create deal from mapped data
                deal = Deal(
                    name=mapped_data.name,
                    status=mapped_data.status,
                    slug=mapped_data.slug,
                    price=mapped_data.price,
                    expires=mapped_data.expires,
                    link=mapped_data.link,
                    image_attribution=mapped_data.image_attribution,
                    auto_extract_palette=mapped_data.auto_extract_palette,
                )
                deal.save()

                logger.info(f"{progress_str} ✓ Migrated: {deal.name}")
                migrated += 1

            except Exception as e:
                progress_pct = (index / total * 100)
                progress_str = f"[{index}/{total}] ({progress_pct:.1f}%)"
                logger.error(f"{progress_str} ✗ Error migrating {fb_deal.name}: {e}")
                errors += 1

        # Final summary
        logger.info("=" * 50)
        logger.info("Migration complete!")
        logger.info(f"  Total: {total}")
        logger.info(f"  Migrated: {migrated}")
        if errors > 0:
            logger.error(f"  Errors: {errors}")
        logger.info("=" * 50)

    def parse_firestore_export(self, json_file_path: str) -> list[FirebaseDeal]:
        """Parse Firebase Firestore export JSON with Pydantic validation"""
        with open(json_file_path, 'r') as f:
            data = json.load(f)

        deals = []

        # Firestore export format: {"deals": {"id": {...}}}
        if isinstance(data, dict) and 'deals' in data:
            for deal_id, deal_data in data['deals'].items():
                deal_data['id'] = deal_id
                deals.append(FirebaseDeal(**deal_data))
        # Array format: [{...}, {...}]
        elif isinstance(data, list):
            deals = [FirebaseDeal(**d) for d in data]

        return deals

    def map_firebase_to_django(self, firebase_deal: FirebaseDeal) -> MappedDealData:
        """Map Firebase deal structure to Django Deal model fields"""

        # Handle price (is_free → price=0)
        if firebase_deal.is_free:
            price = Decimal('0')
        elif firebase_deal.price is not None:
            price = firebase_deal.price
        else:
            price = Decimal('0')

        # Generate slug from name and created_at
        created_at = firebase_deal.created_at or datetime.now()
        slug = self.generate_slug(firebase_deal.name, created_at)

        return MappedDealData(
            name=firebase_deal.name,
            status='published',  # All migrated deals are published
            slug=slug,
            price=price,
            expires=firebase_deal.expires,
            link=firebase_deal.link,
            image_attribution=firebase_deal.image,  # Store original URL
            auto_extract_palette=True,
        )

    def generate_slug(self, name: str, created_at: datetime) -> str:
        """Generate unique slug in year/month/name format"""
        base_slug = slugify(name)
        year = created_at.year
        month = created_at.month

        slug = f"{year}/{month:02d}/{base_slug}"

        # Ensure uniqueness
        counter = 1
        unique_slug = slug
        while Deal.objects.filter(slug=unique_slug).exists():
            unique_slug = f"{slug}-{counter}"
            counter += 1

        return unique_slug
