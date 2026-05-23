# Olly G's Game Deals

Video game deal aggregation site.

# Table Of Contents

- [Overview](#overview)
- [Development](#development)
- [Deployment](#deployment)
- [Operations](#operations)

# Overview

Friendly website which provides those interested in gaming with notifications about the latest video games deals.

**Commitments**:

- We will never post affiliate links to the site
- We will never place ads on the site
- We will never accept money to feature a game on the site

**FAQ**  

- **Why?**: For many years one of our friend's named Oliver (aka Olly G) has been sending us deals on
  games which he finds on the internet. We thought it was about time he have a nice official place to 
  put these deals. So that everyone in the world can benefit from his kindness. 
- **So how are you making money?**: We are not, this is and always will be purely a hobby site. 
  Everyone involved has comfortable jobs which provide our living wages. We do not feel the need to 
  make money off of this side project.
- **I have a game deal I'd like to share, how can I?**: Create an issue with the [`game deal` tag](https://github.com/WWPOL/Game-Deals/labels/game%20deal). 
  Please provide the game name, discounted price, image for the game, when the deal will expire, and
  a link to the location users can find the deal. Remember we do not accept affiliate links. A 
  maintainer will review your deal as soon as possible.
- **I have an idea of how to improve the site, can I contribute?**: Sure! We would love your help. See the [Contributing](./CONTRIBUTING.md) documentation on how to get started.

[This project was made possible by our contributors](./CONTRIBUTORS.md). Want to help out? See [`CONTRIBUTING.md`](./CONTRIBUTING.md).

# Development

A Django app with Celery for background tasks.

## Setup

1. Set environment variables
  - Make a copy of [[app/.env.example]] named `.env`
  - Follow instructions in [Configuration](#configuration) to obtain values
2. Build and start containers
  - Build the base image for the development Docker container (you must rebuild this any time you change Python dependencies):
    ```bash
    ./scripts/build-images.sh
    ```
  - Start containers:
    ```bash
    docker compose up -d
    ```
3. Complete [First Time Setup](#first-time-setup)

The app will then be accessible at http://localhost:8000

## Services

The following services run in Docker Compose:

- **web** (Django) - http://localhost:8000
- **postgres** - PostgreSQL database
- **redis** - Redis cache and message broker
- **celery** - Background task worker
- **celery-beat** - Task scheduler
- **flower** - Celery monitoring UI at http://localhost:5555

# Operations
## Configuration
Environment variables are used for configuration.

- **Google Custom Search API** (for image search):
  - Get your API key from: https://console.cloud.google.com/apis/credentials
  - Create a Custom Search Engine at: https://programmablesearchengine.google.com/
    - Enable "Image search"
    - Set "Sites to search" to `*` (entire web)
  - Set env vars with values from dashboard:
    - `GOOGLE_API_KEY`
    - `GOOGLE_SEARCH_ENGINE_ID`
- **Google OAuth** (for Sign In with Google):
  - Go to https://console.cloud.google.com/apis/credentials
  - Create OAuth 2.0 Client ID (or use existing credentials)
    - Application type: Web application
    - Add authorized redirect URIs:
      - `http://localhost:8000/accounts/google/login/callback/` (development)
      - `https://yourdomain.com/accounts/google/login/callback/` (production)
  - Set env vars with values from dashboard:
    - `GOOGLE_OAUTH_CLIENT_ID`
    - `GOOGLE_OAUTH_SECRET`

## First Time Setup
Some actions must be completed once to finish setting up the site:

> Note: For local development you can run `manage.py` in the Docker dev container using `./scripts/manage.sh`

1. Run migrations:
   ```bash
   ./manage.py migrate
   ```
2. Create an initial admin user:
   ```bash
   ./manage.py createsuperuser
   ```
3. Update the site domain:
   ```bash
   ./manage.py update_site_domain
   ```

# Operations
## Migrating Deals
To migrate deals from the legacy Firebase setup to this Django app:

1. Download the deals from Firebase:
   ```bash
   ./manage.py download_firebase --project-id <GCP PROEJCT ID> <OUT FILE>
   ```
2. Import the deals into the deals table:
   ```bash
   ./manage.py migrate_firebase <OUT FILE>
   ```
3. Queue jobs to download the images for the deals:
   ```bash
   ./manage.py queue_download_images
   ```
   
# Troubleshooting
## View On Site Button Goes To Wrong Domain
In the admin panel while viewing a deal, if you click "View On Site" and it takes you to the wrong domain your Django site domain may be set incorrectly. To fix:

1. Make sure you have set the `SITE_URL` environment variable
2. Run the `update_site_domain` management script:
   ```bash
   ./manage.py update_site_domain
   ```
3. Restart the Django app process
