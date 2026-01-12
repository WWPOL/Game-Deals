from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.utils import timezone
from django.utils.text import slugify


# Default theme colors
DEFAULT_FOREGROUND_COLOR = '#ffffff'
DEFAULT_BACKGROUND_COLOR = '#3b82f6'
DEFAULT_PALETTE = [
    {'background': '#3b82f6', 'foreground': '#ffffff', 'weight': 0.5},
    {'background': '#1e40af', 'foreground': '#ffffff', 'weight': 0.5},
]


class DealQuerySet(models.QuerySet):
    """Custom queryset for Deal model"""

    def active(self, user=None):
        """
        Get active (non-expired) published deals.

        Args:
            user: Request user to determine permissions (optional, unused but kept for compatibility)

        Returns:
            QuerySet of active published deals ordered by newest first
        """
        now = timezone.now()
        queryset = self.filter(expires__gt=now, status='published')

        return queryset.prefetch_related('color_palette').order_by('-created_at')


class Deal(models.Model):
    """Game deal model"""

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PUBLISHED = 'published', 'Published'

    # Custom manager
    objects = DealQuerySet.as_manager()

    name = models.CharField(max_length=255, help_text="Game title")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        help_text="Deal status"
    )
    slug = models.CharField(
        max_length=255,
        unique=True,
        blank=True,
        help_text="URL-friendly name with format: year/month/slug (auto-generated)"
    )
    original_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Original price before discount (optional)"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Discounted price (0 for free)"
    )
    expires = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Deal expiration date (required when published)"
    )
    image = models.ImageField(
        upload_to='game_images/%Y/%m/',
        null=True,
        blank=True,
        help_text="Game image (required when published)"
    )
    image_attribution = models.TextField(
        null=True,
        blank=True,
        help_text="Source URL or text for image attribution (optional)"
    )
    auto_extract_palette = models.BooleanField(
        default=True,
        help_text="Automatically extract color palette when image changes"
    )
    link = models.URLField(
        max_length=2048,
        null=True,
        blank=True,
        help_text="Store URL to purchase (required when published)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['expires']),
        ]

    def __str__(self):
        price_str = "FREE" if self.price == 0 else f"${self.price}"
        return f"{self.name} ({price_str})"

    @property
    def is_active(self):
        """Check if deal is still active (not expired)"""
        if not self.expires:
            return False
        return self.expires > timezone.now()

    @property
    def primary_foreground_color(self):
        """Get foreground color from most prominent palette entry (highest weight)"""
        first_entry = self.color_palette.order_by('-weight').first()
        return first_entry.foreground_color if first_entry else DEFAULT_FOREGROUND_COLOR

    def has_notification_sent(self, channel):
        """
        Check if notification was successfully sent for a specific channel.

        Args:
            channel: NotificationChannel instance or ID

        Returns:
            bool: True if a successful notification log exists
        """
        channel_id = channel.id if hasattr(channel, 'id') else channel
        return self.notification_logs.filter(
            channel_id=channel_id,
            status='success'
        ).exists()

    def extract_and_save_colors(self):
        """
        Extract colors from image and replace existing palette.

        Works with both local filesystem and cloud storage (S3).

        Returns:
            int: Number of colors extracted
        """
        from .services.color_extractor import extract_colors_from_django_file

        if not self.image:
            return 0

        palette_entries = extract_colors_from_django_file(self.image)

        # Clear existing palette and create new entries
        self.color_palette.all().delete()
        for entry in palette_entries:
            entry.deal = self
            entry.save()

        return len(palette_entries)

    def clean(self):
        """Validate that required fields are present when publishing"""
        super().clean()
        if self.status == self.Status.PUBLISHED:
            errors = {}
            if self.price is None:
                errors['price'] = 'Price is required when publishing'
            if not self.expires:
                errors['expires'] = 'Expiration date is required when publishing'
            if not self.image:
                errors['image'] = 'Image is required when publishing'
            if not self.link:
                errors['link'] = 'Store link is required when publishing'

            # Check for at least one color palette entry (only if deal exists in DB)
            if self.pk and not self.color_palette.exists():
                errors['color_palette'] = 'At least one color palette entry is required when publishing'

            if errors:
                raise ValidationError(errors)

    def save(self, *args, **kwargs):
        """Auto-generate slug from name if not provided, and auto-extract colors if image changed"""
        # Track if image changed for auto-extraction
        image_changed = False

        if self.pk:
            # Existing object - check if image changed
            try:
                old_obj = Deal.objects.get(pk=self.pk)
                if old_obj.image != self.image and self.image:
                    image_changed = True
            except Deal.DoesNotExist:
                pass
        else:
            # New object - check if image is set
            if self.image:
                image_changed = True

        if not self.slug:
            # Generate slug with year/month/name format
            now = timezone.now()
            year = now.year
            month = f"{now.month:02d}"  # Zero-padded month
            name_slug = slugify(self.name)
            self.slug = f"{year}/{month}/{name_slug}"

            # Ensure uniqueness
            original_slug = self.slug
            counter = 1
            while Deal.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1

        super().save(*args, **kwargs)

        # Auto-extract colors if image changed and auto_extract is enabled
        if image_changed and self.auto_extract_palette:
            self.extract_and_save_colors()
        elif not self.color_palette.exists():
            # Ensure at least one ColorPalette entry exists (create default if none)
            for palette_entry in DEFAULT_PALETTE:
                self.color_palette.create(
                    background_color=palette_entry['background'],
                    foreground_color=palette_entry['foreground'],
                    weight=palette_entry['weight']
                )

    def get_absolute_url(self):
        """Get the canonical URL for this deal"""
        from django.urls import reverse
        return reverse('deals:detail', kwargs={'slug': self.slug})


