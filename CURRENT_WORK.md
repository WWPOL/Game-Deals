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
- [ ] **Color Palette Refactoring to Relational Database** (see `/home/noah/.claude/plans/structured-stargazing-river.md`)
  - Replacing JSON `palette_colors` field with relational `ColorPalette` model
  - Each palette entry has: `background_color`, `foreground_color`, `weight` (0-1)
  - Weight-based ordering (most prominent first)
  - Admin UI: TabularInline with click-to-edit color preview widget
  - Auto-extraction toggle: `auto_extract_palette` boolean field
  - Templates: Dynamic percentage calculation from weights

### Recently Fixed ✓
1. [x] ColorPaletteInline - weight field now visible/editable in admin (moved to 2nd position after preview)
2. [x] ColorPaletteInline - preview fixed, shows color preview instead of dash even for new objects
   - Uses `format_html()` directly instead of widget rendering
   - Pre-formats percentage string (format_html doesn't support `{:.1%}` specifiers)
3. [x] Default behavior fixed - no longer creates empty white/white entries (min_num = 0)
4. [x] ColorPaletteInline - bg/fg fields hidden by default with click-to-edit (CSS/JS added)
   - Created `deals/static/admin/css/colorpalette_inline.css` for styling
   - Created `deals/static/admin/js/colorpalette_inline.js` for click toggle
   - Fields show when clicking preview row

### Color Palette Refactoring Complete ✓
All work from plan `/home/noah/.claude/plans/structured-stargazing-river.md` is now complete:
- ✓ ColorPalette relational model with weight-based ordering
- ✓ Deal.save() ensures at least one ColorPalette entry (creates default theme colors)
- ✓ Removed deprecated foreground_color and palette_colors fields
- ✓ Views updated with prefetch_related for performance
- ✓ Templates updated to use ColorPalette relationship (no hardcoded fallbacks)
- ✓ Image search view creates ColorPalette instances
- ✓ Admin interface with preview and edit functionality
- ✓ Template tags for gradients, colors, and percentages
- ✓ Migrations regenerated (fresh 0001_initial.py)

### Discord Notification System Complete ✓
- ✓ Created notification models:
  - `NotificationChannel` - Base channel config with auto_notify (default: True) and active flags
  - `DiscordWebhookConfig` - Discord-specific config (1:1 with NotificationChannel)
  - `NotificationLog` - Tracks notification history with success/failed status
- ✓ Implemented Celery tasks in `deals/tasks.py`:
  - `send_discord_webhook` - Send notification to single channel
  - `notify_deal` - Send to multiple channels with force option
- ✓ Created Discord notification service in `deals/services/discord_notifier.py`
  - Rich embed with game image, pricing, expiration
  - Color extracted from deal's palette
  - Proper error handling with DiscordNotificationError
- ✓ Admin interface enhancements:
  - NotificationChannel admin with DiscordWebhookConfig inline
  - NotificationLog admin (read-only)
  - NotificationLogInline added to DealAdmin (tabular view of notification history)
- ✓ Auto-notification on deal publish
  - Triggers when deal status changes to published
  - Sends to all channels with auto_notify=True
- ✓ Admin UI improvements:
  - Moved slug to Metadata section (collapsed)
  - Reordered fields: price before original_price
  - Fixed invalid field reference error (removed notifications_sent field)

### Notification Action Refactoring Complete ✓
- ✓ Removed send_notifications actions from DealAdmin (both single and bulk)
- ✓ Added NotificationChannelAdmin actions:
  - Single object action: "Send Notifications" button on channel detail page
  - Bulk action: "Send notifications for selected deals" in channel list
- ✓ Created deal selection workflow:
  - Created `SelectDealsForm` with CheckboxSelectMultiple widget
  - Created `select_deals_to_notify` view at `deals/views.py`
  - Added URL routes at `config/urls.py:17-18`
  - Custom `DealMultipleChoiceField` shows deal status in labels
- ✓ Created admin template helpers:
  - `admin_render()` helper function in `deals/admin_helpers.py`
  - `base_admin_page.html` template that includes Unfold theme + branding
  - Templates now properly inherit sidebar, header, and branding
- ✓ Created template at `deals/templates/admin/deals/select_deals_to_notify.html`
  - Checkbox list with scrollable container
  - Shows channel info with TEST badge for test channels
  - Proper Unfold theme styling

### Test Channel Support Complete ✓
- ✓ Added `is_test_channel` field to NotificationChannel model (default: False)
- ✓ Test channels can receive notifications for draft deals (for testing)
- ✓ Non-test channels can only receive published deal notifications
- ✓ SelectDealsForm shows draft+published deals for test channels, published-only for others
- ✓ Validation prevents draft deals from being sent to non-test channels
- ✓ Template shows TEST badge next to test channels
- ✓ Deal status displayed in checkbox labels (e.g., "Game Name (Published)")

### Select2 Searchable Deal Selection Complete ✓
- ✓ Added django-select2~=8.2 package to requirements.txt
- ✓ Added django_select2 to INSTALLED_APPS in settings.py
- ✓ Added select2 URLs to urlpatterns (path('select2/', include('django_select2.urls')))
- ✓ Replaced CheckboxSelectMultiple with Select2MultipleWidget in SelectDealsForm
- ✓ Configured widget with data-placeholder and data-width attributes
- ✓ Updated help text to clarify search and multi-select behavior
- ✓ Fixed Select2 initialization issue:
  - Root cause: Unfold's base_simple.html doesn't include jQuery
  - Solution: Added jQuery to base_admin_page.html extrahead block
  - jQuery now loads before form.media (Select2 scripts)
- ✓ Removed custom checkbox styling from template
- ✓ Deal selection now uses searchable dropdown with type-to-filter functionality

### Reusable Template Components Complete ✓
- ✓ Created `deals/templates/components/deal_card.html` - Full detail view component
  - Includes all CSS, animations, and JavaScript for blob background
  - Contains deal title with shimmer effect, DRAFT badge, image card, pricing, expiry
  - Self-contained with `{% load deal_colors %}` tag
  - Reduced detail.html from 430 to 60 lines
- ✓ Created `deals/templates/components/deal_list_item.html` - Grid card component
  - Home page grid item with image, pricing badge, title, expiry
  - Self-contained with deal_variables and deal_scope
  - Reduced inline HTML duplication in home.html
- ✓ Updated templates to use components via `{% include %}`
  - detail.html: `{% include 'components/deal_card.html' with deal=deal %}`
  - home.html: `{% include 'components/deal_list_item.html' with deal=deal %}`
- ✓ Created background components:
  - `deals/templates/components/blob_background.html` - Blob animation background with color palette
  - `deals/templates/components/wave_background.html` - Wave animation for home page

### Deal Navigation Pagination Complete ✓
- ✓ Created `DealQuerySet` custom queryset with `active()` method
  - Filters non-expired deals with permission awareness (staff vs public)
  - Always excludes drafts (even for admins) for consistent pagination
  - Attached to Deal model via `objects` manager
  - Reusable across views for consistent active deal filtering
- ✓ Added `deals/view_helpers.py` module with pagination context helper
  - `get_deal_pagination_context()` generates navigation context
  - Returns active deal count, current position, previous/next deals, first deal
  - Linear navigation (no wrapping at boundaries)
- ✓ Refactored pagination into modular components:
  - `deal_pagination_header.html`: Pill-shaped badge with count/position
    - Game controller emoji (🎮) as visual indicator
    - Deal color background with border and glow effects
    - Compact two-line layout fits in navigation bar
    - Centered in site header between brand and subscribe button
    - Clickable badge links to first active deal
  - `deal_pagination_prev.html`: Fixed previous button (left side, vertical middle)
  - `deal_pagination_next.html`: Fixed next button (right side, vertical middle)
  - Navigation buttons labeled "Previous Deal" / "Next Deal" for clarity
  - Disabled state shown at boundaries (opacity-30, cursor-not-allowed)
- ✓ Layout improvements:
  - Pagination header integrated into site navigation (base.html)
  - Back button moved to deal title row (same line as title and DRAFT badge)
  - Back button added as optional parameter to deal_card component
- ✓ Integrated pagination into views:
  - `DealDetailView`: Shows linear navigation between active deals
  - Both views share same logic via helper function

### Home Page & Browse Page Redesign Complete ✓
- ✓ Transformed home page into dual-mode experience:
  - **Featured Mode**: Shows when active deals exist
    - Displays first active deal with full detail view (deal_card component)
    - Includes prev/next navigation buttons for carousel experience
    - Uses blob background based on deal's color palette
  - **Browse Mode**: Shows when no active deals exist
    - Friendly "No Active Deals Right Now" message with emoji
    - Filter UI for browsing expired deals
    - Deal grid with pagination controls
- ✓ Created dedicated browse page at `/browse/`:
  - Always shows filterable deal grid (no featured mode)
  - Full filtering and pagination controls
  - Wave background animation using all visible deals' color palettes
  - Added "Browse All" link to site header navigation
- ✓ Created reusable filter component:
  - `deals/templates/components/deal_filter_ui.html` - Extracted filter form
  - Search, sort, price range, status filters
  - Staff-only draft toggle
  - Shared between home.html and browse.html
- ✓ Created `DealFilterMixin` for shared view logic:
  - Contains `get_filter_form()` - Form validation from GET parameters
  - Contains `get_queryset()` - All filtering logic (search, price, status, sorting)
  - Contains `add_filter_context()` - Shared context data for templates
  - Both `HomeView` and `BrowseView` inherit from mixin
  - Eliminates code duplication between views
  - HomeView adds featured deal and pagination context
  - BrowseView uses only shared filter context

### Mobile Responsive Design Complete ✓
- ✓ Deal detail page mobile improvements:
  - Image aspect ratio adapts to screen size (3:4 on mobile, 4:3 on tablet, 16:9 on desktop)
  - More vertical space for deal image on mobile devices
  - Header section stacks vertically on mobile (back button on own line above title)
  - Horizontal layout on desktop (back button, title, and badges on same line)
- ✓ Navigation redesign for mobile:
  - Created `nav_items.html` component for DRY menu structure
  - Mobile: Hamburger menu with dropdown for navigation links
  - Desktop: Centered active deals badge with right-aligned nav items
  - Brand name no longer wraps (whitespace-nowrap)
  - Mobile menu includes Browse All, Subscribe to Alerts (commented), and Go to Console
- ✓ Active deals badge improvements:
  - Changed from rounded-full to rounded-lg (prevents circular appearance)
  - Added whitespace-nowrap to prevent multi-line text wrapping
  - Better mobile display with proper width
- ✓ Deal color context refactoring:
  - Centralized deal_variables and deal_scope logic in base.html
  - Automatically applies deal colors to nav, content, and footer
  - Works for both deal detail page (deal) and home page (first_active_deal)
  - Removed redundant template code from home.html and detail.html
  - Single source of truth for deal context handling

### Next Steps
1. Current celery task view for admins (on the admin page make a little badge in the top bar which shows the number of currently running celery tasks that are a result of that admin user, make it refresh periodically and pop little "request.message" style messages when a task is done, this will let us move workflows like color pallete extraction into async tasks while still notifying the user when they are done)
2. Channel message preview page (for each channel a deal would be sent to on a new page show a preview of the message for that channel, the preview template should be selected by the channel type)
3. active deals header doesn't show up on browse all page

### Wish List
1. Web push notification implementation
2. Subscription endpoints for web push
3. Add more notification channel types (Email, etc.)

## Blockers
None currently

## Notes
- Using Django 5.2 with Python 3.13
- Alpine-based Docker images for smaller size
- PostgreSQL 16 (later changed to 18 by user)
- No health checks or depends_on in docker-compose per user preference
