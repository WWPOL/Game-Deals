# Game-Deals Kubernetes Manifests

This directory contains Kustomize base manifests for deploying Game-Deals to Kubernetes.

## Structure

```
k8s/
├── base/              # Base manifests (reference from other repos)
│   ├── app/           # Shared Django/Celery/Flower deployment base
│   ├── postgres/      # PostgreSQL StatefulSet
│   ├── redis/         # Redis Deployment
│   ├── django/        # Django web service
│   ├── celery/        # Celery worker
│   └── flower/        # Flower monitoring UI
└── examples/
    └── dev/           # Example overlay for development environment
```

## Using from Another Repository

Reference these base manifests from your GitOps/deployment repo using a Git URL:

```yaml
# your-deployment-repo/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- https://github.com/WWPOL/Game-Deals.git//k8s/base?ref=master

namespace: game-deals-prod

images:
- name: ghcr.io/wwpol/game-deals
  newTag: master-abc1234567  # Use actual commit SHA from CI/CD

replicas:
- name: django
  count: 3
- name: celery
  count: 5

secretGenerator:
- name: postgres-secret
  envs:
  - postgres.env
- name: app-secret
  envs:
  - app-secret.env

configMapGenerator:
- name: app-config
  envs:
  - app-config.env
```

## Secrets and Config Format

### postgres.env
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password-here
```

### app-secret.env
Contains sensitive application secrets (passwords, API keys, etc.):
```
SECRET_KEY=a-more-secure-key-here
DATABASE_URL=postgresql://postgres:password@postgres:5432/game_deals
GOOGLE_API_KEY=your-google-api-key-here

# Optional: S3-compatible storage credentials (if using S3)
# S3_ACCESS_KEY=your-access-key
# S3_SECRET_KEY=your-secret-key
```

### app-config.env
Contains non-sensitive application configuration:
```
DEBUG=false
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
SITE_URL=https://yourdomain.com
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
FLOWER_URL=http://app-flower:5555
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id

# Optional: S3-compatible storage config (if using S3)
# USE_S3_STORAGE=true
# S3_BUCKET_NAME=your-bucket-name
# S3_REGION=us-east-1
# S3_ENDPOINT_URL=https://your-endpoint.com
# S3_CUSTOM_DOMAIN=cdn.yourdomain.com
```

## Components

- **Postgres**: StatefulSet with 1Gi PVC
- **Redis**: Deployment (ephemeral)
- **Django**: Web service exposed on port 8000
- **Celery**: Background worker (no service)
- **Flower**: Celery monitoring UI exposed on port 5555

All components use common labels:
- `app.kubernetes.io/name: game-deals`
- `project: game-deals`
- `component: <postgres|redis|django|celery|flower>`
