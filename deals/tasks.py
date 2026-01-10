"""
Celery tasks for the deals app.
"""

from django.conf import settings
from django.db import transaction
import logging

from common.celery_utils import user_tracked_task
from deals.models import Deal, NotificationChannel, NotificationLog
from deals.services.discord_notifier import send_discord_notification, DiscordNotificationError
from deals.services.image_search import GoogleCustomSearchProvider, download_image_from_url

logger = logging.getLogger(__name__)


@user_tracked_task()
def send_discord_webhook(deal_id: int, channel_id: int) -> dict:
    """
    Send Discord webhook notification for a deal to a specific channel.

    Automatically tracks which user initiated the task via thread-local storage.

    Args:
        deal_id: ID of the Deal to send notification for
        channel_id: ID of the NotificationChannel to send to

    Returns:
        dict: Status information about the notification
    """
    try:
        deal = Deal.objects.prefetch_related('color_palette').get(pk=deal_id)
    except Deal.DoesNotExist:
        error_msg = f"Deal with ID {deal_id} not found"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

    try:
        channel = NotificationChannel.objects.select_related('discord_webhook_config').get(pk=channel_id)
    except NotificationChannel.DoesNotExist:
        error_msg = f"NotificationChannel with ID {channel_id} not found"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

    # Check if notification was already sent successfully
    if deal.has_notification_sent(channel):
        msg = f"Discord notification already sent for deal '{deal.name}' on channel '{channel.name}'"
        logger.info(msg)
        return {"success": False, "error": msg, "already_sent": True}

    # Create pending notification log
    log = NotificationLog.objects.create(
        deal=deal,
        channel=channel,
        status=NotificationLog.Status.PENDING
    )

    try:
        # Send the Discord notification
        send_discord_notification(deal, channel)

        # Mark as successful
        log.status = NotificationLog.Status.SUCCESS
        log.status_message = f"Notification sent successfully"
        log.save()

        msg = f"Discord notification sent successfully for deal '{deal.name}' on channel '{channel.name}'"
        logger.info(msg)
        return {"success": True, "message": msg, "log_id": log.id}

    except DiscordNotificationError as e:
        error_msg = f"Failed to send Discord notification: {str(e)}"
        log.status = NotificationLog.Status.FAILED
        log.status_message = error_msg
        log.save()
        logger.error(f"Deal '{deal.name}' to channel '{channel.name}': {error_msg}")
        return {"success": False, "error": error_msg, "log_id": log.id}
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        log.status = NotificationLog.Status.FAILED
        log.status_message = error_msg
        log.save()
        logger.exception(f"Deal '{deal.name}' to channel '{channel.name}': {error_msg}")
        return {"success": False, "error": error_msg, "log_id": log.id}


@user_tracked_task()
def notify_deal(deal_id: int, channel_ids: list[int] = None, force: bool = False) -> dict:
    """
    Send notifications for a deal to specified channels (or all auto-notify channels).

    Automatically tracks which user initiated the task via thread-local storage.

    Args:
        deal_id: ID of the Deal to send notifications for
        channel_ids: List of NotificationChannel IDs to send to (defaults to all auto-notify channels)
        force: If True, send notification even if already sent (deletes existing successful logs)

    Returns:
        dict: Combined status information
    """
    try:
        deal = Deal.objects.get(pk=deal_id)
    except Deal.DoesNotExist:
        error_msg = f"Deal with ID {deal_id} not found"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

    # Determine which channels to notify
    if channel_ids:
        channels = NotificationChannel.objects.filter(pk__in=channel_ids, active=True)
    else:
        channels = NotificationChannel.objects.filter(auto_notify=True, active=True)

    if not channels.exists():
        msg = "No active channels to notify"
        logger.warning(f"Deal '{deal.name}': {msg}")
        return {"success": False, "error": msg}

    # If force=True, delete existing successful notification logs
    if force:
        deleted_count = NotificationLog.objects.filter(
            deal=deal,
            channel__in=channels,
            status=NotificationLog.Status.SUCCESS
        ).delete()[0]
        if deleted_count:
            logger.info(f"Force flag set - deleted {deleted_count} successful log(s) for deal '{deal.name}'")

    # Queue notification tasks for each channel
    task_ids = []
    for channel in channels:
        result = send_discord_webhook.delay(deal_id, channel.id)
        task_ids.append(result.id)
        logger.info(f"Queued notification task for deal '{deal.name}' to channel '{channel.name}'")

    return {
        "success": True,
        "message": f"Queued {len(task_ids)} notification task(s) for deal '{deal.name}'",
        "task_ids": task_ids,
        "channel_count": len(task_ids)
    }


@user_tracked_task()
def search_and_download_image(deal_id: int, search_query: str = None) -> dict:
    """
    Search for and download an image for a deal.

    Automatically tracks which user initiated the task via thread-local storage.

    Args:
        deal_id: ID of the Deal to find image for
        search_query: Optional custom search query (defaults to "{deal_name} game cover art")

    Returns:
        dict: Status information about the image search and download
    """
    try:
        deal = Deal.objects.get(pk=deal_id)
    except Deal.DoesNotExist:
        error_msg = f"Deal with ID {deal_id} not found"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

    # Build search query
    if not search_query:
        search_query = f"{deal.name} game cover art"

    try:
        provider = GoogleCustomSearchProvider(
            api_key=settings.GOOGLE_API_KEY,
            search_engine_id=settings.GOOGLE_SEARCH_ENGINE_ID
        )

        image_results = provider.search(search_query, limit=1)

        if not image_results:
            msg = f"No images found for query: {search_query}"
            logger.warning(msg)
            return {"success": False, "error": msg}

        first_image = image_results[0]
        first_image_url = first_image.url

        # Download the image
        try:
            image_content, image_filename = download_image_from_url(first_image_url)
            deal.image.save(image_filename, image_content, save=False)

            # Save attribution URL if available
            if first_image.page_url:
                deal.image_attribution = first_image.page_url

            deal.save()

            msg = f'Found and set image for "{deal.name}"'
            logger.info(msg)
            return {"success": True, "message": msg, "image_url": first_image_url}

        except Exception as e:
            error_msg = f"Error downloading image: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    except Exception as e:
        error_msg = f"Error searching for image: {str(e)}"
        logger.exception(error_msg)
        return {"success": False, "error": error_msg}


@user_tracked_task()
def extract_colors_from_deal_image(deal_id: int) -> dict:
    """
    Extract color palette from a deal's image.

    Automatically tracks which user initiated the task via thread-local storage.

    Args:
        deal_id: ID of the Deal to extract colors for

    Returns:
        dict: Status information about the color extraction
    """
    try:
        deal = Deal.objects.get(pk=deal_id)
    except Deal.DoesNotExist:
        error_msg = f"Deal with ID {deal_id} not found"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

    if not deal.image:
        error_msg = f"Deal '{deal.name}' has no image to extract colors from"
        logger.warning(error_msg)
        return {"success": False, "error": error_msg}

    try:
        num_colors = deal.extract_and_save_colors()
        msg = f"Extracted {num_colors} colors from image for '{deal.name}'"
        logger.info(msg)
        return {"success": True, "message": msg, "num_colors": num_colors}

    except Exception as e:
        error_msg = f"Error extracting colors for '{deal.name}': {str(e)}"
        logger.exception(error_msg)
        return {"success": False, "error": error_msg}
