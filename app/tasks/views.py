"""
Views for tasks app functionality.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.utils import timezone
from datetime import timedelta

from tasks.models import UserTask
from tasks.serializers import UserTaskSerializer


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

        # Get running tasks
        running_tasks = [task for task in user_tasks if task.is_running]

        # Get recently completed tasks for notifications (last 5 minutes, not yet seen)
        five_minutes_ago = timezone.now() - timedelta(minutes=5)
        recently_completed_unseen = [
            task for task in user_tasks
            if task.is_completed
            and task.initiated_at >= five_minutes_ago
            and not task.seen
        ]

        # Get recently completed tasks for popover (last 15 minutes, up to 5 tasks)
        fifteen_minutes_ago = timezone.now() - timedelta(minutes=15)
        recently_completed_all = [
            task for task in user_tasks
            if task.is_completed
            and task.initiated_at >= fifteen_minutes_ago
        ][:5]  # Limit to 5 most recent

        # Serialize the data
        running_serializer = UserTaskSerializer(running_tasks, many=True)
        completed_unseen_serializer = UserTaskSerializer(recently_completed_unseen, many=True)
        completed_all_serializer = UserTaskSerializer(recently_completed_all, many=True)

        return Response({
            'running_count': len(running_tasks),
            'running_tasks': running_serializer.data,
            'recently_completed': completed_unseen_serializer.data,  # For notifications
            'recently_completed_all': completed_all_serializer.data,  # For popover
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
