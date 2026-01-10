# Olly G's Game Deals

Video game deal aggregation site.

# Table Of Contents

- [Overview](#overview)
- [Development](#development)
- [Deployment](#deployment)

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

1. **Copy environment template:**
   ```shell
   cp .env.example .env
   ```

2. **Configure Google APIs:**

   **Google Custom Search API** (for image search):
   - Get your API key from: https://console.cloud.google.com/apis/credentials
   - Create a Custom Search Engine at: https://programmablesearchengine.google.com/
     - Enable "Image search"
     - Set "Sites to search" to `*` (entire web)
   - Add both values to `.env`:
     ```
     GOOGLE_API_KEY=your_api_key_here
     GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
     ```

   **Google OAuth** (for Sign In with Google):
   - Go to https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Client ID (or use existing credentials)
     - Application type: Web application
     - Add authorized redirect URIs:
       - `http://localhost:8000/accounts/google/login/callback/` (development)
       - `https://yourdomain.com/accounts/google/login/callback/` (production)
   - Add the credentials to `.env`:
     ```
     GOOGLE_OAUTH_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
     GOOGLE_OAUTH_SECRET=your_client_secret_here
     ```

3. **Build and start containers:**
   ```shell
   bash scripts/build-images.sh
   docker compose up -d
   ```

4. **Run migrations:**
   ```shell
   docker compose exec web python manage.py migrate
   ```

5. **Create a superuser:**
   ```shell
   docker compose exec web python manage.py createsuperuser
   ```

6. **Access the app:**
   - Website: http://localhost:8000
   - Admin: http://localhost:8000/admin
