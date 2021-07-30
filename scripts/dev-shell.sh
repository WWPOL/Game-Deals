#!/usr/bin/env bash

die() {
  echo "Error: $@" >&2
  exit 1
}

while getopts "h" opt; do
  case "$opt" in
    h)
      cat <<EOF
dev-shell.sh - Open a shell into a development container

USAGE

    dev-shell.sh SVC

ARGUMENTS

    SVC    Server to open shell for. Choices: frontend, backend.

EOF
  esac
done

shift $((OPTIND-1))

svc="$1"
if [ -z "$svc" ]; then
  die "SVC argument required"
fi

container=""
case "$svc" in
  frontend) container=frontend ;;
  server) container=backend ;;
  *) die "Invalid SVC value" ;;
esac

set -x
docker-compose exec "$container" bash
