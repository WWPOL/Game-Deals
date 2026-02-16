"""
Celery tasks for the deals app.
"""

from django.conf import settings
from django.db import transaction
from urllib.parse import urlparse
import logging

from tasks.celery_utils import user_tracked_task
from deals.models import Deal, NotificationChannel, NotificationLog
from deals.services.discord_notifier import (
    send_discord_notification,
    DiscordNotificationError,
)
from deals.services.image_search import (
    GoogleCustomSearchProvider,
    download_image_from_url,
)
from common.fields import validate_image_content
from common.image_memory_manager import ImageTooLargeError, MemoryAllocationError

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
        deal = Deal.objects.prefetch_related("color_palette").get(pk=deal_id)
    except Deal.DoesNotExist:
        error_msg = f"Deal with ID {deal_id} not found"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

    try:
        channel = NotificationChannel.objects.select_related(
            "discord_webhook_config"
        ).get(pk=channel_id)
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
        deal=deal, channel=channel, status=NotificationLog.Status.PENDING
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
def notify_deal(
    deal_id: int, channel_ids: list[int] = None, force: bool = False
) -> dict:
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
            deal=deal, channel__in=channels, status=NotificationLog.Status.SUCCESS
        ).delete()[0]
        if deleted_count:
            logger.info(
                f"Force flag set - deleted {deleted_count} successful log(s) for deal '{deal.name}'"
            )

    # Queue notification tasks for each channel
    task_ids = []
    for channel in channels:
        result = send_discord_webhook.delay(deal_id, channel.id)
        task_ids.append(result.id)
        logger.info(
            f"Queued notification task for deal '{deal.name}' to channel '{channel.name}'"
        )

    return {
        "success": True,
        "message": f"Queued {len(task_ids)} notification task(s) for deal '{deal.name}'",
        "task_ids": task_ids,
        "channel_count": len(task_ids),
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
            search_engine_id=settings.GOOGLE_SEARCH_ENGINE_ID,
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
                logger.info(
                    f"Trying image {idx}/{len(image_results)} for '{deal.name}': {image_result.url}"
                )

                # Download the image
                image_content, image_filename = download_image_from_url(
                    image_result.url
                )

                # Validate the image in memory BEFORE writing to storage
                # (Only needed here since we're trying multiple images)
                validate_image_content(image_content)

                # Image is valid, now write it to storage (disk/S3/etc)
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
                    "total_images": len(image_results),
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
        return {
            "success": False,
            "error": error_summary,
            "attempts": len(image_results),
        }

    except Exception as e:
        error_msg = f"Error searching for image: {str(e)}"
        logger.exception(error_msg)
        return {"success": False, "error": error_msg}


@user_tracked_task()
def download_and_set_image(
    deal_id: int, image_url: str, attribution_url: str = None
) -> dict:
    """
    Download image from URL and set it on the deal.

    Validates image before saving to prevent corrupted files.
    Automatically queues color extraction after successful save.

    Args:
        deal_id: ID of the Deal to set image for
        image_url: URL of the image to download
        attribution_url: Optional attribution URL

    Returns:
        dict: Status information
    """
    try:
        deal = Deal.objects.get(pk=deal_id)
    except Deal.DoesNotExist:
        return {"success": False, "error": f"Deal {deal_id} not found"}

    try:
        # Download image
        image_content, image_filename = download_image_from_url(image_url)

        # Validate before saving
        validate_image_content(image_content)

        # Save the image file to storage and update the deal's image field.
        # save=True also saves the Deal model, which will trigger the async color extraction.
        deal.image.save(image_filename, image_content, save=True)

        # If there's an attribution URL, update the model again.
        if attribution_url:
            deal.image_attribution = attribution_url
            deal.save(update_fields=["image_attribution"])

        return {
            "success": True,
            "message": f"Image set successfully for '{deal.name}'",
            "image_url": image_url,
        }

    except (ImageTooLargeError, MemoryAllocationError) as e:
        error_msg = f"Memory error for deal {deal_id}: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

    except Exception as e:
        logger.exception(
            f"Failed to download/set image for deal {deal_id} from url {image_url}"
        )
        return {"success": False, "error": str(e)}


@user_tracked_task()
def publish_deal(deal_id: int, send_notifications: bool = True) -> dict:
    """
    Publish a deal and optionally send notifications.

    Args:
        deal_id: ID of the Deal to publish
        send_notifications: Whether to queue notifications after publishing

    Returns:
        dict: Status information about the publish
    """
    try:
        deal = Deal.objects.get(pk=deal_id)
    except Deal.DoesNotExist:
        error_msg = f"Deal with ID {deal_id} not found"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

    if deal.status == Deal.Status.PUBLISHED:
        msg = f"Deal '{deal.name}' is already published"
        logger.info(msg)
        return {"success": False, "error": msg, "already_published": True}

    try:
        deal.status = Deal.Status.PUBLISHED
        deal.full_clean()
        deal.save()
    except Exception as e:
        error_msg = f"Error publishing '{deal.name}': {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

    if send_notifications:
        notify_deal.delay(deal_id)
        msg = f"Published deal '{deal.name}' and queued notifications"
    else:
        msg = f"Published deal '{deal.name}' without notifications"

    logger.info(msg)
    return {"success": True, "message": msg}


@user_tracked_task()
def unpublish_deal(deal_id: int) -> dict:
    """
    Unpublish a deal (set status back to draft).

    Args:
        deal_id: ID of the Deal to unpublish

    Returns:
        dict: Status information about the unpublish
    """
    try:
        deal = Deal.objects.get(pk=deal_id)
    except Deal.DoesNotExist:
        error_msg = f"Deal with ID {deal_id} not found"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

    if deal.status == Deal.Status.DRAFT:
        msg = f"Deal '{deal.name}' is already in draft status"
        logger.info(msg)
        return {"success": False, "error": msg, "already_draft": True}

    deal.status = Deal.Status.DRAFT
    deal.save()

    msg = f"Unpublished deal '{deal.name}'"
    logger.info(msg)
    return {"success": True, "message": msg}


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

    except (ImageTooLargeError, MemoryAllocationError) as e:
        error_msg = f"Memory error extracting colors for '{deal.name}': {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}

    except Exception as e:
        error_msg = f"Error extracting colors for '{deal.name}': {str(e)}"
        logger.exception(error_msg)
        return {"success": False, "error": error_msg}


@user_tracked_task()
def download_image_from_attribution(deal_id: int) -> dict:
    """
    Queues a task to download an image from the URL stored in the deal's
    image_attribution field.

    Automatically tracks which user initiated the task via thread-local storage.

    Args:
        deal_id: ID of the Deal to download image for

    Returns:
        dict: Status information about the task queuing
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

    # Queue the new generic download task
    task = download_and_set_image.delay(
        deal_id, deal.image_attribution, deal.image_attribution
    )

    msg = f"Queued image download from attribution for '{deal.name}'"
    logger.info(msg)
    return {"success": True, "message": msg, "task_id": task.id}
