from django.db import models
from django.utils import timezone


class Deal(models.Model):
    """Game deal model"""
    name = models.CharField(max_length=255, help_text="Game title")
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Discounted price (null if free)"
    )
    is_free = models.BooleanField(default=False, help_text="Is the game free?")
    expires = models.DateTimeField(help_text="Deal expiration date")
    image = models.URLField(max_length=500, help_text="Game image URL")
    link = models.URLField(max_length=500, help_text="Store URL to purchase")

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
        price_str = "FREE" if self.is_free else f"${self.price}"
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
