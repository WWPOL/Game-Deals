import json
from django import forms
from django.contrib import admin
from django.db import models
from django.urls import reverse
from django.utils.html import format_html
from django.shortcuts import redirect
from django.contrib import messages
from django.conf import settings
from django.http import HttpResponseRedirect
from unfold.admin import ModelAdmin
from django_object_actions import DjangoObjectActions
from .models import Deal, PushSubscription, ColorPalette, NotificationChannel, NotificationLog, DiscordWebhookConfig
from .forms import DealAdminForm
from .services.image_search import GoogleCustomSearchProvider, download_image_from_url
from .services.color_extractor import extract_colors_from_url
from .admin_mixins import unfold_action
from .widgets import ColorPickerWidget, ColorPalettePreviewWidget
from .tasks import notify_deal


class ColorPaletteInline(admin.TabularInline):
    model = ColorPalette
    extra = 0
    min_num = 0  # Don't auto-create empty rows
    max_num = 6
    can_delete = True
    show_change_link = True  # Built-in Django feature to show edit link

    fields = ['color_preview']
    readonly_fields = ['color_preview']
    ordering = ['-weight']

    def color_preview(self, obj):
        """Visual preview of foreground text on background"""
        if not obj:
            return "-"

        # Get values, use defaults for new objects
        bg_color = obj.background_color if obj.background_color else '#000000'
        fg_color = obj.foreground_color if obj.foreground_color else '#ffffff'
        weight = obj.weight if obj.weight is not None else 0.0

        widget = ColorPalettePreviewWidget()
        value = {
            'background_color': bg_color,
            'foreground_color': fg_color,
            'weight': weight
        }
        return widget.render(name='preview', value=value)

    color_preview.short_description = 'Preview'


