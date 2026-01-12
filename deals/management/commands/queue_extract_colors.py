"""Django management command to queue color extraction tasks for deals"""
import logging
from django.core.management.base import BaseCommand
from celery import current_app

from deals.models import Deal
from deals.tasks import extract_colors_from_deal_image

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Queue Celery tasks to extract color palettes from deal images'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Queue tasks even if colors already extracted (re-extract)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview which deals would have tasks queued without actually queuing'
        )

    def handle(self, *args, **options):
        force = options['force']
        dry_run = options['dry_run']

        # Find deals that need color extraction
        if force:
            # Force mode: queue for all deals with images
            deals = Deal.objects.exclude(image='')
        else:
            # Normal mode: only queue for deals with images but no color palette
            deals = Deal.objects.exclude(image='').filter(color_palette__isnull=True)

        total = deals.count()

        if total == 0:
            logger.warning('No deals found that need color extraction')
            return

        # Get currently queued/running tasks using celery inspect
        inspect = current_app.control.inspect()

        # Get all active (running) tasks
        active_tasks = inspect.active() or {}
        # Get all reserved (queued but not started) tasks
        reserved_tasks = inspect.reserved() or {}

        # Combine all tasks from all workers
        all_tasks = []
        for worker_tasks in active_tasks.values():
            all_tasks.extend(worker_tasks)
        for worker_tasks in reserved_tasks.values():
            all_tasks.extend(worker_tasks)

        # Extract deal IDs from queued/running color extraction tasks
        queued_deal_ids = set()
        task_name = 'deals.tasks.extract_colors_from_deal_image'

        for task in all_tasks:
            if task.get('name') == task_name:
                # Task args are in the 'args' field as a list
                task_args = task.get('args', [])
                if task_args and len(task_args) > 0:
                    queued_deal_ids.add(task_args[0])

        queued = 0
        skipped = 0

        for deal in deals:
            # Check if already has pending task
            if deal.id in queued_deal_ids:
                logger.debug(f"Skipping deal {deal.id} '{deal.name}' - already has queued/running task")
                skipped += 1
                continue

            if dry_run:
                logger.info(f"[DRY RUN] Would queue color extraction for: {deal.name}")
                queued += 1
                continue

            # Queue the task
            result = extract_colors_from_deal_image.delay(deal.id)
            logger.info(f"Queued color extraction for '{deal.name}' (task: {result.id})")
            queued += 1

        # Summary
        logger.info("=" * 50)
        logger.info("Color extraction queue summary:")
        logger.info(f"  Total deals found: {total}")
        logger.info(f"  Queued: {queued}")
        if skipped > 0:
            logger.warning(f"  Skipped (already queued): {skipped}")
        logger.info("=" * 50)
