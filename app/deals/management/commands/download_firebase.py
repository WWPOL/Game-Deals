"""Django management command to download deals from Firebase Firestore to JSON"""
import argparse
import json
import logging

from google.cloud import firestore

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Download deals from Firebase Firestore to JSON file'

    def create_parser(self, prog_name, subcommand, **kwargs):
        kwargs['formatter_class'] = argparse.RawTextHelpFormatter
        parser = super().create_parser(prog_name, subcommand, **kwargs)
        parser.epilog = """
FIRESTORE COLLECTION:

The command will read all documents from the 'deals' collection in Firestore.
Make sure your Firestore database has a collection named 'deals'.

OUTPUT FORMAT:

The command outputs JSON in this format:
    {
      "deals": {
        "deal-id-1": {"name": "...", "price": 19.99, ...},
        "deal-id-2": {"name": "...", "price": 9.99, ...}
      }
    }

EXAMPLES:

    # Download to deals-export.json
    $ export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
    $ python manage.py download_firebase deals-export.json

    # Specify a different Firebase project
    $ python manage.py download_firebase deals-export.json --project-id your-project-id

    # Download from a different collection
    $ python manage.py download_firebase deals-export.json --collection my-deals
        """
        return parser

    def add_arguments(self, parser):
        parser.add_argument(
            'output_file',
            type=str,
            help='Path to output JSON file'
        )
        parser.add_argument(
            '--project-id',
            type=str,
            help='Firebase project ID',
            default=None
        )
        parser.add_argument(
            '--collection',
            type=str,
            default='deals',
            help='Firestore collection name (default: deals)'
        )

    def handle(self, *args, **options):
        output_file = options['output_file']
        project_id = options['project_id']
        collection_name = options['collection']

        db = firestore.Client(project=project_id)
        deals_ref = db.collection(collection_name)

        # Read all documents from collection
        logger.info(f"Reading documents from '{collection_name}' collection...")

        deals = {}

        count = 0
        for doc in deals_ref.stream():
            deal_data = doc.to_dict()

            # Convert Firestore timestamps to ISO strings for JSON serialization
            for key, value in deal_data.items():
                if hasattr(value, 'timestamp'):  # Firestore timestamp
                    deal_data[key] = value.isoformat()

            deals[doc.id] = deal_data
            count += 1

        logger.info(f"Found {count} deals")

        # Write to JSON file
        logger.info(f"Writing to {output_file}...")
        with open(output_file, 'w') as f:
            json.dump({'deals': deals}, f, indent=2, default=str)

        logger.info(f"✓ Successfully exported {count} deals to {output_file}")
        logger.info(f"Next step: python manage.py migrate_firebase {output_file}")
