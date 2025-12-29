from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django import forms
from unfold.admin import ModelAdmin
from .models import Deal, PushSubscription


@admin.register(Deal)
class DealAdmin(ModelAdmin):
    list_display = ('name', 'status', 'price', 'expires', 'is_active', 'created_at')
    list_filter = ('status', 'expires', 'created_at')
    search_fields = ('name',)
    readonly_fields = ('slug', 'created_at', 'updated_at', 'image_search_button', 'image_preview')
    fieldsets = (
        ('Main Information', {
            'fields': ('name', 'status', 'image', 'image_preview', 'image_search_button', 'primary_color', 'secondary_color')
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

    def get_changeform_initial_data(self, request):
        """Populate initial data from URL parameters"""
        initial = super().get_changeform_initial_data(request)
        # Get values from URL parameters for image search
        if 'image' in request.GET:
            initial['image'] = request.GET['image']
        if 'primary_color' in request.GET:
            initial['primary_color'] = request.GET['primary_color']
        if 'secondary_color' in request.GET:
            initial['secondary_color'] = request.GET['secondary_color']
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

    def image_search_button(self, obj):
        """Display a button to search for images"""
        if obj and obj.pk:
            # Existing deal
            url = reverse('admin_search_images_with_id', args=[obj.pk])
            return format_html(
                '<a class="button" href="{}" target="_blank">Search for Images</a>',
                url
            )
        else:
            # New deal - use JavaScript to get the name field value
            url = reverse('admin_search_images')
            return format_html(
                '<a class="button" href="#" onclick="window.open(\'{}\' + \'?name=\' + encodeURIComponent(document.getElementById(\'id_name\').value || \'\'), \'_blank\'); return false;">Search for Images</a>',
                url
            )
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
