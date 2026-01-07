# Game-Deals Kubernetes Manifests

This directory contains Kustomize base manifests for deploying Game-Deals to Kubernetes.

## Structure

```
k8s/
├── base/              # Base manifests (reference from other repos)
│   ├── app/           # Shared Django/Celery deployment base
│   ├── postgres/      # PostgreSQL StatefulSet
│   ├── redis/         # Redis Deployment
│   ├── django/        # Django web service
│   └── celery/        # Celery worker
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
- name: django-secret
  envs:
  - django.env
```

## Secrets Format

### postgres.env
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password-here
```

### django.env
```
DATABASE_URL=postgresql://postgres:password@postgres:5432/game_deals
```

## Local Testing

Build and test the manifests locally:

```bash
# From this repo
cd k8s/examples/dev
kustomize build .

# Or apply directly
kubectl apply -k k8s/examples/dev
```

## Components

- **Postgres**: StatefulSet with 1Gi PVC
- **Redis**: Deployment (ephemeral)
- **Django**: Web service exposed on port 8000
- **Celery**: Background worker (no service)

All components use common labels:
- `app.kubernetes.io/name: game-deals`
- `project: game-deals`
- `component: <postgres|redis|django|celery>`
