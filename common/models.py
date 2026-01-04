"""
Models for common app.
"""
from django.db import models
from django.contrib.auth.models import User
from django_celery_results.models import TaskResult


class UserTask(models.Model):
    """
    Tracks which user initiated a Celery task.

    This allows efficient querying of tasks by user without parsing JSON,
    and enables features like task completion notifications.

    Note: TaskResult records may not exist for PENDING/STARTED tasks,
    so we store task_id and look up the result dynamically.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='initiated_tasks',
        help_text="User who initiated this task"
    )
    task_id = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="Celery task ID"
    )
    task_name = models.CharField(
        max_length=255,
        help_text="Name of the task (e.g., 'deals.tasks.notify_deal')"
    )
    seen = models.BooleanField(
        default=False,
        help_text="Whether user has been notified of task completion"
    )
    initiated_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the task was initiated"
    )

    class Meta:
        indexes = [
            models.Index(fields=['user', '-initiated_at']),
            models.Index(fields=['user', 'seen']),
        ]
        ordering = ['-initiated_at']

    def __str__(self):
        return f"{self.user.username} - {self.task_name} ({self.task_id[:8]}...)"

    @property
    def task_result(self):
        """Get the TaskResult for this task if it exists."""
        try:
            return TaskResult.objects.get(task_id=self.task_id)
        except TaskResult.DoesNotExist:
            return None

    @property
    def status(self):
        """Get the current status of the task."""
        result = self.task_result
        if result:
            return result.status
        return 'PENDING'

    @property
    def is_running(self):
        """Check if the task is currently running."""
        return self.status in ('PENDING', 'STARTED')

    @property
    def is_completed(self):
        """Check if the task has completed (success or failure)."""
        return self.status in ('SUCCESS', 'FAILURE')