class ColorPalette(models.Model):
    """Individual color from a deal's palette with foreground/background pairing"""

    deal = models.ForeignKey(
        'Deal',
        on_delete=models.CASCADE,
        related_name='color_palette'
    )

    # Main palette color (what's currently in palette_colors JSON)
    background_color = models.CharField(
        max_length=7,
        help_text="Main palette color (e.g., #3B82F6)"
    )

    # Contrasting text color for this background
    foreground_color = models.CharField(
        max_length=7,
        help_text="Contrasting text color for accessibility (e.g., #FFFFFF)"
    )

    # Prominence weight (any positive number, typically sums to 1.0 per deal)
    weight = models.FloatField(
        validators=[MinValueValidator(0.0)],
        help_text="Relative prominence (any positive number, higher = more dominant)"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['deal', '-weight']  # Order by weight descending within each deal
        indexes = [
            models.Index(fields=['deal', '-weight']),
            models.Index(fields=['background_color']),  # For color analytics
        ]

    def __str__(self):
        return f"{self.deal.name}: {self.background_color} (weight: {self.weight:.3f})"


class NotificationChannel(models.Model):
    """Base notification channel configuration for sending deal notifications"""

    class ChannelType(models.TextChoices):
        DISCORD_WEBHOOK = 'discord_webhook', 'Discord Webhook'
        # Future: DISCORD_BOT = 'discord_bot', 'Discord Bot'
        # Future: EMAIL = 'email', 'Email'
        # Future: PUSH = 'push', 'Web Push'

    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Human-readable channel name (e.g., 'Main Discord', 'Test Channel')"
    )
    type = models.CharField(
        choices=ChannelType.choices,
        default=ChannelType.DISCORD_WEBHOOK,
        help_text="Type of notification channel"
    )
    auto_notify = models.BooleanField(
        default=True,
        help_text="Automatically send notifications when new deals are published"
    )
    active = models.BooleanField(
        default=True,
        help_text="Enable/disable this channel without deleting it"
    )
    is_test_channel = models.BooleanField(
        default=False,
        help_text="Test channels can receive notifications for draft deals (for testing purposes)"
    )
    message_preamble = models.TextField(
        blank=True,
        default='',
        help_text="Optional text message to send before the embed (e.g., '@everyone New deal!')"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['type', 'active']),
            models.Index(fields=['auto_notify', 'active']),
        ]

    def __str__(self):
        status = "✓" if self.active else "✗"
        auto = "🔔" if self.auto_notify else ""
        return f"{status} {self.name} ({self.get_type_display()}) {auto}"

    def get_config(self):
        """Get the type-specific configuration object"""
        if self.type == self.ChannelType.DISCORD_WEBHOOK:
            return getattr(self, 'discord_webhook_config', None)
        return None


class DiscordWebhookConfig(models.Model):
    """Discord webhook-specific configuration (1:1 with NotificationChannel)"""

    channel = models.OneToOneField(
        NotificationChannel,
        on_delete=models.CASCADE,
        related_name='discord_webhook_config',
        help_text="Parent notification channel"
    )
    webhook_url = models.URLField(
        max_length=2048,
        help_text="Discord webhook URL (from Server Settings -> Integrations -> Webhooks)"
    )
    username = models.CharField(
        max_length=80,
        default="Game Deals Bot",
        help_text="Bot username displayed in Discord (max 80 characters)"
    )
    avatar = models.ImageField(
        upload_to='discord_avatars/',
        null=True,
        blank=True,
        help_text="Bot avatar image (optional, will be uploaded and URL used)"
    )

    class Meta:
        verbose_name = "Discord Webhook Configuration"
        verbose_name_plural = "Discord Webhook Configurations"

    def __str__(self):
        return f"Discord config for {self.channel.name}"

    def clean(self):
        """Validate webhook URL format"""
        super().clean()
        if not self.webhook_url.startswith('https://discord.com/api/webhooks/'):
            raise ValidationError({
                'webhook_url': 'Discord webhook URL must start with https://discord.com/api/webhooks/'
            })


class NotificationLog(models.Model):
    """Log of notifications sent to channels for deals"""

    class Status(models.TextChoices):
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        PENDING = 'pending', 'Pending'

    deal = models.ForeignKey(
        'Deal',
        on_delete=models.CASCADE,
        related_name='notification_logs',
        help_text="Deal that was notified"
    )
    channel = models.ForeignKey(
        'NotificationChannel',
        on_delete=models.CASCADE,
        related_name='notification_logs',
        help_text="Channel the notification was sent to"
    )
    status = models.CharField(
        choices=Status.choices,
        default=Status.PENDING,
        help_text="Status of the notification"
    )
    status_message = models.TextField(
        blank=True,
        null=True,
        help_text="Additional details about the notification status (error message, success info, etc.)"
    )
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['deal', 'channel']),
            models.Index(fields=['channel', '-sent_at']),
            models.Index(fields=['status', '-sent_at']),
        ]
        # Prevent duplicate successful notifications for same deal+channel
        constraints = [
            models.UniqueConstraint(
                fields=['deal', 'channel'],
                condition=models.Q(status='success'),
                name='unique_successful_notification'
            )
        ]

    def __str__(self):
        return f"{self.deal.name} → {self.channel.name} ({self.get_status_display()})"
