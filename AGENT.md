# Game-Deals Project

## Project Overview

Game-Deals is a Django-based web application that manages game deals, allowing users to track and display current game promotions. The application features an admin interface for managing deals, including functionality to automatically find game images, extract color palettes from images, and search for additional images.

### Key Features
- Deal management with pricing and expiration tracking
- Automatic image finding for new deals using Google Custom Search API
- Color palette extraction from game images to enhance visual presentation
- Admin interface with custom functionality for image management
- Push notification support for deal updates

### Architecture
- **Backend**: Django web framework
- **Admin Interface**: Uses the `unfold` admin theme
- **Database**: Standard Django ORM (configuration not visible in current files)
- **Image Processing**: Custom color extraction service
- **External APIs**: Google Custom Search API for image search

## Building and Running

### Prerequisites
- Docker and Docker Compose
- Python 3.x (for local development)
- Dependencies listed in `requirements.txt` and `requirements-dev.txt`

### Setup
1. Build and start the Docker containers: `docker-compose up --build`
2. Run migrations: `docker-compose exec web python manage.py migrate`
3. Create a superuser: `docker-compose exec web python manage.py createsuperuser`

### Key Commands
- `docker-compose up --build` - Start the application in Docker containers
- `docker-compose exec web python manage.py runserver` - Run Django development server in container
- `docker-compose exec web python manage.py migrate` - Apply database migrations
- `docker-compose exec web python manage.py createsuperuser` - Create admin user
- `docker-compose down` - Stop all containers

### Container Structure
- `web` container: Runs the Django application
- `dev.Dockerfile`: Defines the development Docker image
- `docker-compose.yml`: Orchestrates the containers

### Development Notes
- The Django application automatically reloads when code changes are made (no manual restart required)
- Changes to the Python code are reflected immediately in the running container due to volume mounting
- **IMPORTANT**: Django commands must be run inside the Docker container using `docker-compose exec web python manage.py <command>`
- Alternatively, you can use `./manage.sh <command>` as a shortcut for `manage.py` commands (runs inside the container automatically)

### Debugging Tips
- To debug Django admin readonly fields, add logging statements to understand parameter values
- Use `getattr(obj, 'attribute_name', 'default_value')` to safely access object attributes
- When readonly fields show as dashes, ensure the method always returns visible HTML content
- Check that the object has the expected attributes (pk, image, etc.) before showing interactive elements
- For proper logging in Django, import logging at the module level: `import logging; logger = logging.getLogger(__name__)`
- Django logging may require configuration in settings.py to output to console in Docker containers
- To view Django logs in Docker, check container logs with `docker-compose logs web`

## Development Conventions

### Code Structure
- `deals/` - Main application containing models, views, and services
- `config/` - Django project configuration
- Templates are located in `deals/templates/admin/deals/`

### Admin Customization
The admin interface is heavily customized using Django's ModelAdmin with the Unfold theme. Custom functionality includes:
- Automatic image finding when creating new deals
- Color palette extraction from images
- Automatic color re-extraction when image URL changes
- Image search functionality with external API integration
- Custom object actions with Unfold theme styling (`unfold_action` decorator in `deals/admin_mixins.py`)

### Maintaining This Documentation
**IMPORTANT**: This file documents the overall project architecture and setup. For tracking current work progress and recent changes, use `CURRENT_WORK.md` instead.

When making significant architectural changes or adding new features:
1. Update this file to reflect new components, patterns, or conventions
2. Keep descriptions high-level and focused on "what exists" not "what changed"
3. Update `CURRENT_WORK.md` for tracking active development and recent completions
4. Commit both files together when documenting major milestones

## Key Files and Components

### `deals/admin.py`
Contains the main admin interface customization for the Deal model, including:
- Custom form handling
- Automatic image finding on creation
- Automatic color re-extraction when image changes
- Color extraction functionality
- Image search and re-extraction features

### `deals/admin_mixins.py`
Contains decorators and mixins for admin customization:
- `unfold_action` decorator - Automatically applies Unfold theme CSS classes to django-object-actions buttons

### `deals/templates/deals/detail.html`
Template for displaying individual deal details with animated background based on extracted colors.

### `deals/models.py`
Defines the Deal model with fields for:
- Game name and status
- Pricing information
- Image URL and color palette data
- Expiration dates and links

## Migration Management

### Recreating Undeployed Migrations
When working on a feature and you need to modify database schema that hasn't been deployed yet, it's more efficient to recreate migrations rather than creating incremental ones:

1. Unapply existing migrations: `docker-compose exec web python manage.py migrate <app_name> zero`
2. Delete migration files: `rm <app_name>/migrations/000*.py`
3. Regenerate migrations: `docker-compose exec web python manage.py makemigrations`
4. Apply new migrations: `docker-compose exec web python manage.py migrate`

This approach keeps the migration history clean during active development before deployment.

### `deals/services/`
Contains business logic modules:
- `color_extractor.py` - Handles color palette extraction from images
- `image_search.py` - Interfaces with Google Custom Search API

### `deals/templates/admin/deals/search_images.html`
Template for the image search functionality in the admin interface.

## Testing

Testing commands would typically include:
- `python manage.py test` - Run all tests
- Specific test modules may exist in the `deals/tests/` directory (not visible in current exploration)

## Configuration

Environment variables needed:
- `GOOGLE_API_KEY` - Google API key for image search
- `GOOGLE_SEARCH_ENGINE_ID` - Google Custom Search Engine ID
- Standard Django settings for database, secret key, etc.