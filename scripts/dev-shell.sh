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

compose_svc=""
bin=("bash")

case "$svc" in
  postgres)
    compose_svc=postgres
    bin=("psql" "--username" "devgamedeals" "--host" "postgres")
    ;;
  frontend) compose_svc=frontend ;;
  backend) compose_svc=backend ;;
  *) die "Invalid SVC value" ;;
esac

set -x
docker-compose run --rm "$compose_svc" "${bin[@]}"
