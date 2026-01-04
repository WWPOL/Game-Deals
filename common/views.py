"""
Views for common app functionality.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.utils import timezone
from datetime import timedelta

from .models import UserTask
from .serializers import UserTaskSerializer


class TaskStatusAPIView(APIView):
    """
    API endpoint that returns task status for the current user.

    Returns:
        JSON: {
            "running_count": int,
            "recently_completed": [
                {
                    "task_id": str,
                    "task_name": str,
                    "status": str,
                    "is_running": bool,
                    "is_completed": bool,
                    "result": any,
                    "initiated_at": str (ISO format),
                    "date_done": str (ISO format),
                    "seen": bool,
                },
                ...
            ]
        }
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Handle GET requests for task status."""
        user = request.user

        # Get all tasks for this user
        user_tasks = UserTask.objects.filter(user=user).order_by('-initiated_at')

        # Count running tasks
        running_count = sum(1 for task in user_tasks if task.is_running)

        # Get recently completed tasks (completed in last 5 minutes, not yet seen)
        five_minutes_ago = timezone.now() - timedelta(minutes=5)
        recently_completed = [
            task for task in user_tasks
            if task.is_completed
            and task.initiated_at >= five_minutes_ago
            and not task.seen
        ]

        # Serialize the data
        completed_serializer = UserTaskSerializer(recently_completed, many=True)

        return Response({
            'running_count': running_count,
            'recently_completed': completed_serializer.data,
        })

    def post(self, request):
        """Mark tasks as seen."""
        user = request.user
        task_ids = request.data.get('task_ids', [])

        if task_ids:
            UserTask.objects.filter(
                user=user,
                task_id__in=task_ids
            ).update(seen=True)

        return Response({'success': True})
