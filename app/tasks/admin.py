from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.http import HttpResponseRedirect
from unfold.admin import ModelAdmin
from django_object_actions import DjangoObjectActions
from celery import current_app
from datetime import datetime
from django_celery_results.models import TaskResult

from tasks.models import UserTask
from deals.admin_mixins import unfold_action
from common.permissions import CommonPermission


class TaskStatusFilter(admin.SimpleListFilter):
    """Custom filter for task status since it's a property, not a DB field."""

    title = "status"
    parameter_name = "status"

    def lookups(self, request, model_admin):
        """Return list of status options."""
        return (
            ("PENDING", "Pending"),
            ("STARTED", "Started"),
            ("SUCCESS", "Success"),
            ("FAILURE", "Failure"),
            ("REVOKED", "Revoked"),
        )

    def queryset(self, request, queryset):
        """Filter the queryset based on selected status."""
        if self.value():
            # Get all UserTask IDs that have matching status
            task_ids = []
            for user_task in queryset:
                if user_task.status == self.value():
                    task_ids.append(user_task.pk)
            return queryset.filter(pk__in=task_ids)
        return queryset


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
        TaskStatusFilter,
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
    actions = ["force_finish_tasks"]
    change_actions = ["view_in_flower", "view_task_result", "force_finish_task_single"]

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
                    "status": "REVOKED",
                    "result": '{"message": "Task forcibly cancelled by admin"}',
                    "date_done": datetime.now(),
                    "task_name": user_task.task_name,
                },
            )

            # Mark as seen so user knows it's been handled
            user_task.seen = True
            user_task.save()

            count += 1

        self.message_user(request, f"Successfully cancelled {count} task(s).")

    force_finish_tasks.short_description = "Force finish and cancel selected tasks"

    def has_view_in_flower_permission(self, request, obj=None):
        """Only show Flower link if user has permission."""
        return request.user.has_perm(CommonPermission.CAN_VIEW_FLOWER.value)

    @unfold_action(label="View in Flower", short_description="View task in Flower")
    def view_in_flower(self, request, obj):
        """Redirect to Flower task detail page."""
        # Build Flower URL
        flower_url = reverse("admin_flower", kwargs={"path": f"task/{obj.task_id}"})
        return HttpResponseRedirect(flower_url)

    @unfold_action(
        label="View Task Result", short_description="View task result details"
    )
    def view_task_result(self, request, obj):
        """Redirect to TaskResult admin page if it exists."""
        result = obj.task_result
        if not result:
            self.message_user(request, "Task result not found yet.", level="warning")
            return HttpResponseRedirect(request.META.get("HTTP_REFERER", "../"))

        # Redirect to TaskResult admin change page
        result_url = reverse(
            "admin:django_celery_results_taskresult_change", args=[result.pk]
        )
        return HttpResponseRedirect(result_url)

    @unfold_action(
        label="Force Finish & Cancel",
        short_description="Force finish and cancel this task",
    )
    def force_finish_task_single(self, request, obj):
        """Object action to force a single task to finish and cancel it."""
        # Call bulk logic with a queryset of one item
        queryset = UserTask.objects.filter(pk=obj.pk)
        self.force_finish_tasks(request, queryset)
