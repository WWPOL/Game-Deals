#!/usr/bin/env bash
prog_dir=$(dirname $(realpath "$0"))
frontend_dir=$(realpath "$prog_dir/../")
repo_dir=$(realpath "$frontend_dir/../")

source "$repo_dir/scripts/common.sh"

declare -ri EXIT_INSTALL=20
declare -ri EXIT_START=21

log "Frontend invocation"

if file_newer "$frontend_dir/node_modules" "$frontend_dir/yarn.lock"; then
  run_log "yarn install" "$EXIT_INSTALL" "Failed to install dependencies"
else
  log "Yarn dependencies up to date"
fi

log "Starting webpack development server"
run_log "yarn start" "$EXIT_START" "Failed to start server"
