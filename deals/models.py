from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.utils import timezone
from django.utils.text import slugify


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
    slug = models.SlugField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
        help_text="URL-friendly name (auto-generated)"
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
    image = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Game image URL (required when published)"
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
        return self.expires > timezone.now()

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
            if not self.slug:
                errors['slug'] = 'Slug is required when publishing'
            if self.price is None:
                errors['price'] = 'Price is required when publishing'
            if not self.expires:
                errors['expires'] = 'Expiration date is required when publishing'
            if not self.image:
                errors['image'] = 'Image is required when publishing'
            if not self.link:
                errors['link'] = 'Store link is required when publishing'
            if errors:
                raise ValidationError(errors)

    def save(self, *args, **kwargs):
        """Auto-generate slug from name if not provided and status is published"""
        if self.status == self.Status.PUBLISHED and not self.slug:
            self.slug = slugify(self.name)
            # Ensure uniqueness
            original_slug = self.slug
            counter = 1
            while Deal.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        """Get the canonical URL for this deal"""
        from django.urls import reverse
        return reverse('deals:detail', kwargs={'slug': self.slug})


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
