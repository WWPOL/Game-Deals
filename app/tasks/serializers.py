"""
Serializers for common app API endpoints.
"""
from rest_framework import serializers
from django_celery_results.models import TaskResult

from tasks.models import UserTask


class UserTaskSerializer(serializers.ModelSerializer):
    """
    Serializer for UserTask model with task status information.
    """
    status = serializers.CharField(read_only=True)
    is_running = serializers.BooleanField(read_only=True)
    is_completed = serializers.BooleanField(read_only=True)
    result = serializers.SerializerMethodField()
    date_done = serializers.SerializerMethodField()

    class Meta:
        model = UserTask
        fields = [
            'id',
            'task_id',
            'task_name',
            'status',
            'is_running',
            'is_completed',
            'result',
            'initiated_at',
            'date_done',
            'seen',
        ]

    def get_result(self, obj):
        """Get the task result if it exists."""
        task_result = obj.task_result
        if task_result and task_result.result:
            return task_result.result
        return None

    def get_date_done(self, obj):
        """Get the date_done from TaskResult if it exists."""
        task_result = obj.task_result
        if task_result and task_result.date_done:
            return task_result.date_done.isoformat()
        return None


class TaskStatusResponseSerializer(serializers.Serializer):
    """
    Serializer for task status API response.
    """
    running_count = serializers.IntegerField()
    recently_completed = UserTaskSerializer(many=True)
