#!/usr/bin/env bash
declare -r PROG_DIR=$(dirname $(realpath "$0"))
declare -r BACKEND_DIR=$(realpath "$PROG_DIR/../")
declare -r REPO_DIR=$(realpath "$BACKEND_DIR/../")

source "$REPO_DIR/scripts/common.sh"

declare -ri EXIT_INSTALL=120
declare -ri EXIT_START=121

log "Backend invocation"

log "GAME_DEALS_DB_AUTO_MIGRATE='$GAME_DEALS_DB_AUTO_MIGRATE'"


if [[ ! -d "$BACKEND_DIR/node_modules" ]] || file_newer "$BACKEND_DIR/node_modules" "$BACKEND_DIR/yarn.lock"; then
  run_log "yarn install" "$EXIT_INSTALL" "Failed to install dependencies"
else
  log "Yarn dependencies up to date"
fi

log "Starting server"
run_check "yarn dev" "$EXIT_START" "Failed to start server"
