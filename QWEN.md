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

## Development Conventions

### Code Structure
- `deals/` - Main application containing models, views, and services
- `config/` - Django project configuration
- Templates are located in `deals/templates/admin/deals/`

### Admin Customization
The admin interface is heavily customized using Django's ModelAdmin with the Unfold theme. Custom functionality includes:
- Automatic image finding when creating new deals
- Color palette extraction from images
- Image search functionality with external API integration
- Custom buttons for re-extracting colors and searching images

### Recent Changes
Fixed CSRF token issue in the "Re-extract Colors" button functionality in the admin interface. The `reextract_colors_button` method in `deals/admin.py` was updated to properly include the CSRF token by accessing the request context.

Fixed CSS gradient artifact in deal detail page. The gradient calculation in `deals/templates/deals/detail.html` was improved to create a smoother transition between colors, eliminating the top-left triangle artifact.

## Key Files and Components

### `deals/admin.py`
Contains the main admin interface customization for the Deal model, including:
- Custom form handling
- Automatic image finding on creation
- Color extraction functionality
- Image search and re-extraction features

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