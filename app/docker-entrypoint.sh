#!/bin/sh
set -euo pipefail

# Set default workers to 3 if not provided
WORKERS=${WORKERS:-3}

echo "Starting Gunicorn with $WORKERS workers"

# Start Gunicorn with the specified number of workers
set -x
exec gunicorn --bind 0.0.0.0:8000 --workers "$WORKERS" config.wsgi:application