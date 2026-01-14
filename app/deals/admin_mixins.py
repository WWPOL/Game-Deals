"""
Custom admin decorators and mixins for integrating django-object-actions with Unfold theme.
"""
from functools import wraps


def unfold_action(label=None, short_description=None):
    """
    Decorator that configures a django-object-actions action with Unfold theme styling.

    This decorator automatically adds the correct CSS classes to match the Unfold admin theme,
    ensuring action buttons look consistent with the History/View on site buttons.

    Usage:
        @unfold_action(label="My Action", short_description="Does something")
        def my_action(self, request, obj):
            # action code here
            pass
    """
    def decorator(func):
        # Unfold theme classes for action buttons (matches History/View on site buttons)
        unfold_link_classes = 'cursor-pointer flex grow items-center gap-2 px-3 py-2 text-left whitespace-nowrap'

        # Set the attrs attribute for django-object-actions
        func.attrs = {'class': unfold_link_classes}

        # Set label and description if provided
        if label:
            func.label = label
        if short_description:
            func.short_description = short_description

        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        # Copy attributes to wrapper
        wrapper.attrs = func.attrs
        if hasattr(func, 'label'):
            wrapper.label = func.label
        if hasattr(func, 'short_description'):
            wrapper.short_description = func.short_description

        return wrapper

    return decorator
