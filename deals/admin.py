from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from .models import Deal, PushSubscription


@admin.register(Deal)
class DealAdmin(ModelAdmin):
    list_display = ('name', 'status', 'price', 'expires', 'is_active', 'created_at')
    list_filter = ('status', 'expires', 'created_at')
    search_fields = ('name',)
    readonly_fields = ('slug', 'created_at', 'updated_at', 'image_search_button')
    fieldsets = (
        ('Main Information', {
            'fields': ('name', 'status')
        }),
        ('Pricing', {
            'fields': ('price',)
        }),
        ('Details', {
            'fields': ('expires', 'link', 'image', 'image_search_button')
        }),
        ('Auto-Generated & Metadata', {
            'fields': ('slug', 'notifications_sent', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def image_search_button(self, obj):
        """Display a button to search for images"""
        if obj.pk:
            url = reverse('deals:search_images', args=[obj.pk])
            return format_html(
                '<a class="button" href="{}" target="_blank">Search for Images</a>',
                url
            )
        return "Save the deal first to search for images"
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
