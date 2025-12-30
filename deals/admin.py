import json
from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.shortcuts import redirect
from django.contrib import messages
from django.conf import settings
from unfold.admin import ModelAdmin
from django_object_actions import DjangoObjectActions
from .models import Deal, PushSubscription
from .forms import DealAdminForm
from .services.image_search import GoogleCustomSearchProvider
from .services.color_extractor import extract_colors_from_url


@admin.register(Deal)
class DealAdmin(DjangoObjectActions, ModelAdmin):
    form = DealAdminForm
    list_display = ('name', 'status', 'price', 'expires', 'is_active', 'created_at')
    list_filter = ('status', 'expires', 'created_at')
    search_fields = ('name',)
    readonly_fields = ('slug', 'created_at', 'updated_at', 'image_search_button', 'image_preview')
    fieldsets = (
        ('Main Information', {
            'fields': ('name', 'status', 'image', 'image_preview', 'image_search_button')
        }),
        ('Color Palette', {
            'fields': ('palette_colors', 'foreground_color')
        }),
        ('Pricing', {
            'fields': ('price',)
        }),
        ('Details', {
            'fields': ('expires', 'link')
        }),
        ('Auto-Generated & Metadata', {
            'fields': ('slug', 'notifications_sent', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        """Automatically find image on creation if not set"""
        # Ensure palette_colors is always set to at least an empty list
        if not obj.palette_colors:
            obj.palette_colors = []

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
                    first_image = image_results[0].url
                    palette_colors, foreground_color = extract_colors_from_url(first_image)

                    obj.image = first_image
                    obj.palette_colors = palette_colors
                    obj.foreground_color = foreground_color

                    messages.success(request, f'Automatically found and set image for "{obj.name}"')
                else:
                    messages.warning(request, f'No images found for "{obj.name}"')

            except Exception as e:
                messages.error(request, f'Error finding image: {e}')

        super().save_model(request, obj, form, change)

    def get_changeform_initial_data(self, request):
        """Populate initial data from URL parameters"""
        initial = super().get_changeform_initial_data(request)
        # Get values from URL parameters for image search
        if 'image' in request.GET:
            initial['image'] = request.GET['image']
        if 'palette_colors' in request.GET:
            try:
                initial['palette_colors'] = json.loads(request.GET['palette_colors'])
            except json.JSONDecodeError:
                pass
        if 'foreground_color' in request.GET:
            initial['foreground_color'] = request.GET['foreground_color']
        return initial

    def image_preview(self, obj):
        """Display current image preview"""
        if obj and obj.image:
            return format_html(
                '<img src="{}" style="max-width: 400px; max-height: 300px; border: 1px solid #ddd; border-radius: 5px;">',
                obj.image
            )
        return "No image selected"
    image_preview.short_description = 'Current Image'

    def reextract_colors(self, request, obj):
        """Action to re-extract colors from current image"""
        if obj and obj.image:
            try:
                palette_colors, foreground_color = extract_colors_from_url(obj.image)
                obj.palette_colors = palette_colors
                obj.foreground_color = foreground_color
                obj.save(update_fields=['palette_colors', 'foreground_color'])
                self.message_user(request, 'Colors successfully re-extracted!')
            except Exception as e:
                self.message_user(request, f'Error extracting colors: {e}', level=messages.ERROR)
        else:
            self.message_user(request, 'No image to extract colors from.', level=messages.WARNING)

        # Redirect back to the same change form
        return redirect('admin:deals_deal_change', object_id=obj.pk)

    # Configure the object action
    reextract_colors.label = "Re-extract Colors"
    reextract_colors.short_description = "Extract color palette from current image"

    # Add the action to the change form
    change_actions = ('reextract_colors',)


    def image_search(self, request, obj):
        """Action to search for images for this deal"""
        if obj and obj.pk:
            # Redirect to the image search page in a new window/tab
            from django.http import HttpResponseRedirect
            from django.urls import reverse
            url = reverse('admin_search_images_with_id', args=[obj.pk])
            # This will open in the same window, but we can't control that with object actions
            return HttpResponseRedirect(url)
        else:
            self.message_user(request, 'Please save the deal first before searching for images.', level=messages.WARNING)
            return None  # Return to the same page

    # Configure the object action
    image_search.label = "Search for Images"
    image_search.short_description = "Open image search in a new tab"

    # Add the action to the change form
    change_actions = ('reextract_colors', 'image_search')


@admin.register(PushSubscription)
class PushSubscriptionAdmin(ModelAdmin):
    list_display = ('endpoint_preview', 'channel', 'created_at')
    list_filter = ('channel', 'created_at')
    search_fields = ('endpoint',)
    readonly_fields = ('created_at',)

    def endpoint_preview(self, obj):
        return f"{obj.endpoint[:50]}..." if len(obj.endpoint) > 50 else obj.endpoint
    endpoint_preview.short_description = 'Endpoint'