@admin.register(Deal)
class DealAdmin(DjangoObjectActions, ModelAdmin):
    form = DealAdminForm
    inlines = [ColorPaletteInline]
    list_display = ('name', 'status', 'price', 'expires', 'is_active', 'created_at')
    list_filter = ('status', 'expires', 'created_at')
    search_fields = ('name',)
    actions = ['publish_deals_bulk', 'send_notifications_bulk', 'reextract_colors_bulk', 'image_search_bulk']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug')
        }),
        ('Deal Details', {
            'fields': ('original_price', 'price', 'link', 'expires')
        }),
        ('Image', {
            'fields': ('image', 'image_attribution', 'auto_extract_palette')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        """Automatically find image on creation if not set, and re-extract colors when image changes if auto_extract is enabled"""
        # Check if image URL has changed (for updates) and if status changed to published
        image_changed = False
        was_published = False
        is_now_published = obj.status == Deal.Status.PUBLISHED

        if change and obj.pk:
            try:
                original_obj = Deal.objects.get(pk=obj.pk)
                if original_obj.image != obj.image and obj.image:
                    image_changed = True
                # Check if status changed from draft to published
                if original_obj.status != Deal.Status.PUBLISHED and is_now_published:
                    was_published = True
            except Deal.DoesNotExist:
                pass
        elif not change and is_now_published:
            # New deal being created as published
            was_published = True

        if not change and obj.name and not obj.image:
            # This is a new deal - auto-find first image
            try:
                provider = GoogleCustomSearchProvider(
                    api_key=settings.GOOGLE_API_KEY,
                    search_engine_id=settings.GOOGLE_SEARCH_ENGINE_ID
                )

                search_query = f"{obj.name} game cover art"
                image_results = provider.search(search_query, limit=1)

                if image_results:
                    first_image = image_results[0]
                    first_image_url = first_image.url

                    # Download the image
                    try:
                        image_content, image_filename = download_image_from_url(first_image_url)
                        obj.image.save(image_filename, image_content, save=False)
                        # Save attribution URL if available
                        if first_image.page_url:
                            obj.image_attribution = first_image.page_url
                    except Exception as e:
                        messages.error(request, f'Error downloading image: {e}')
                        super().save_model(request, obj, form, change)
                        return

                    # Only extract colors if auto_extract is enabled
                    if obj.auto_extract_palette:
                        try:
                            palette_entries = extract_colors_from_url(obj.image.path)

                            # Save Deal first to get pk for ColorPalette entries
                            super().save_model(request, obj, form, change)

                            # Create ColorPalette entries
                            for entry in palette_entries:
                                entry.deal = obj
                                entry.save()

                            messages.success(request, f'Automatically found image and extracted {len(palette_entries)} colors')
                            return  # Don't call super() again
                        except Exception as e:
                            messages.error(request, f'Error extracting colors from image: {e}')
                            # Continue to save the deal with the image, just without colors
                    else:
                        messages.success(request, f'Automatically found and set image for "{obj.name}"')
                else:
                    messages.warning(request, f'No images found for "{obj.name}"')

            except Exception as e:
                messages.error(request, f'Error searching for image: {e}')
        elif image_changed and obj.auto_extract_palette:
            # Image was changed and auto-extract is enabled - re-extract colors
            try:
                palette_entries = extract_colors_from_url(obj.image.path)

                # Save Deal first
                super().save_model(request, obj, form, change)

                # Clear existing palette and create new entries
                obj.color_palette.all().delete()
                for entry in palette_entries:
                    entry.deal = obj
                    entry.save()

                messages.success(request, f'Image changed - extracted {len(palette_entries)} colors')
                return  # Don't call super() again
            except Exception as e:
                messages.error(request, f'Error extracting colors from new image: {e}')

        super().save_model(request, obj, form, change)

        # Send notifications if deal was just published
        if was_published:
            notify_deal.delay(obj.pk)
            messages.info(request, f'Deal published - notifications queued for auto-notify channels')

    def get_changeform_initial_data(self, request):
        """Populate initial data from URL parameters"""
        initial = super().get_changeform_initial_data(request)
        # Get image attribution from URL parameters for image search
        if 'image_attribution' in request.GET:
            initial['image_attribution'] = request.GET['image_attribution']
        return initial

    @unfold_action(label="Re-extract Colors", short_description="Extract color palette from current image")
    def reextract_colors(self, request, obj):
        """Action to manually re-extract colors from current image"""
        if obj and obj.image:
            try:
                palette_entries = extract_colors_from_url(obj.image.path)

                # Clear existing palette
                obj.color_palette.all().delete()

                # Create new entries
                for entry in palette_entries:
                    entry.deal = obj
                    entry.save()

                self.message_user(request, f'Successfully re-extracted {len(palette_entries)} colors!')
            except Exception as e:
                self.message_user(request, f'Error extracting colors: {e}', level=messages.ERROR)
        else:
            self.message_user(request, 'No image to extract colors from.', level=messages.WARNING)

        # Redirect back to the same change form
        return redirect('admin:deals_deal_change', object_id=obj.pk)

    @unfold_action(label="Search for Images", short_description="Open image search page for this deal")
    def image_search(self, request, obj):
        """Action to search for images for this deal"""
        if obj and obj.pk:
            url = reverse('admin_search_images_with_id', args=[obj.pk])
            return HttpResponseRedirect(url)
        else:
            self.message_user(request, 'Please save the deal first before searching for images.', level=messages.WARNING)
            return None

    @unfold_action(label="Publish Deal", short_description="Publish this deal and send notifications")
    def publish_deal(self, request, obj):
        """Action to publish the deal and send notifications"""
        if not obj or not obj.pk:
            self.message_user(request, 'Please save the deal first.', level=messages.WARNING)
            return redirect('admin:deals_deal_change', object_id=obj.pk)

        if obj.status == Deal.Status.PUBLISHED:
            self.message_user(request, f'"{obj.name}" is already published.', level=messages.INFO)
            return redirect('admin:deals_deal_change', object_id=obj.pk)

        # Try to publish - this will run validation
        obj.status = Deal.Status.PUBLISHED
        try:
            obj.full_clean()
            obj.save()

            # Send notifications
            notify_deal.delay(obj.pk)

            self.message_user(request, f'Successfully published "{obj.name}" and queued notifications')
        except Exception as e:
            self.message_user(request, f'Error publishing deal: {e}', level=messages.ERROR)

        return redirect('admin:deals_deal_change', object_id=obj.pk)

    @unfold_action(label="Send Notifications", short_description="Send notifications to all auto-notify channels")
    def send_notifications(self, request, obj):
        """Action to send notifications for this deal to all auto-notify channels"""
        if not obj or not obj.pk:
            self.message_user(request, 'Please save the deal first.', level=messages.WARNING)
            return redirect('admin:deals_deal_change', object_id=obj.pk)

        # Queue notification task
        notify_deal.delay(obj.pk)

        self.message_user(request, f'Queued notifications for "{obj.name}" to all auto-notify channels')
        return redirect('admin:deals_deal_change', object_id=obj.pk)

    # Add actions to the change form
    change_actions = ('publish_deal', 'send_notifications', 'reextract_colors', 'image_search')

    def get_readonly_fields(self, request, obj=None):
        """Make slug readonly only when published"""
        readonly = ['created_at', 'updated_at']
        if obj and obj.status == Deal.Status.PUBLISHED:
            readonly.append('slug')
        return readonly

    @admin.action(description='Re-extract colors from images')
    def reextract_colors_bulk(self, request, queryset):
        """Bulk action to manually re-extract colors from selected deals"""
        success_count = 0
        error_count = 0

        for deal in queryset:
            if deal.image:
                try:
                    palette_entries = extract_colors_from_url(deal.image.path)

                    # Clear and recreate palette
                    deal.color_palette.all().delete()
                    for entry in palette_entries:
                        entry.deal = deal
                        entry.save()

                    success_count += 1
                except Exception as e:
                    error_count += 1
                    self.message_user(request, f'Error extracting colors for "{deal.name}": {e}', level=messages.ERROR)
            else:
                error_count += 1

        if success_count:
            self.message_user(request, f'Successfully re-extracted colors for {success_count} deal(s)')
        if error_count:
            self.message_user(request, f'{error_count} deal(s) skipped (no image or error)', level=messages.WARNING)

    @admin.action(description='Search for images')
    def image_search_bulk(self, request, queryset):
        """Bulk action to open image search - only works with one selected item"""
        if queryset.count() != 1:
            self.message_user(request, 'Please select exactly one deal to search for images', level=messages.WARNING)
            return

        deal = queryset.first()
        url = reverse('admin_search_images_with_id', args=[deal.pk])
        return HttpResponseRedirect(url)

    @admin.action(description='Publish deals and send notifications')
    def publish_deals_bulk(self, request, queryset):
        """Bulk action to publish selected deals and send notifications"""
        published_count = 0
        already_published = 0
        error_count = 0

        for deal in queryset:
            if deal.status == Deal.Status.PUBLISHED:
                already_published += 1
                continue

            try:
                deal.status = Deal.Status.PUBLISHED
                deal.full_clean()
                deal.save()

                # Send notifications
                notify_deal.delay(deal.pk)

                published_count += 1
            except Exception as e:
                error_count += 1
                self.message_user(request, f'Error publishing "{deal.name}": {e}', level=messages.ERROR)

        if published_count:
            self.message_user(request, f'Published {published_count} deal(s) and queued notifications')
        if already_published:
            self.message_user(request, f'{already_published} deal(s) already published', level=messages.INFO)
        if error_count:
            self.message_user(request, f'{error_count} deal(s) failed validation', level=messages.WARNING)

    @admin.action(description='Send notifications to channels')
    def send_notifications_bulk(self, request, queryset):
        """Bulk action to send notifications for selected deals"""
        task_count = 0
        for deal in queryset:
            notify_deal.delay(deal.pk)
            task_count += 1

        self.message_user(request, f'Queued notifications for {task_count} deal(s) to all auto-notify channels')


class DiscordWebhookConfigInline(admin.StackedInline):
    model = DiscordWebhookConfig
    extra = 0
    min_num = 1  # Require at least one for discord_webhook type
    max_num = 1  # Enforce 1:1 relationship
    can_delete = False

    fields = ['webhook_url', 'username', 'avatar']

    def get_formset(self, request, obj=None, **kwargs):
        """Only show this inline for discord_webhook type channels"""
        formset = super().get_formset(request, obj, **kwargs)
        if obj and obj.type != NotificationChannel.ChannelType.DISCORD_WEBHOOK:
            # Don't show for other types
            return None
        return formset


@admin.register(NotificationChannel)
class NotificationChannelAdmin(ModelAdmin):
    list_display = ('name', 'type', 'active', 'auto_notify', 'created_at')
    list_filter = ('type', 'active', 'auto_notify')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [DiscordWebhookConfigInline]

    fieldsets = (
        ('Channel Information', {
            'fields': ('name', 'type')
        }),
        ('Settings', {
            'fields': ('auto_notify', 'active')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        """Add notification count annotation"""
        qs = super().get_queryset(request)
        return qs.annotate(
            notification_count=models.Count('notification_logs')
        )


@admin.register(NotificationLog)
class NotificationLogAdmin(ModelAdmin):
    list_display = ('deal', 'channel', 'status', 'sent_at')
    list_filter = ('status', 'channel', 'sent_at')
    search_fields = ('deal__name', 'channel__name', 'status_message')
    readonly_fields = ('deal', 'channel', 'status', 'status_message', 'sent_at')
    date_hierarchy = 'sent_at'

    def has_add_permission(self, request):
        """Prevent manual creation of notification logs"""
        return False

    def has_change_permission(self, request, obj=None):
        """Make logs read-only"""
        return False


@admin.register(PushSubscription)
class PushSubscriptionAdmin(ModelAdmin):
    list_display = ('endpoint_preview', 'channel', 'created_at')
    list_filter = ('channel', 'created_at')
    search_fields = ('endpoint',)
    readonly_fields = ('created_at',)

    def endpoint_preview(self, obj):
        return f"{obj.endpoint[:50]}..." if len(obj.endpoint) > 50 else obj.endpoint
    endpoint_preview.short_description = 'Endpoint'
