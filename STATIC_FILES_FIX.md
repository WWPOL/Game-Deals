# Fix Static Files Not Loading in Production

## Problem
When accessing https://game-deals.k8s.funkyboy.zone, static files (CSS, JS) return HTML error pages instead of the actual files. Browser console shows:

```
The resource from "https://game-deals.k8s.funkyboy.zone/static/css/common.css" was blocked due to MIME type ("text/html") mismatch
```

## Root Cause
Django with Gunicorn does not serve static files by default in production. The `/app/staticfiles/` directory exists and contains the collected static files, but there's no mechanism to serve them at the `/static/` URL path.

## Current State
- Static files are collected to `/app/staticfiles/` during build
- Django settings: `STATIC_URL = 'static/'` and `STATIC_ROOT = BASE_DIR / 'staticfiles'`
- Gunicorn is running without static file serving capability
- Requests to `/static/*` are hitting Django views, which return 404/500 error HTML pages

## Solution Options

### Option 1: Add WhiteNoise Middleware (Recommended)
WhiteNoise allows Django to serve static files efficiently in production with Gunicorn.

**Steps:**
1. Check if `whitenoise` is in `requirements.txt`, add if not: `whitenoise>=6.6.0`
2. Update `config/settings.py`:
   - Add to `INSTALLED_APPS`: `'whitenoise.runserver_nostatic',` (before `django.contrib.staticfiles`)
   - Add to `MIDDLEWARE` after `SecurityMiddleware`: `'whitenoise.middleware.WhiteNoiseMiddleware',`
   - Update storage backend for static files:
     ```python
     STORAGES = {
         # ... existing config ...
         "staticfiles": {
             "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
         },
     }
     ```
3. Rebuild Docker image
4. Redeploy to Kubernetes

**Pros:**
- Simple, Django-native solution
- No infrastructure changes needed
- Compression and caching built-in
- Standard practice for Django production deployments

**Cons:**
- Slightly more memory usage in Django pods

### Option 2: Add Nginx Sidecar Container
Deploy Nginx alongside Django to serve static files.

**Steps:**
1. Create Nginx config to serve `/static/` from volume
2. Add emptyDir volume to deployment
3. Add init container to copy static files to shared volume
4. Add Nginx sidecar container
5. Update service to expose both containers
6. Update ingress to route `/static/*` to Nginx

**Pros:**
- Offloads static file serving from Django
- More traditional architecture

**Cons:**
- More complex deployment
- Additional container overhead
- More infrastructure to maintain

## Recommended Approach
**Use WhiteNoise** (Option 1) - it's the standard Django production practice, requires minimal changes, and is well-supported.

## Implementation Checklist
- [ ] Add `whitenoise>=6.6.0` to `requirements.txt` if not present
- [ ] Update `config/settings.py` to configure WhiteNoise middleware and storage
- [ ] Test locally with `DEBUG=False` to verify static files load
- [ ] Rebuild Docker image with new tag
- [ ] Update Kubernetes deployment image tag
- [ ] Deploy and verify static files load at https://game-deals.k8s.funkyboy.zone
- [ ] Check browser console for no MIME type errors

## Verification Steps
After deployment:
1. Visit https://game-deals.k8s.funkyboy.zone
2. Open browser DevTools Console
3. Verify no "MIME type mismatch" errors
4. Check Network tab - `/static/` requests should return 200 with correct Content-Type
5. Verify page styling appears correct

## Related Files
- `/app/config/settings.py` - Django settings (line 193-197 for STATIC_* config)
- `/app/requirements.txt` - Python dependencies
- `/app/Dockerfile` - Image build process
- Kubernetes deployment at `deployment/base/django/`
