#!/usr/bin/env bash
readonly TRUE=$(true; echo "$?")
readonly FALSE=$(false; echo "$?")

readonly ERR_UNKNOWN=100
readonly ERR_MISSING_INTERNAL_ARG=110
readonly ERR_LOG_PREFIX=111
readonly ERR_FILE_NEWER_DATE=110

readonly ERR_FRONTEND_INSTALL=210
readonly ERR_FRONTEND_START=220

readonly ERR_BACKEND_INSTALL=310
readonly ERR_BACKEND_START=320

# Outputs log line prefix
log_prefix() { # (fn name)
  # local prefix=("$(date --iso-8601=seconds)")
  # if [[ "$?" != "0" ]]; then
  #   echo "log_prefix error: failed to get time" >&2
  #   exit "$ERR_LOG_PREFIX"
  # fi
  local prefix=()
  prefix+=("[$(echo ${FUNCNAME[@]:3} | sed 's/ /./g')]")
  if [[ "$?" != "0" ]]; then
    echo "log_prefix error: failed to generate stack trace"
    exit "$ERR_LOG_PREFIX"
  fi
  
  echo "${prefix[@]}"
}

# Outputs log line stdout
log() { # (msg)
  local prefix=$(log_prefix)
  if [[ "$?" != "0" ]]; then
    echo "log error: could not generate log line prefix" >&2
    exit "$ERR_LOG_PREFIX"
  fi
  
  local msg="$1"
  if [ -z "$msg" ]; then
    echo "$prefix error: log(msg) argument must be provided" >&2
    exit "$ERR_MISSING_INTERNAL_ARG"
  fi
  
  echo "$prefix $msg"
}

# Outputs error to stderr
elog() { # (msg)
  log "error: $msg" >&2
}

# Helpers
# Exit with code and message
die() { # (code, msg)
  local code="$1"
  shift
  if [ -z "$code" ]; then
	  elog "die(code) argument must be provided"
	  exit "$ERR_MISSING_INTERNAL_ARG"
  fi

  local msg="$1"
  if [ -z "$msg" ]; then
    elog "die(_, msg) argument must be provided"
    exit "$ERR_MISSING_INTERNAL_ARG"
  fi
  
  elog "$msg"
  exit "$code"
}

# Ensures a value exists, exits if not provided, outputs value to stdout if present
ensure_arg() { # (name, value)
  # Arguments
  local name="$1"
  shift
  if [ -z "$name" ]; then
	  die "$ERR_MISSING_INTERNAL_ARG" "ensure_arg(name, _) argument required, could not ensure arg for caller"
  fi

  local value="$1"
  
  # Ensure
  if [ -z "$value" ]; then
	  die "$ERR_MISSING_INTERNAL_ARG" "${FUNCNAME[1]}() $name argument must be provided"
  fi

  echo "$value"
}

# Check if the last command failed, if so die with args
check() { # (cmd, code, fail msg)
  local cmd=$(ensure_arg "cmd" "$1")
  shift
  local code=$(ensure_arg "code" "$1")
  shift
  local fail_msg=$(ensure_arg "fail_msg" "$1")

  if ! $cmd; then
	  elog "Traceback: $(echo ${FUNCNAME[@]} | sed 's/ / < /')"
	  die "$code" "$fail_msg"
  fi
}

# Compares if file $base is newer than $compare
file_newer() {
  # Args
  local base=$(ensure_arg "base" "$1")
  shift
  local compare=$(ensure_arg "compare" "$1")

  # Get ages
  local base_age=$(check "date -r $base +%s" "$ERR_FILE_NEWER_DATE" "failed to get $base file edit date")

  local compare_age=$(check "date -r $compare +%s" "$ERR_FILE_NEWER_DATE" "failed to get $compare file edit date")

  if ((base_age > compare_age)); then
    return "$TRUE"
  fi
  
  return "$FALSE"
}

# Run a command and prefix output for logging
run_log() { # (cmd, code, fail_msg)
  local cmd=$(ensure_arg "cmd" "$1")
  shift
  local code=$(ensure_arg "code" "$1")
  shift
  local fail_msg=$(ensure_arg "fail_msg" "$1")

  log "+ $cmd"
  while read line; do
    if [ -n "$line" ]; then
      log "$line"
    fi
  done < <(check "$cmd" "$code" "$fail_msg")
}
