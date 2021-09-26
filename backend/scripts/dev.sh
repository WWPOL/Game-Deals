#!/usr/bin/env bash
declare -r PROG_DIR=$(dirname $(realpath "$0"))
declare -r BACKEND_DIR=$(realpath "$PROG_DIR/../")
declare -r REPO_DIR=$(realpath "$BACKEND_DIR/../")

source "$REPO_DIR/scripts/common.sh"

declare -ri EXIT_INSTALL=20
declare -ri EXIT_START=21

log "Backend invocation"

if file_newer "$BACKEND_DIR/node_modules" "$BACKEND_DIR/yarn.lock"; then
  run_log "yarn install" "$EXIT_INSTALL" "Failed to install dependencies"
else
  log "Yarn dependencies up to date"
fi

log "Starting server"
run_log "yarn dev" "$EXIT_START" "Failed to start server"
