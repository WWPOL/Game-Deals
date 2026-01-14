"""Helper utilities for custom admin views"""

from django.contrib import admin
from django.shortcuts import render


def admin_render(request, template_name, context=None):
    """
    Render a template with admin site context automatically included.

    Usage:
        return admin_render(request, 'admin/deals/my_template.html', {
            'my_data': data,
        })

    This is equivalent to:
        context = {
            **admin.site.each_context(request),
            'my_data': data,
        }
        return render(request, 'admin/deals/my_template.html', context)
    """
    if context is None:
        context = {}

    # Merge admin context with provided context
    full_context = {
        **admin.site.each_context(request),
        **context,
    }

    return render(request, template_name, full_context)
