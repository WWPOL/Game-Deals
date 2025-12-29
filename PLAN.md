# Game Deals - Django Reimplementation Plan

## Overview
Recreate the Firebase/Gatsby Game Deals platform using Django, Django REST Framework, and Celery.

## Technology Stack

### Backend
- **Django 5.2**: Core web framework
- **Django REST Framework**: API endpoints
- **PostgreSQL**: Primary database
- **Celery**: Async task processing (notifications, Discord webhooks)
- **Redis**: Celery broker and cache
- **Channels**: WebSocket support for real-time updates

### Frontend (Future Phase)
- React or Next.js (TBD)
- WebSocket client for real-time deal updates

### Infrastructure
- **Docker Compose**: Development environment
- **Push Notifications**: Web Push with VAPID keys
- **Discord Integration**: Webhook-based embeds

## Data Models

### Deal Model
```python
class Deal(models.Model):
    name = models.CharField(max_length=255)  # Game title
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_free = models.BooleanField(default=False)
    expires = models.DateTimeField()  # Deal expiration
    image = models.URLField(max_length=500)  # Game image URL
    link = models.URLField(max_length=500)  # Store URL
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Notification tracking (JSON field)
    notifications_sent = models.JSONField(default=dict)
    # Structure: {"main": true, "test": false, ...}
```

### Admin Model
```python
class Admin(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
```

### PushSubscription Model
```python
class PushSubscription(models.Model):
    endpoint = models.URLField(unique=True)
    auth = models.CharField(max_length=255)
    p256dh = models.CharField(max_length=255)
    channel = models.CharField(max_length=50, default='main')
    created_at = models.DateTimeField(auto_now_add=True)
```

## API Endpoints (DRF)

### Authentication
- **Method**: Django REST Framework Token Authentication
- **Static API Tokens**: Each admin user gets a persistent token
- **Permissions**:
  - Read (GET): Public (no authentication required)
  - Write (POST/PUT/PATCH/DELETE): Admin only (requires token + is_staff=True)

### Endpoints (Using Default ViewSets)
- `GET /api/deals/` - List active deals (public)
- `GET /api/deals/{id}/` - Deal detail (public)
- `POST /api/deals/` - Create deal (admin only)
- `PUT /api/deals/{id}/` - Update deal (admin only)
- `PATCH /api/deals/{id}/` - Partial update (admin only)
- `DELETE /api/deals/{id}/` - Delete deal (admin only)
- `POST /api/deals/{id}/notify/` - Send notification (admin only, custom action)

- `POST /api/subscriptions/` - Subscribe to notifications (public)
- `DELETE /api/subscriptions/` - Unsubscribe (public)

- `POST /api/auth/token/` - Obtain auth token (admin login)

## Celery Tasks

### Push Notification Task
```python
@shared_task
def send_push_notification(deal_id, channel='main'):
    """Send web push notification to all subscribers of a channel"""
    # Fetch deal
    # Get all subscriptions for channel
    # Send push notification to each subscription
    # Handle failures gracefully
```

### Discord Webhook Task
```python
@shared_task
def send_discord_webhook(deal_id):
    """Send Discord embed for a deal"""
    # Fetch deal
    # Build Discord embed payload
    # POST to Discord webhook URL
    # Log result
```

### Notification Task (Combined)
```python
@shared_task
def notify_deal(deal_id, channel='main', force=False):
    """
    Send notifications for a deal (both push and Discord)
    - Check if already sent (unless force=True)
    - Call send_push_notification.delay()
    - Call send_discord_webhook.delay()
    - Update deal.notifications_sent[channel] = True
    """
```

### Cleanup Task
```python
@shared_task
def cleanup_expired_deals():
    """Delete deals older than 30 days after expiration"""
    # Run daily via Celery beat
```

## Implementation Phases

### Phase 1: Core Backend Setup ✓
- [x] Django project structure
- [x] Docker Compose setup (Postgres, web)
- [ ] Add Redis container
- [ ] Add Celery worker container
- [ ] Configure Celery with Django

### Phase 2: Models & Migrations
- [ ] Create Deal model
- [ ] Create Admin model
- [ ] Create PushSubscription model
- [ ] Run migrations
- [ ] Create admin panel customizations

### Phase 3: DRF API
- [ ] Install Django REST Framework
- [ ] Configure DRF settings (TokenAuthentication)
- [ ] Create serializers (DealSerializer, SubscriptionSerializer)
- [ ] Create viewsets using ModelViewSet (default viewsets)
- [ ] Create custom permission class (IsAdminOrReadOnly)
- [ ] Configure router and URLs
- [ ] Add filtering (active deals queryset for public)
- [ ] Generate admin tokens via Django shell or management command

### Phase 4: Real-time Updates (WebSockets)
- [ ] Install Django Channels
- [ ] Configure WebSocket consumers
- [ ] Broadcast deal updates on create/update/delete
- [ ] Client subscription to deal updates

### Phase 5: Push Notifications
- [ ] Generate VAPID keys
- [ ] Install pywebpush
- [ ] Implement subscription endpoint
- [ ] Create Celery task for sending push notifications
- [ ] Test with browser notifications

### Phase 6: Discord Integration
- [ ] Configure Discord webhook URL (environment variable)
- [ ] Create Discord embed builder
- [ ] Create Celery task for Discord webhooks
- [ ] Test embed formatting

### Phase 7: Admin Features
- [ ] Image search API integration (RapidAPI contextual web search)
- [ ] Deal preview functionality
- [ ] Notification management UI (backend)
- [ ] Duplicate notification prevention logic

### Phase 8: Frontend (Future)
- [ ] Choose framework (React/Next.js)
- [ ] Home page with deal list
- [ ] Admin page with deal CRUD
- [ ] Notification subscription UI
- [ ] WebSocket integration for real-time updates

### Phase 9: Deployment
- [ ] Production Docker setup
- [ ] Environment configuration
- [ ] CI/CD pipeline
- [ ] Monitoring and logging

## Environment Variables

```env
# Django
SECRET_KEY=
DEBUG=
ALLOWED_HOSTS=

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://redis:6379/0

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Push Notifications
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_ADMIN_EMAIL=

# Discord
DISCORD_WEBHOOK_URL=

# External APIs
RAPIDAPI_KEY=
```

## Migration Strategy

### Data Migration (if needed)
- Export deals from Firestore
- Transform to Django model format
- Bulk create via management command

### Subscription Migration
- FCM topics → Individual push subscriptions
- Migrate existing tokens (if possible)
- Announce migration to users

## Key Differences from Original

1. **Database**: Firestore → PostgreSQL (relational, better querying)
2. **Backend**: Firebase Functions → Django (full-featured web framework)
3. **Auth**: Firebase Auth → Django auth with OAuth (more control)
4. **Real-time**: Firestore snapshots → WebSockets (Channels)
5. **Notifications**: FCM topics → Individual push subscriptions (more granular)
6. **Admin**: Custom Gatsby page → Django Admin + DRF browsable API
7. **Async**: Cloud Functions → Celery tasks (more robust task management)

## Testing Strategy

- Unit tests for models
- API tests for all endpoints
- Integration tests for Celery tasks
- End-to-end tests for notification flow
- Load testing for concurrent notifications

## Security Considerations

- CORS configuration for frontend
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure storage of VAPID keys and webhook URLs
- Admin authentication required for sensitive operations
- HTTPS only in production
