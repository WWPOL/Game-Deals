"""
Celery utilities for user-tracked tasks.
"""

from celery import shared_task, Task
from functools import wraps
import logging

from tasks.middleware import get_current_user
from tasks.models import UserTask

logger = logging.getLogger(__name__)


class UserTrackedTask(Task):
    """
    Custom Celery task base class that tracks which user initiated the task.

    The user_id is automatically captured from the current request context
    (via thread-local storage) and stored in task metadata. A UserTask record
    is created to track the task for notification purposes.
    """

    def apply_async(self, args=None, kwargs=None, **options):
        """Override to automatically store user_id and create UserTask record."""
        # Get current user from thread-local storage
        user = get_current_user()
        if user and user.is_authenticated:
            headers = options.get("headers", {})
            headers["user_id"] = user.id
            options["headers"] = headers
            logger.debug(f"Task {self.name} initiated by user {user.id}")

        # Call parent to get the AsyncResult
        result = super().apply_async(args, kwargs, **options)

        # Create UserTask record if we have a user
        if user and user.is_authenticated:
            UserTask.objects.create(
                user=user,
                task_id=result.id,
                task_name=self.name,
            )
            logger.info(
                f"Created UserTask record for {self.name} (ID: {result.id}) - User: {user.username}"
            )

        return result


def user_tracked_task(*task_args, **task_kwargs):
    """
    Decorator for creating user-tracked Celery tasks.

    Automatically captures the current user from the request context and
    stores their ID in task metadata for filtering and monitoring.

    Usage:
        @user_tracked_task()
        def my_task(arg1, arg2):
            ...

        # Call normally - user is captured automatically:
        my_task.delay(arg1, arg2)
    """

    def decorator(func):
        # Set base class for the task
        task_kwargs["base"] = UserTrackedTask
        task_kwargs["bind"] = True  # Bind to get access to self (task instance)

        @shared_task(*task_args, **task_kwargs)
        @wraps(func)
        def wrapped_task(self, *args, **kwargs):
            # Log user_id if available in task headers
            user_id = None
            if hasattr(self.request, "headers") and self.request.headers:
                user_id = self.request.headers.get("user_id")

            if user_id:
                logger.info(
                    f"Task {self.name} (ID: {self.request.id}) running for user {user_id}"
                )

            # Call the original function (without self, since original function doesn't expect it)
            return func(*args, **kwargs)

        return wrapped_task

    return decorator
