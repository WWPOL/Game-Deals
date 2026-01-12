"""
Celery tasks for the deals app.
"""

from django.conf import settings
from django.db import transaction
from urllib.parse import urlparse
import logging

from tasks.celery_utils import user_tracked_task
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
    Search for and download a valid image for a deal.

    Tries multiple images from search results until a valid one is found.
    Validates each image before saving to ensure it's not corrupted.

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

        # Fetch up to 10 images to try (Google API max per request)
        image_results = provider.search(search_query, limit=10)

        if not image_results:
            msg = f"No images found for query: {search_query}"
            logger.warning(msg)
            return {"success": False, "error": msg}

        # Try each image until we find a valid one
        errors = []
        for idx, image_result in enumerate(image_results, 1):
            try:
                logger.info(f"Trying image {idx}/{len(image_results)} for '{deal.name}': {image_result.url}")

                # Download the image
                image_content, image_filename = download_image_from_url(image_result.url)

                # Try to save the image (this will trigger validation)
                deal.image.save(image_filename, image_content, save=False)

                # Save attribution URL if available
                if image_result.page_url:
                    deal.image_attribution = image_result.page_url

                # Save the deal (this will also run model validation)
                deal.save()

                msg = f'Found and set valid image for "{deal.name}" (tried {idx} image(s))'
                logger.info(msg)
                return {
                    "success": True,
                    "message": msg,
                    "image_url": image_result.url,
                    "attempts": idx,
                    "total_images": len(image_results)
                }

            except Exception as e:
                error_msg = f"Image {idx} failed: {str(e)}"
                errors.append(error_msg)
                logger.warning(f"'{deal.name}' - {error_msg}")
                # Continue to next image
                continue

        # If we get here, all images failed
        error_summary = f"All {len(image_results)} images failed validation. Errors: {'; '.join(errors)}"
        logger.error(f"'{deal.name}' - {error_summary}")
        return {"success": False, "error": error_summary, "attempts": len(image_results)}

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


@user_tracked_task()
def download_image_from_attribution(deal_id: int) -> dict:
    """
    Download image from the URL stored in deal.image_attribution field.

    Validates the image to ensure it's not corrupted before saving.

    Automatically tracks which user initiated the task via thread-local storage.

    Args:
        deal_id: ID of the Deal to download image for

    Returns:
        dict: Status information about the image download
    """
    try:
        deal = Deal.objects.get(pk=deal_id)
    except Deal.DoesNotExist:
        error_msg = f"Deal with ID {deal_id} not found"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

    if not deal.image_attribution:
        error_msg = f"Deal '{deal.name}' has no image_attribution URL to download from"
        logger.warning(error_msg)
        return {"success": False, "error": error_msg}

    # Validate that image_attribution is a valid URL
    try:
        parsed = urlparse(deal.image_attribution)
        if not all([parsed.scheme, parsed.netloc]):
            error_msg = f"Deal '{deal.name}' image_attribution is not a valid URL: {deal.image_attribution}"
            logger.warning(error_msg)
            return {"success": False, "error": error_msg}
    except Exception as e:
        error_msg = f"Deal '{deal.name}' failed to parse image_attribution URL: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

    try:
        image_content, image_filename = download_image_from_url(deal.image_attribution)
        # save=True will trigger validation and save the deal
        deal.image.save(image_filename, image_content, save=True)

        msg = f"Downloaded and validated image from attribution URL for '{deal.name}'"
        logger.info(msg)
        return {"success": True, "message": msg, "image_url": deal.image_attribution}

    except Exception as e:
        error_msg = f"Error downloading or validating image for '{deal.name}': {str(e)}"
        logger.exception(error_msg)
        return {"success": False, "error": error_msg}
