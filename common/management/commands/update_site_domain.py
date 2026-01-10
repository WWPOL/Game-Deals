from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.sites.models import Site
from urllib.parse import urlparse


class Command(BaseCommand):
    help = 'Ensures the Site object matches the SITE_URL setting'

    def handle(self, *args, **options):
        # Get the site ID from settings (defaults to 1 if not set)
        site_id = getattr(settings, 'SITE_ID', 1)
        
        # Get SITE_URL from settings
        site_url = settings.SITE_URL
        
        # Parse the domain from the SITE_URL
        parsed_url = urlparse(site_url)
        domain = parsed_url.netloc
        
        # Get or create the site object
        site, created = Site.objects.get_or_create(
            pk=site_id,
            defaults={
                'domain': domain,
                'name': domain,  # Use domain as name by default
            }
        )
        
        # Update the site if it already existed but domain differs
        if not created and (site.domain != domain or site.name != domain):
            old_domain = site.domain
            old_name = site.name
            site.domain = domain
            site.name = domain
            site.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully updated Site object (ID={site_id}): '
                    f'domain changed from "{old_domain}" to "{domain}", '
                    f'name changed from "{old_name}" to "{domain}"'
                )
            )
        elif created:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created new Site object (ID={site_id}) '
                    f'with domain="{domain}" and name="{domain}"'
                )
            )
        else:
            self.stdout.write(
                self.style.NOTICE(
                    f'Site object (ID={site_id}) already has the correct domain and name: "{domain}"'
                )
            )