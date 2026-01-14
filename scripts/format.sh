#!/usr/bin/env bash
set -euo pipefail
readonly PROG_DIR=$(dirname $(realpath "$0"))

black "${PROG_DIR}/../app/"
