#!/usr/bin/env bash
prog_dir=$(dirname $(realpath "$0"))
backend_dir=$(realpath "$prog_dir/../")
repo_dir=$(realpath "$backend_dir/../")

. "$repo_dir/scripts/common.sh"

log "Backend invocation"

if file_newer "$backend_dir/node_modules" "$backend_dir/yarn.lock"; then
  run_log "yarn install" "$ERR_BACKEND_INSTALL" "Failed to install dependencies"
else
  log "Yarn dependencies up to date"
fi

log "Starting server"
run_log "yarn start" "$ERR_BACKEND_START" "Failed to start server"
