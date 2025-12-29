from django.contrib import admin
from .models import Deal, PushSubscription


@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'is_free', 'expires', 'is_active', 'created_at')
    list_filter = ('is_free', 'expires', 'created_at')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Deal Information', {
            'fields': ('name', 'price', 'is_free', 'expires', 'image', 'link')
        }),
        ('Notification Tracking', {
            'fields': ('notifications_sent',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('endpoint_preview', 'channel', 'created_at')
    list_filter = ('channel', 'created_at')
    search_fields = ('endpoint',)
    readonly_fields = ('created_at',)

    def endpoint_preview(self, obj):
        return f"{obj.endpoint[:50]}..." if len(obj.endpoint) > 50 else obj.endpoint
    endpoint_preview.short_description = 'Endpoint'
