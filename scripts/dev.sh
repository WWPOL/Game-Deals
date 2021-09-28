#!/usr/bin/env bash

show_help() {
  cat <<EOF
dev.sh - Development shortcut script

USAGE

  dev.sh [-h, -r]

OPTIONS

  -h    Show help
  -r    Restart containers which run source code
EOF
}

opt_restart=""
while getopts "hr" opt; do
  case "$opt" in
    h)
      show_help
      exit 0
      ;;
    r) opt_restart=true ;;
  esac
done

if [[ -n "$opt_restart" ]]; then
  docker-compose restart frontend backend
fi

docker-compose up -d
docker-compose logs -f --tail=20 frontend backend
