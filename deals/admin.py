import json
from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.shortcuts import redirect
from django.contrib import messages
from django.conf import settings
from unfold.admin import ModelAdmin
from .models import Deal, PushSubscription
from .forms import DealAdminForm
from .services.image_search import GoogleCustomSearchProvider
from .services.color_extractor import extract_colors_from_url


@admin.register(Deal)
class DealAdmin(ModelAdmin):
    form = DealAdminForm
    list_display = ('name', 'status', 'price', 'expires', 'is_active', 'created_at')
    list_filter = ('status', 'expires', 'created_at')
    search_fields = ('name',)
    readonly_fields = ('slug', 'created_at', 'updated_at', 'image_search_button', 'image_preview', 'color_palette_preview', 'reextract_colors_button')
    fieldsets = (
        ('Main Information', {
            'fields': ('name', 'status', 'image', 'image_preview', 'image_search_button', 'reextract_colors_button')
        }),
        ('Color Palette', {
            'fields': ('palette_colors', 'foreground_color', 'color_palette_preview')
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

    def color_palette_preview(self, obj):
        """Display color palette swatches"""
        if not obj or not obj.palette_colors:
            return "No colors extracted yet"

        swatches_html = '<div style="display: flex; gap: 10px; align-items: center;">'

        # Show all palette colors
        for i, color in enumerate(obj.palette_colors, 1):
            swatches_html += f'''
                <div style="text-align: center;">
                    <div style="width: 60px; height: 60px; background: {color}; border: 2px solid #ddd; border-radius: 5px;"></div>
                    <div style="font-size: 10px; margin-top: 5px; color: #666;">{color}</div>
                    <div style="font-size: 9px; color: #999;">Color {i}</div>
                </div>
            '''

        # Show foreground color with label
        if obj.foreground_color:
            swatches_html += f'''
                <div style="text-align: center; margin-left: 20px;">
                    <div style="width: 60px; height: 60px; background: {obj.foreground_color}; border: 2px solid #ddd; border-radius: 5px;"></div>
                    <div style="font-size: 10px; margin-top: 5px; color: #666;">{obj.foreground_color}</div>
                    <div style="font-size: 9px; color: #999;">Foreground</div>
                </div>
            '''

        swatches_html += '</div>'
        return format_html(swatches_html)
    color_palette_preview.short_description = 'Color Palette'

    def reextract_colors_button(self, obj):
        """Display a button to re-extract colors from current image"""
        if obj and obj.pk and obj.image:
            # Add a form that triggers color re-extraction
            return format_html(
                '''
                <form method="post" action="{}">
                    <input type="hidden" name="csrfmiddlewaretoken" value="{}">
                    <input type="hidden" name="action" value="reextract_colors">
                    <button type="submit" class="button">Re-extract Colors</button>
                </form>
                ''',
                reverse('admin:deals_deal_change', args=[obj.pk]),
                format_html('{}', '')  # CSRF token will be added by Django
            )
        return "Save deal with an image first"
    reextract_colors_button.short_description = 'Re-extract Colors'

    def change_view(self, request, object_id, form_url='', extra_context=None):
        """Handle color re-extraction in change view"""
        if request.method == 'POST' and request.POST.get('action') == 'reextract_colors':
            obj = self.get_object(request, object_id)
            if obj and obj.image:
                try:
                    palette_colors, foreground_color = extract_colors_from_url(obj.image)
                    obj.palette_colors = palette_colors
                    obj.foreground_color = foreground_color
                    obj.save(update_fields=['palette_colors', 'foreground_color'])
                    messages.success(request, 'Colors successfully re-extracted!')
                except Exception as e:
                    messages.error(request, f'Error extracting colors: {e}')
            return redirect('admin:deals_deal_change', object_id)

        return super().change_view(request, object_id, form_url, extra_context)

    def image_search_button(self, obj):
        """Display a button to search for images (only for existing deals)"""
        if obj and obj.pk:
            # Existing deal - show search button
            url = reverse('admin_search_images_with_id', args=[obj.pk])
            return format_html(
                '<a class="button" href="{}" target="_blank">Search for Images</a>',
                url
            )
        else:
            # New deal - auto-find on save, no need for search button
            return "Image will be auto-found when you save"
    image_search_button.short_description = 'Image Search'


@admin.register(PushSubscription)
class PushSubscriptionAdmin(ModelAdmin):
    list_display = ('endpoint_preview', 'channel', 'created_at')
    list_filter = ('channel', 'created_at')
    search_fields = ('endpoint',)
    readonly_fields = ('created_at',)

    def endpoint_preview(self, obj):
        return f"{obj.endpoint[:50]}..." if len(obj.endpoint) > 50 else obj.endpoint
    endpoint_preview.short_description = 'Endpoint'
