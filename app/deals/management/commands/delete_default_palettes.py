"""Django management command to delete default color palettes from deals"""

import logging

from django.core.management.base import BaseCommand
from django.db.models import Count

from deals.models import ColorPalette

logger = logging.getLogger(__name__)

# The default palette colors that were auto-assigned when extraction failed
DEFAULT_BG_1 = "#3b82f6"
DEFAULT_BG_2 = "#1e40af"


class Command(BaseCommand):
    help = "Delete default color palettes (blue fallback colors) from deals"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview which deals would have palettes deleted without actually deleting",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Find deals that have exactly 2 palette entries matching the defaults
        # A default palette has exactly: #3b82f6 (weight 0.5) and #1e40af (weight 0.5)
        default_entries = ColorPalette.objects.filter(
            background_color__in=[DEFAULT_BG_1, DEFAULT_BG_2],
            weight=0.5,
        )

        # Group by deal and only target deals where ALL entries are defaults
        # (exactly 2 entries, both matching)
        deal_ids_with_defaults = (
            default_entries.values("deal_id")
            .annotate(default_count=Count("id"))
            .filter(default_count=2)
            .values_list("deal_id", flat=True)
        )

        # Verify these deals have exactly 2 palette entries total (no real colors mixed in)
        confirmed_deal_ids = []
        for deal_id in deal_ids_with_defaults:
            total = ColorPalette.objects.filter(deal_id=deal_id).count()
            if total == 2:
                confirmed_deal_ids.append(deal_id)

        if not confirmed_deal_ids:
            self.stdout.write("No deals found with default palettes.")
            return

        entries_to_delete = ColorPalette.objects.filter(deal_id__in=confirmed_deal_ids)

        if dry_run:
            self.stdout.write(f"[DRY RUN] Would delete default palettes from {len(confirmed_deal_ids)} deals:")
            for entry in entries_to_delete.select_related("deal").order_by("deal__name"):
                self.stdout.write(f"  - {entry.deal.name}: {entry.background_color} ({entry.weight})")
        else:
            count = entries_to_delete.count()
            entries_to_delete.delete()
            self.stdout.write(f"Deleted {count} default palette entries from {len(confirmed_deal_ids)} deals.")
