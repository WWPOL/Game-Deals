"""Django management command to download deals from Firebase Firestore to JSON"""
import argparse
import json
import logging

import firebase_admin
from firebase_admin import credentials, firestore

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Download deals from Firebase Firestore to JSON file'

    def create_parser(self, prog_name, subcommand, **kwargs):
        kwargs['formatter_class'] = argparse.RawTextHelpFormatter
        parser = super().create_parser(prog_name, subcommand, **kwargs)
        parser.epilog = """
AUTHENTICATION:

This command uses Application Default Credentials (ADC) to authenticate with Firebase.
You need to authenticate before running this command.

Option 1: Service Account Key (Recommended)
    1. Download service account key from Firebase Console:
       Project Settings → Service Accounts → Generate New Private Key

    2. Set the environment variable:
       $ export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"

    3. Run the download command

Option 2: gcloud CLI (If you have gcloud installed)
    $ gcloud auth application-default login

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
            help='Firebase project ID (optional if using service account key)',
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

        # Initialize Firebase Admin SDK with Application Default Credentials
        logger.info("Initializing Firebase Admin SDK...")
        try:
            if project_id:
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred, {'projectId': project_id})
            else:
                # Use default project from service account key
                firebase_admin.initialize_app()
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
            logger.error("Make sure GOOGLE_APPLICATION_CREDENTIALS is set or run 'gcloud auth application-default login'")
            return

        # Get Firestore client
        db = firestore.client()

        # Read all documents from collection
        logger.info(f"Reading documents from '{collection_name}' collection...")
        try:
            docs = db.collection(collection_name).stream()
            deals = {}

            count = 0
            for doc in docs:
                deal_data = doc.to_dict()

                # Convert Firestore timestamps to ISO strings for JSON serialization
                for key, value in deal_data.items():
                    if hasattr(value, 'timestamp'):  # Firestore timestamp
                        deal_data[key] = value.isoformat()

                deals[doc.id] = deal_data
                count += 1

            logger.info(f"Found {count} deals")

        except Exception as e:
            logger.error(f"Failed to read from Firestore: {e}", exc_info=e)
            return

        # Write to JSON file
        logger.info(f"Writing to {output_file}...")
        try:
            with open(output_file, 'w') as f:
                json.dump({'deals': deals}, f, indent=2, default=str)

            logger.info(f"✓ Successfully exported {count} deals to {output_file}")
            logger.info(f"Next step: python manage.py migrate_firebase {output_file}")

        except Exception as e:
            logger.error(f"Failed to write JSON file: {e}")
            return
