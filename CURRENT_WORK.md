# Current Work Tracker

## Current Phase: Phase 2 - Models & Migrations

### Phase 1 Completed ✓
- [x] Created Django project structure
- [x] Set up Docker Compose with PostgreSQL, Redis, Celery, Celery Beat
- [x] Configured database settings with dj-database-url
- [x] Added Celery configuration to Django
- [x] All containers running successfully
- [x] Created scripts/manage.sh for container management

### Phase 2 Completed ✓
- [x] Create Deal model
- [x] Create PushSubscription model
- [x] Run migrations
- [x] Create Django admin customizations
- [x] Fix Docker permissions with non-root user

### Phase 3 Completed ✓
- [x] Create base template
- [x] Create home page view (active deals list)
- [x] Create deal detail view with animated background
- [x] Configure URLs
- [x] Add custom admin actions (django-object-actions)
- [x] Integrate Unfold admin theme
- [x] Implement automatic image search on deal creation
- [x] Add color palette extraction from images
- [x] Create image search interface in admin
- [x] Fix gradient rendering artifacts

## Current Phase: Admin Enhancements & Automation

### Recently Completed ✓
- [x] Implement automatic Unfold theme styling for django-object-actions
  - Created `unfold_action` decorator in `deals/admin_mixins.py`
  - Applied decorator to "Re-extract Colors" and "Search for Images" actions
  - Removed manual CSS styling in favor of automatic class injection
- [x] Add automatic color palette re-extraction on image URL change
  - Detects when image URL is modified on existing deals
  - Automatically re-extracts colors from new image
  - Shows success/error messages for re-extraction
- [x] Enhanced deal detail page with palette-based styling
  - Made header visible on detail page with transparent blur effect
  - Added subtle shimmer effect to title outline using palette colors
  - Styled subscribe button with palette color gradients
  - Implemented floating footer with price, expiration, and CTA button
  - Applied frosted glass effects to header and footer
  - Added palette-based glowing effects to price tag and button
  - Fixed image shadow to fit actual dimensions
  - Fixed JSON parsing bug in ColorPaletteWidget for admin updates
  - Title positioned over video game cover image with dramatic shadows
- [x] Color palette diversity improvements
  - Added perceptual color distance calculation
  - Selects visually distinct colors ensuring minimum distance between palette colors
  - Uses 12+ k-means clusters, then selects most diverse subset
  - Prevents similar shades from dominating the palette (e.g., 5 purples when yellow/blue exist)
- [x] Slug management enhancements
  - Changed slug format to year/month/name (e.g., 2025/12/far-cry)
  - Slug editable in admin when status is draft
  - Slug locked as readonly when status is published
  - URL pattern updated to support path slugs with slashes
  - Changed slug field from SlugField to CharField to allow slashes
- [x] Admin workflow improvements
  - Added bulk action to re-extract colors from multiple deals
  - Added bulk action for image search (single selection only)
  - Moved slug to Basic Information section for better visibility
  - Reorganized admin form: Basic Info → Deal Details → Image → Status → Color Palette
- [x] Error handling
  - Created project-wide 404 error page with user-friendly design
  - Added config/views.py with handler404 and handler500
  - Registered error handlers in config/urls.py
  - Added test URL (/test-404/) for viewing 404 page in DEBUG mode
- [x] Pricing features
  - Added optional original_price field to show discount savings
  - Displays strikethrough original price before sale price
  - Shows on both home page and detail page
  - Helps users see the value of the deal
- [x] Documentation improvements
  - Added critical reminder to CLAUDE.md to update CURRENT_WORK.md with every commit
- [x] Home page filtering and pagination
  - Added comprehensive filtering system using Django forms for validation
  - Search by game name (case-insensitive)
  - Sort options: newest, price (low to high), price (high to low), expiring soon
  - Price range filter using price_gt and price_lt parameters (free, under $10, $10-$20, $20-$30, $30+)
  - Status filter: active, expired, all deals
  - Staff-only: Toggle to show/hide draft deals
  - Pagination controls with page numbers and previous/next buttons
  - Filter state preserved across pagination
  - Visual indicators: EXPIRED banner and DRAFT badge on deal cards
  - Context-aware empty state with clear filters button
  - Active filters summary with individual remove options

### In Progress
- [ ] Push notification implementation
- [ ] Subscription endpoints for web push

### Next Steps
1. Implement web push notifications for new deals
2. Create subscription management endpoints
3. Add Celery tasks for scheduled notifications
4. Test notification delivery across channels

## Blockers
None currently

## Notes
- Using Django 5.2 with Python 3.13
- Alpine-based Docker images for smaller size
- PostgreSQL 16 (later changed to 18 by user)
- No health checks or depends_on in docker-compose per user preference
