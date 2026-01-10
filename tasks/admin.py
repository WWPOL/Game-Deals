from django.contrib import admin
from unfold.admin import ModelAdmin
from django_object_actions import DjangoObjectActions
from celery import current_app
from datetime import datetime
from django_celery_results.models import TaskResult

from tasks.models import UserTask
from deals.admin_mixins import unfold_action


@admin.register(UserTask)
class UserTaskAdmin(DjangoObjectActions, ModelAdmin):
    """Admin for UserTask."""
    list_display = (
        "user",
        "task_name",
        "status",
        "initiated_at",
    )
    list_filter = (
        "user",
        "task_name",
    )
    fields = (
        "user",
        "task_name",
        "task_id",
        "seen",
    )
    readonly_fields = (
        "initiated_at",
        "status",
    )
    actions = ['force_finish_tasks']
    change_actions = ['force_finish_task_single']

    def status(self, obj):
        return obj.status

    def has_add_permission(self, request, obj=None):
        return False

    def force_finish_tasks(self, request, queryset):
        """
        Bulk action to force tasks to finish and cancel them.

        Revokes the Celery task and creates/updates the TaskResult to mark it as REVOKED.
        """
        count = 0
        for user_task in queryset:
            # Revoke the Celery task
            current_app.control.revoke(user_task.task_id, terminate=True)

            # Create or update TaskResult to mark as REVOKED
            TaskResult.objects.update_or_create(
                task_id=user_task.task_id,
                defaults={
                    'status': 'REVOKED',
                    'result': '{"message": "Task forcibly cancelled by admin"}',
                    'date_done': datetime.now(),
                    'task_name': user_task.task_name,
                }
            )

            # Mark as seen so user knows it's been handled
            user_task.seen = True
            user_task.save()

            count += 1

        self.message_user(request, f"Successfully cancelled {count} task(s).")
    force_finish_tasks.short_description = "Force finish and cancel selected tasks"

    @unfold_action(label="Force Finish & Cancel", short_description="Force finish and cancel this task")
    def force_finish_task_single(self, request, obj):
        """Object action to force a single task to finish and cancel it."""
        # Call bulk logic with a queryset of one item
        queryset = UserTask.objects.filter(pk=obj.pk)
        self.force_finish_tasks(request, queryset)
