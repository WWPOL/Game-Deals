#!/usr/bin/env bash
set -euo pipefail

# Get current user's UID and GID
USER_ID=${UID:-$(id -u)}
GROUP_ID=${GID:-$(id -g)}

echo "Building Docker images with UID=${USER_ID} GID=${GROUP_ID}"

docker compose build \
  --build-arg UID="${USER_ID}" \
  --build-arg GID="${GROUP_ID}" \
  "$@"
