import logging

from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.sites.models import Site
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Ensures the Site object matches the SITE_URL setting"

    def handle(self, *args, **options):
        # Get the site ID from settings (defaults to 1 if not set)
        site_id = getattr(settings, "SITE_ID", 1)

        # Get SITE_URL from settings
        site_url = settings.SITE_URL

        # Parse the domain from the SITE_URL
        parsed_url = urlparse(site_url)
        domain = parsed_url.netloc

        # Get or create the site object
        site = Site.objects.filter(pk=site_id).first()
        if site is None:
            raise ValueError(
                "Site not created yet (you probably need to run initial migrations)"
            )

        # Update the site if it already existed but domain differs
        if site.domain != domain or site.name != domain:
            old_domain = site.domain
            old_name = site.name

            site.domain = domain
            site.name = domain
            site.save()

            logger.info(
                "Successfully update Site object (ID=%(site_id)s): domain changed from '%(old_domain)s' to '%(domain)s', name changed from '%(old_name)s' to '%(domain)s'",
                {
                    "site_id": site_id,
                    "old_domain": old_domain,
                    "old_name": old_name,
                    "domain": domain,
                },
            )
        else:
            logger.info(
                "Site object (ID= %(site_id)s) already has the correct domain and name: '%(domain)s'",
                {
                    "site_id": site_id,
                    "domain": domain,
                },
            )
