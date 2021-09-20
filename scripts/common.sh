#!/usr/bin/env bash
readonly TRUE=$(true; echo "$?")
readonly FALSE=$(false; echo "$?")

readonly EXIT_FILE_NEWER_DATE=10

# Outputs log line stdout
log() { # ( msg )
  local -r msg="$1"
  
  echo "$(date --iso-8601=seconds) $msg"
}

# Outputs error to stderr
elog() { # ( msg )
  local -r msg="$1"
  log "error: $msg" >&2
}

# Exit with code and message
die() { # ( code, msg )
  local -ri code="$1"
  local -r msg="$2"
  
  elog "$msg"
  exit "$code"
}

# Check if the last command failed, if so die with args
run_check() { # ( cmd, code, fail msg )
  local -r cmd="$1"
  local -ri code="$2"
  local -r fail_msg="$3"

  if ! $cmd; then
	  elog "Traceback: $(echo ${FUNCNAME[@]} | sed 's/ / < /')"
	  die "$code" "$fail_msg"
  fi
}

# Compares if file $base is newer than $compare
file_newer() { # ( base, compare )
  # Args
  local -r base="$1"
  local -r compare="$2"

  # Get ages
  local base_age=$(run_check "date -r $base +%s" "$EXIT_FILE_NEWER_DATE" "failed to get $base file edit date")

  local compare_age=$(run_check "date -r $compare +%s" "$EXIT_FILE_NEWER_DATE" "failed to get $compare file edit date")

  if ((base_age > compare_age)); then
    return "$TRUE"
  fi
  
  return "$FALSE"
}

# Run a command and prefix output for logging
run_log() { # ( cmd, code, fail_msg )
  local -r cmd="$1"
  local -ri code="$2"
  local -r fail_msg="$3"

  log "+ $cmd"
  while read line; do
    if [ -n "$line" ]; then
      log "$line"
    fi
  done < <(run_check "$cmd" "$code" "$fail_msg")
}
