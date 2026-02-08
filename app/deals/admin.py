import json
from django import forms
from django.contrib import admin
from django.db import models
from django.urls import reverse
from django.utils.html import format_html
from django.shortcuts import redirect
from django.contrib import messages
from django.http import HttpResponseRedirect
from unfold.admin import ModelAdmin, TabularInline, StackedInline
from django_object_actions import DjangoObjectActions
from .models import (
    Deal,
    ColorPalette,
    NotificationChannel,
    NotificationLog,
    DiscordWebhookConfig,
)
from .forms import DealAdminForm
from .admin_mixins import unfold_action
from .widgets import ColorPalettePreviewWidget
from .tasks import (
    notify_deal,
    publish_deal,
    unpublish_deal,
    search_and_download_image,
    extract_colors_from_deal_image,
)


class HasImageFilter(admin.SimpleListFilter):
    title = "has image"
    parameter_name = "has_image"

    def lookups(self, request, model_admin):
        return (
            ("yes", "Yes"),
            ("no", "No"),
        )

    def queryset(self, request, queryset):
        if self.value() == "yes":
            return queryset.exclude(image="")
        if self.value() == "no":
            return queryset.filter(image="")


class HasPaletteFilter(admin.SimpleListFilter):
    title = "has palette"
    parameter_name = "has_palette"

    def lookups(self, request, model_admin):
        return (
            ("yes", "Yes"),
            ("no", "No"),
        )

    def queryset(self, request, queryset):
        if self.value() == "yes":
            return queryset.filter(color_palette__isnull=False).distinct()
        if self.value() == "no":
            return queryset.filter(color_palette__isnull=True)


class ColorPaletteInline(TabularInline):
    model = ColorPalette
    extra = 0
    min_num = 0  # Don't auto-create empty rows
    max_num = 6
    can_delete = True
    show_change_link = True  # Built-in Django feature to show edit link

    fields = ["color_preview"]
    readonly_fields = ["color_preview"]
    ordering = ["-weight"]

    def color_preview(self, obj):
        """Visual preview of foreground text on background"""
        if not obj:
            return "-"

        # Get values, use defaults for new objects
        bg_color = obj.background_color if obj.background_color else "#000000"
        fg_color = obj.foreground_color if obj.foreground_color else "#ffffff"
        weight = obj.weight if obj.weight is not None else 0.0

        widget = ColorPalettePreviewWidget()
        value = {
            "background_color": bg_color,
            "foreground_color": fg_color,
            "weight": weight,
        }
        return widget.render(name="preview", value=value)

    color_preview.short_description = "Preview"

    def has_add_permission(self, request, obj=None):
        """Prevent adding colors when deal is published"""
        if obj and obj.status == Deal.Status.PUBLISHED:
            return False
        return super().has_add_permission(request, obj)

    def has_change_permission(self, request, obj=None):
        """Prevent changing colors when deal is published"""
        if obj and obj.status == Deal.Status.PUBLISHED:
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        """Prevent deleting colors when deal is published"""
        if obj and obj.status == Deal.Status.PUBLISHED:
            return False
        return super().has_delete_permission(request, obj)


class NotificationLogInline(TabularInline):
    model = NotificationLog
    extra = 0
    can_delete = False
    show_change_link = False
    verbose_name = "Notification Log"
    verbose_name_plural = "Notification Logs"

    fields = ["channel", "status", "status_message", "sent_at"]
    readonly_fields = ["channel", "status", "status_message", "sent_at"]
    ordering = ["-sent_at"]

    def has_add_permission(self, request, obj=None):
        """Prevent manual creation of notification logs"""
        return False


class NotificationLogForChannelInline(TabularInline):
    """Notification log inline for NotificationChannel admin - shows deal instead of channel"""

    model = NotificationLog
    extra = 0
    max_num = 20  # Limit to 20 most recent logs
    can_delete = False
    show_change_link = False
    verbose_name = "Notification Log"
    verbose_name_plural = "Notification Logs"

    fields = ["deal", "status", "status_message", "sent_at"]
    readonly_fields = ["deal", "status", "status_message", "sent_at"]
    ordering = ["-sent_at"]

    def has_add_permission(self, request, obj=None):
        """Prevent manual creation of notification logs"""
        return False


