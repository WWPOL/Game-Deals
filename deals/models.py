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


class Deal(models.Model):
    """Game deal model"""

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PUBLISHED = 'published', 'Published'

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
    auto_extract_palette = models.BooleanField(
        default=True,
        help_text="Automatically extract color palette when image changes"
    )
    link = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Store URL to purchase (required when published)"
    )

    # Notification tracking - JSON field to track which channels have been notified
    # Structure: {"main": true, "test": false, ...}
    notifications_sent = models.JSONField(
        default=dict,
        blank=True,
        help_text="Track notification status per channel"
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

    def has_notification_sent(self, channel='main'):
        """Check if notification was sent for a specific channel"""
        return self.notifications_sent.get(channel, False)

    def mark_notification_sent(self, channel='main'):
        """Mark notification as sent for a specific channel"""
        self.notifications_sent[channel] = True
        self.save(update_fields=['notifications_sent'])

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
        """Auto-generate slug from name if not provided"""
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

        # Ensure at least one ColorPalette entry exists (create default if none)
        if not self.color_palette.exists():
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


class PushSubscription(models.Model):
    """Web push notification subscription"""
    endpoint = models.URLField(unique=True, max_length=500)
    auth = models.CharField(max_length=255, help_text="Auth key for push")
    p256dh = models.CharField(max_length=255, help_text="P256dh key for push")
    channel = models.CharField(
        max_length=50,
        default='main',
        db_index=True,
        help_text="Notification channel (main, test, etc.)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['channel', '-created_at']),
        ]

    def __str__(self):
        return f"Subscription ({self.channel}) - {self.endpoint[:50]}..."
