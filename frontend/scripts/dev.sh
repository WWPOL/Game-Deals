#!/usr/bin/env bash
prog_dir=$(dirname $(realpath "$0"))
frontend_dir=$(realpath "$prog_dir/../")
repo_dir=$(realpath "$frontend_dir/../")

. "$repo_dir/scripts/common.sh"

log "Frontend invocation"

if file_newer "$frontend_dir/node_modules" "$frontend_dir/yarn.lock"; then
  run_log "yarn install" "$ERR_FRONTEND_INSTALL" "Failed to install dependencies"
else
  log "Yarn dependencies up to date"
fi

log "Starting webpack development server"
run_log "yarn start" "$ERR_FRONTEND_START" "Failed to start server"
