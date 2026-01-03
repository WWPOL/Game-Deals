"""
Discord notification service for sending game deal embeds to Discord webhooks.
"""

import requests
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, HttpUrl
from django.conf import settings
from django.utils import timezone
from decimal import Decimal

# Import models for type hints - no circular dependency since this is a service
from deals.models import Deal, NotificationChannel, DiscordWebhookConfig
from deals.utils import build_site_url


class DiscordNotificationError(Exception):
    """Exception raised when Discord notification fails"""
    pass


class DiscordEmbedImage(BaseModel):
    """Discord embed image"""
    url: str


class DiscordEmbedFooter(BaseModel):
    """Discord embed footer"""
    text: str
    icon_url: Optional[str] = None


class DiscordEmbed(BaseModel):
    """Discord embed object following Discord API specification"""
    title: str
    description: str
    url: Optional[str] = None
    color: Optional[int] = None
    timestamp: Optional[str] = None
    footer: Optional[DiscordEmbedFooter] = None
    image: Optional[DiscordEmbedImage] = None


class DiscordWebhookPayload(BaseModel):
    """Discord webhook payload"""
    embeds: list[DiscordEmbed]
    username: Optional[str] = None
    avatar_url: Optional[str] = None


def build_deal_embed(deal: Deal) -> DiscordEmbed:
    """
    Build a Discord embed object from a Deal instance.

    Args:
        deal: Deal model instance

    Returns:
        DiscordEmbed: Pydantic model for Discord embed
    """
    # Get the most prominent color for the embed color
    primary_color = None
    first_palette_entry = deal.color_palette.order_by('-weight').first()
    if first_palette_entry:
        # Convert hex color to decimal (Discord expects integer color)
        hex_color = first_palette_entry.background_color.lstrip('#')
        primary_color = int(hex_color, 16)

    # Build description with pricing info
    description_parts = []

    # Price information
    if deal.price == 0:
        description_parts.append("**FREE** 🎁")
    else:
        if deal.original_price and deal.original_price > deal.price:
            discount_percent = ((deal.original_price - deal.price) / deal.original_price) * 100
            description_parts.append(
                f"~~${deal.original_price}~~ **${deal.price}** "
                f"({discount_percent:.0f}% OFF) 💸"
            )
        else:
            description_parts.append(f"**${deal.price}** 💰")

    # Expiration info
    if deal.expires:
        expires_str = deal.expires.strftime("%B %d, %Y at %I:%M %p UTC")
        time_remaining = deal.expires - timezone.now()

        if time_remaining.total_seconds() > 0:
            days = time_remaining.days
            hours = time_remaining.seconds // 3600

            if days > 0:
                time_str = f"{days} day{'s' if days != 1 else ''}"
            else:
                time_str = f"{hours} hour{'s' if hours != 1 else ''}"

            description_parts.append(f"\n⏰ Expires in **{time_str}**")
            description_parts.append(f"\n📅 {expires_str}")

    # Build the embed using Pydantic model
    # Build absolute URL for image (Discord needs full URLs)
    image_embed = None
    if deal.image:
        image_embed = DiscordEmbedImage(url=build_site_url(deal.image.url))

    return DiscordEmbed(
        title=deal.name,
        url=deal.link if deal.link else None,
        color=primary_color,
        description="\n".join(description_parts),
        timestamp=timezone.now().isoformat(),
        image=image_embed,
        footer=DiscordEmbedFooter(text="Game Deals")
    )


def send_discord_notification(deal: Deal, channel: NotificationChannel) -> bool:
    """
    Send a Discord notification for a game deal to a specific channel.

    Args:
        deal: Deal model instance
        channel: NotificationChannel instance

    Returns:
        bool: True if successful, False otherwise

    Raises:
        DiscordNotificationError: If the notification fails
    """
    if not channel or not channel.active:
        raise DiscordNotificationError("Channel is not active")

    if channel.type != 'discord_webhook':
        raise DiscordNotificationError(f"Channel type '{channel.type}' is not supported by Discord notifier")

    # Get Discord-specific configuration
    try:
        config = channel.discord_webhook_config
    except DiscordWebhookConfig.DoesNotExist:
        raise DiscordNotificationError("Discord webhook configuration not found for this channel")

    webhook_url = config.webhook_url
    if not webhook_url:
        raise DiscordNotificationError("Discord webhook URL not configured for this channel")

    # Build the embed
    embed = build_deal_embed(deal)

    # Build absolute URL for avatar (Discord needs full URLs)
    avatar_url = None
    if config.avatar:
        avatar_url = build_site_url(config.avatar.url)

    # Prepare the payload with config-specific settings
    payload = DiscordWebhookPayload(
        embeds=[embed],
        username=config.username,
        avatar_url=avatar_url
    )

    # Send the request
    try:
        response = requests.post(
            webhook_url,
            json=payload.model_dump(),
            timeout=10
        )

        # Check response
        if response.status_code == 204:
            # Success - Discord webhooks return 204 No Content on success
            return True
        elif response.status_code == 429:
            # Rate limited
            raise DiscordNotificationError(
                f"Discord rate limit exceeded. Retry after: {response.headers.get('Retry-After', 'unknown')}"
            )
        else:
            # Other error
            raise DiscordNotificationError(
                f"Discord webhook failed with status {response.status_code}: {response.text}"
            )

    except requests.exceptions.RequestException as e:
        raise DiscordNotificationError(f"Failed to send Discord notification: {str(e)}")
