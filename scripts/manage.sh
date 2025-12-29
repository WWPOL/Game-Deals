#!/usr/bin/env bash
set -euo pipefail

docker compose exec web python manage.py "$@"
