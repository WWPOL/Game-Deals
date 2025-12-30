import json
from django import forms
from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.shortcuts import redirect
from django.contrib import messages
from django.conf import settings
from unfold.admin import ModelAdmin
from django_object_actions import DjangoObjectActions
from .models import Deal, PushSubscription, ColorPalette
from .forms import DealAdminForm
from .services.image_search import GoogleCustomSearchProvider
from .services.color_extractor import extract_colors_from_url
from .admin_mixins import unfold_action
from .widgets import ColorPickerWidget, ColorPalettePreviewWidget


class ColorPaletteInlineForm(forms.ModelForm):
    class Meta:
        model = ColorPalette
        fields = ['background_color', 'foreground_color', 'weight']
        widgets = {
            'background_color': ColorPickerWidget(),
            'foreground_color': ColorPickerWidget(),
        }


class ColorPaletteInline(admin.TabularInline):
    model = ColorPalette
    form = ColorPaletteInlineForm
    extra = 0
    min_num = 0  # Don't auto-create empty rows
    max_num = 6
    can_delete = True

    fields = ['color_preview', 'weight', 'background_color', 'foreground_color']
    readonly_fields = ['color_preview']
    ordering = ['-weight']

    class Media:
        css = {
            'all': ('admin/css/colorpalette_inline.css',)
        }
        js = ('admin/js/colorpalette_inline.js',)

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
    actions = ['reextract_colors_bulk', 'image_search_bulk']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug')
        }),
        ('Deal Details', {
            'fields': ('original_price', 'price', 'link', 'expires')
        }),
        ('Image', {
            'fields': ('image', 'image_preview', 'auto_extract_palette')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Metadata', {
            'fields': ('notifications_sent', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        """Automatically find image on creation if not set, and re-extract colors when image changes if auto_extract is enabled"""
        # Check if image URL has changed (for updates)
        image_changed = False
        if change and obj.pk:
            try:
                original_obj = Deal.objects.get(pk=obj.pk)
                if original_obj.image != obj.image and obj.image:
                    image_changed = True
            except Deal.DoesNotExist:
                pass

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
                    obj.image = first_image

                    # Only extract colors if auto_extract is enabled
                    if obj.auto_extract_palette:
                        palette_entries = extract_colors_from_url(first_image)

                        # Save Deal first to get pk for ColorPalette entries
                        super().save_model(request, obj, form, change)

                        # Create ColorPalette entries
                        for entry in palette_entries:
                            entry.deal = obj
                            entry.save()

                        messages.success(request, f'Automatically found image and extracted {len(palette_entries)} colors')
                        return  # Don't call super() again
                    else:
                        messages.success(request, f'Automatically found and set image for "{obj.name}"')
                else:
                    messages.warning(request, f'No images found for "{obj.name}"')

            except Exception as e:
                messages.error(request, f'Error finding image: {e}')
        elif image_changed and obj.auto_extract_palette:
            # Image URL was changed and auto-extract is enabled - re-extract colors
            try:
                palette_entries = extract_colors_from_url(obj.image)

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

    def get_changeform_initial_data(self, request):
        """Populate initial data from URL parameters"""
        initial = super().get_changeform_initial_data(request)
        # Get values from URL parameters for image search
        if 'image' in request.GET:
            initial['image'] = request.GET['image']
        if 'palette_colors' in request.GET:
            try:
                palette_colors = request.GET['palette_colors']
                # Check if it's already a list (from Django's query param parsing) or a JSON string
                if isinstance(palette_colors, list):
                    initial['palette_colors'] = palette_colors
                else:
                    initial['palette_colors'] = json.loads(palette_colors)
            except (json.JSONDecodeError, TypeError):
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

    @unfold_action(label="Re-extract Colors", short_description="Extract color palette from current image")
    def reextract_colors(self, request, obj):
        """Action to manually re-extract colors from current image"""
        if obj and obj.image:
            try:
                palette_entries = extract_colors_from_url(obj.image)

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
            # For image search, we want to open in a new tab, but django-object-actions
            # doesn't support this directly. We'll redirect to the URL which will be
            # handled by the existing view.
            from django.http import HttpResponseRedirect
            from django.urls import reverse
            url = reverse('admin_search_images_with_id', args=[obj.pk])
            return HttpResponseRedirect(url)
        else:
            self.message_user(request, 'Please save the deal first before searching for images.', level=messages.WARNING)
            return None  # Return to the same page

    # Add both actions to the change form
    change_actions = ('reextract_colors', 'image_search')

    def get_readonly_fields(self, request, obj=None):
        """Make slug readonly only when published"""
        readonly = ['created_at', 'updated_at', 'image_preview']
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
                    palette_entries = extract_colors_from_url(deal.image)

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
        from django.http import HttpResponseRedirect
        url = reverse('admin_search_images_with_id', args=[deal.pk])
        return HttpResponseRedirect(url)


@admin.register(PushSubscription)
class PushSubscriptionAdmin(ModelAdmin):
    list_display = ('endpoint_preview', 'channel', 'created_at')
    list_filter = ('channel', 'created_at')
    search_fields = ('endpoint',)
    readonly_fields = ('created_at',)

    def endpoint_preview(self, obj):
        return f"{obj.endpoint[:50]}..." if len(obj.endpoint) > 50 else obj.endpoint
    endpoint_preview.short_description = 'Endpoint'