@admin.register(ColorPalette)
class ColorPaletteAdmin(ModelAdmin):
    list_display = ("deal", "background_color", "foreground_color", "weight")
    list_filter = ("deal",)
    readonly_fields = ("created_at",)
    fields = ("deal", "background_color", "foreground_color", "weight", "created_at")

    def has_module_permission(self, request):
        """Hide from admin index but allow access via direct links"""
        return False

    def get_readonly_fields(self, request, obj=None):
        """Make all fields readonly when the parent deal is published"""
        readonly = list(self.readonly_fields)
        if obj and obj.deal and obj.deal.status == Deal.Status.PUBLISHED:
            readonly.extend(["deal", "background_color", "foreground_color", "weight"])
        return readonly


@admin.register(Deal)
class DealAdmin(DjangoObjectActions, ModelAdmin):
    form = DealAdminForm
    inlines = [ColorPaletteInline, NotificationLogInline]
    list_display = ("name", "status", "price", "expires", "is_active", "created_at")
    list_filter = ("status", HasImageFilter, HasPaletteFilter, "expires", "created_at")
    search_fields = ("name",)
    actions = [
        "publish_deals_bulk",
        "publish_deals_no_notifications_bulk",
        "unpublish_deals_bulk",
        "reextract_colors_bulk",
        "image_search_bulk",
    ]
    fieldsets = (
        ("Basic Information", {"fields": ("name",)}),
        ("Deal Details", {"fields": ("price", "original_price", "link", "expires")}),
        ("Image", {"fields": ("image", "image_attribution", "auto_extract_palette")}),
        ("Status", {"fields": ("status",)}),
        (
            "Metadata",
            {"fields": ("slug", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    # Add actions to the change form
    change_actions = (
        "publish_deal",
        "reextract_colors",
        "image_search",
        "unpublish_deal",
    )

    def save_model(self, request, obj, form, change):
        """Automatically find image on creation if not set"""
        # Check if status changed to published
        was_published = False
        is_now_published = obj.status == Deal.Status.PUBLISHED

        if change and obj.pk:
            try:
                original_obj = Deal.objects.get(pk=obj.pk)
                # Check if status changed from draft to published
                if original_obj.status != Deal.Status.PUBLISHED and is_now_published:
                    was_published = True
            except Deal.DoesNotExist:
                pass
        elif not change and is_now_published:
            # New deal being created as published
            was_published = True

        # Save the deal first (model's save() will handle color extraction if needed)
        super().save_model(request, obj, form, change)

        # Queue image search task for new deals without images
        if not change and obj.name and not obj.image:
            search_and_download_image.delay(obj.pk)
            messages.info(
                request,
                f'Image search queued for "{obj.name}" - check task monitor for progress',
            )

        # Send notifications if deal was just published
        if was_published:
            notify_deal.delay(obj.pk)
            messages.info(
                request,
                f"Deal published - notifications queued for auto-notify channels",
            )

    def get_changeform_initial_data(self, request):
        """Populate initial data from URL parameters"""
        initial = super().get_changeform_initial_data(request)
        # Get image attribution from URL parameters for image search
        if "image_attribution" in request.GET:
            initial["image_attribution"] = request.GET["image_attribution"]
        return initial

    @unfold_action(
        label="Re-extract Colors",
        short_description="Extract color palette from current image",
    )
    def reextract_colors(self, request, obj):
        """Action to manually re-extract colors from current image"""
        # Call bulk action with single-item queryset
        queryset = Deal.objects.filter(pk=obj.pk)
        self.reextract_colors_bulk(request, queryset)

        # Redirect back to the same change form
        return redirect("admin:deals_deal_change", object_id=obj.pk)

    @unfold_action(
        label="Search for Images",
        short_description="Open image search page for this deal",
    )
    def image_search(self, request, obj):
        """Action to search for images for this deal and select from results"""
        # Redirect directly to the image search UI
        url = reverse("deals:admin_search_images_with_id", args=[obj.pk])
        return HttpResponseRedirect(url)

    @unfold_action(
        label="Publish Deal",
        short_description="Publish this deal and send notifications",
    )
    def publish_deal(self, request, obj):
        """Action to publish the deal and send notifications"""
        # Call bulk action with single-item queryset
        queryset = Deal.objects.filter(pk=obj.pk)
        self.publish_deals_bulk(request, queryset)

        # Redirect back to the same change form
        return redirect("admin:deals_deal_change", object_id=obj.pk)

    @unfold_action(label="Unpublish Deal", short_description="Unpublish this deal")
    def unpublish_deal(self, request, obj):
        """Action to unpublish the deal"""
        # Call bulk action with single-item queryset
        queryset = Deal.objects.filter(pk=obj.pk)
        self.unpublish_deals_bulk(request, queryset)

        # Redirect back to the same change form
        return redirect("admin:deals_deal_change", object_id=obj.pk)

    def get_change_actions(self, request, object_id, form_url):
        """Conditionally show actions based on object state"""
        actions = super().get_change_actions(request, object_id, form_url)

        # Get the object to check its status
        try:
            obj = self.model.objects.get(pk=object_id)
            if obj.status == Deal.Status.PUBLISHED:
                # Only show unpublish for published deals
                actions = [
                    action for action in actions if action not in ["publish_deal"]
                ]
            else:
                # Only show publish for draft deals
                actions = [
                    action for action in actions if action not in ["unpublish_deal"]
                ]
        except self.model.DoesNotExist:
            pass

        return actions

    def get_readonly_fields(self, request, obj=None):
        """Make all fields readonly when published"""
        readonly = ["created_at", "updated_at"]
        if obj and obj.status == Deal.Status.PUBLISHED:
            # Make all fields readonly when published
            readonly.extend(
                [
                    "name",
                    "slug",
                    "original_price",
                    "price",
                    "expires",
                    "image",
                    "image_attribution",
                    "auto_extract_palette",
                    "link",
                    "status",
                ]
            )
        return readonly

    @admin.action(description="Re-extract colors from images")
    def reextract_colors_bulk(self, request, queryset):
        """Bulk action to manually re-extract colors from selected deals"""
        queued_count = 0
        skipped_count = 0

        for deal in queryset:
            if deal.image:
                extract_colors_from_deal_image.delay(deal.pk)
                queued_count += 1
            else:
                skipped_count += 1

        if queued_count:
            self.message_user(
                request,
                f"Queued color extraction for {queued_count} deal(s) - check task monitor for progress",
            )
        if skipped_count:
            self.message_user(
                request,
                f"{skipped_count} deal(s) skipped (no image)",
                level=messages.WARNING,
            )

    @admin.action(description="Search for images and auto-select first")
    def image_search_bulk(self, request, queryset):
        """Bulk action to automatically search for and select the first image found"""
        queued_count = 0

        for deal in queryset:
            if deal.name:
                search_and_download_image.delay(deal.pk)
                queued_count += 1

        if queued_count:
            self.message_user(
                request,
                f"Queued image search for {queued_count} deal(s) - check task monitor for progress",
            )

    @admin.action(description="Publish deals and send notifications")
    def publish_deals_bulk(self, request, queryset):
        """Bulk action to publish selected deals and send notifications"""
        queued_count = 0
        already_published = 0

        for deal in queryset:
            if deal.status == Deal.Status.PUBLISHED:
                already_published += 1
                continue

            publish_deal.delay(deal.pk, send_notifications=True)
            queued_count += 1

        if queued_count:
            self.message_user(
                request,
                f"Queued publishing for {queued_count} deal(s) with notifications",
            )
        if already_published:
            self.message_user(
                request,
                f"{already_published} deal(s) already published",
                level=messages.INFO,
            )

    @admin.action(description="Publish deals without sending notifications")
    def publish_deals_no_notifications_bulk(self, request, queryset):
        """Bulk action to publish selected deals without sending notifications"""
        queued_count = 0
        already_published = 0

        for deal in queryset:
            if deal.status == Deal.Status.PUBLISHED:
                already_published += 1
                continue

            publish_deal.delay(deal.pk, send_notifications=False)
            queued_count += 1

        if queued_count:
            self.message_user(
                request,
                f"Queued publishing for {queued_count} deal(s) without notifications",
            )
        if already_published:
            self.message_user(
                request,
                f"{already_published} deal(s) already published",
                level=messages.INFO,
            )

    @admin.action(description="Unpublish deals")
    def unpublish_deals_bulk(self, request, queryset):
        """Bulk action to unpublish selected deals"""
        queued_count = 0
        already_draft = 0

        for deal in queryset:
            if deal.status == Deal.Status.DRAFT:
                already_draft += 1
                continue

            unpublish_deal.delay(deal.pk)
            queued_count += 1

        if queued_count:
            self.message_user(request, f"Queued unpublishing for {queued_count} deal(s)")
        if already_draft:
            self.message_user(
                request,
                f"{already_draft} deal(s) already in draft status",
                level=messages.INFO,
            )


class DiscordWebhookConfigInline(StackedInline):
    model = DiscordWebhookConfig
    extra = 0
    min_num = 1  # Require at least one for discord_webhook type
    max_num = 1  # Enforce 1:1 relationship
    can_delete = False

    fields = ["webhook_url", "username", "avatar"]

    def get_formset(self, request, obj=None, **kwargs):
        """Only show this inline for discord_webhook type channels"""
        formset = super().get_formset(request, obj, **kwargs)
        if obj and obj.type != NotificationChannel.ChannelType.DISCORD_WEBHOOK:
            # Don't show for other types
            return None
        return formset


@admin.register(NotificationChannel)
class NotificationChannelAdmin(DjangoObjectActions, ModelAdmin):
    list_display = (
        "name",
        "type",
        "active",
        "auto_notify",
        "is_test_channel",
        "created_at",
    )
    list_filter = ("type", "active", "auto_notify", "is_test_channel")
    search_fields = ("name",)
    readonly_fields = ("created_at", "updated_at")
    inlines = [DiscordWebhookConfigInline, NotificationLogForChannelInline]
    actions = ["send_notifications_bulk"]

    fieldsets = (
        ("Channel Information", {"fields": ("name", "type")}),
        (
            "Settings",
            {
                "fields": (
                    "auto_notify",
                    "active",
                    "is_test_channel",
                    "message_preamble",
                )
            },
        ),
        (
            "Metadata",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        """Add notification count annotation"""
        qs = super().get_queryset(request)
        return qs.annotate(notification_count=models.Count("notification_logs"))

    @unfold_action(
        label="Send Notifications", short_description="Select deals to notify about"
    )
    def send_notifications(self, request, obj):
        """Action to select deals to send notifications for"""
        # Call bulk action with single-item queryset
        queryset = NotificationChannel.objects.filter(pk=obj.pk)
        return self.send_notifications_bulk(request, queryset)

    @admin.action(description="Send notifications for selected deals")
    def send_notifications_bulk(self, request, queryset):
        """Bulk action to select deals to send notifications for to selected channels"""
        channel_ids = ",".join(
            str(ch_id) for ch_id in queryset.values_list("id", flat=True)
        )
        url = reverse("deals:admin_select_deals_to_notify_with_ids", args=[channel_ids])
        return HttpResponseRedirect(url)

    @unfold_action(
        label="Duplicate Channel",
        short_description="Duplicate this notification channel",
    )
    def duplicate_channel(self, request, obj):
        """Create a duplicate of this notification channel and its config"""
        config = obj.get_config()

        # Duplicate the channel
        obj.pk = None
        obj.name = f"{obj.name} (copy)"
        obj.save()

        # Duplicate the type-specific config
        if config:
            config.pk = None
            config.channel = obj
            config.save()

        self.message_user(request, f'Duplicated channel as "{obj.name}"')
        url = reverse("admin:deals_notificationchannel_change", args=[obj.pk])
        return HttpResponseRedirect(url)

    # Add actions to the change form
    change_actions = ("send_notifications", "duplicate_channel")


@admin.register(NotificationLog)
class NotificationLogAdmin(ModelAdmin):
    list_display = ("deal", "channel", "status", "sent_at")
    list_filter = ("status", "channel", "sent_at")
    search_fields = ("deal__name", "channel__name", "status_message")
    readonly_fields = ("deal", "channel", "status", "status_message", "sent_at")
    date_hierarchy = "sent_at"

    def has_add_permission(self, request):
        """Prevent manual creation of notification logs"""
        return False

    def has_change_permission(self, request, obj=None):
        """Make logs read-only"""
        return False
