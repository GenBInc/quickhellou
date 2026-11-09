#!/usr/bin/env bash
# Show logs of QuickHellou containers.
#
# Usage:
#   ./logs.sh                      status + last 50 lines of every container
#   ./logs.sh <name...>            last 50 lines of the given containers
#   ./logs.sh -f <name...>         follow (live) logs, Ctrl+C to stop
#   ./logs.sh -n 200 <name...>     last 200 lines
#   ./logs.sh errors               only error / traceback lines from all containers
#   ./logs.sh check                Redis + video health check
#
# Names: goserver, videochat_pyserver, redis, videochat_client,
#        console_pyserver, console_db, pgadmin4_qh
# Short aliases: go, video|vp, redis, client|vc, console|cp, db, pgadmin

set -u
cd "$(dirname "$0")"

ALL="goserver videochat_pyserver redis videochat_client console_pyserver console_db pgadmin4_qh"
ENV_FILE="./prod.env"
[ -f "$ENV_FILE" ] || ENV_FILE="./.env"

LINES=50
FOLLOW=""

bold() { printf '\n\033[1;36m===== %s =====\033[0m\n' "$*"; }

resolve() {
  case "$1" in
    go|collider)        echo goserver ;;
    video|vp|pyserver)  echo videochat_pyserver ;;
    client|vc)          echo videochat_client ;;
    console|cp)         echo console_pyserver ;;
    db|postgres)        echo console_db ;;
    pgadmin)            echo pgadmin4_qh ;;
    *)                  echo "$1" ;;
  esac
}

exists() { docker ps -a --format '{{.Names}}' | grep -qx "$1"; }

show() {
  local c="$1"
  if ! exists "$c"; then
    bold "$c"; echo "(container not found)"; return
  fi
  bold "$c  [$(docker inspect -f '{{.State.Status}} since {{.State.StartedAt}}' "$c")]"
  if [ "$c" = "redis" ]; then
    # redis.conf sets 'logfile', so Redis writes to a file, not to docker logs
    docker exec redis tail -n "$LINES" /var/log/redis.log 2>/dev/null \
      || docker logs --tail "$LINES" redis 2>&1
  else
    docker logs --tail "$LINES" --timestamps "$c" 2>&1
  fi
}

status() {
  bold "containers"
  docker ps -a --filter "name=$(echo $ALL | sed 's/ /|/g')" \
    --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null \
    || docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
}

errors() {
  for c in $ALL; do
    exists "$c" || continue
    bold "$c (errors)"
    if [ "$c" = "redis" ]; then
      docker exec redis cat /var/log/redis.log 2>/dev/null
    else
      docker logs --tail 2000 --timestamps "$c" 2>&1
    fi | grep -iE 'error|exception|traceback|fail|denied|refused|noauth|warn' -A3 | tail -n "$LINES"
  done
}

check() {
  local pw port
  pw=$(grep -E '^REDIS_PASSWORD=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d "'\"\r")
  port=$(grep -E '^REDIS_PORT=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d "'\"\r ")
  echo "env file: $ENV_FILE  REDIS_PORT=$port  REDIS_PASSWORD set: $([ -n "$pw" ] && echo yes || echo NO)"
  [ "$(grep -cE '^REDIS_PASSWORD=' "$ENV_FILE")" -gt 1 ] && echo "WARNING: REDIS_PASSWORD defined more than once in $ENV_FILE"

  status

  bold "redis listening (host)"
  ss -tlnp 2>/dev/null | grep -E ":$port\b" || echo "nothing listening on host port $port"

  bold "redis without password (expect NOAUTH)"
  docker exec redis redis-cli -p "$port" ping 2>&1

  bold "redis with password (expect PONG)"
  docker exec redis redis-cli -p "$port" -a "$pw" --no-auth-warning ping 2>&1

  bold "videochat_pyserver -> redis"
  docker exec videochat_pyserver env | grep REDIS_ | sed 's/\(REDIS_PASSWORD=\).*/\1***/'
  docker exec videochat_pyserver python -c "import os,redis; r=redis.Redis(host=os.environ['REDIS_HOST'], port=int(os.environ['REDIS_PORT']), password=os.environ.get('REDIS_PASSWORD') or None); print('ping:', r.ping())" 2>&1 | tail -3

  bold "outbound redis connections (should be empty)"
  ss -tnp 2>/dev/null | grep -E ':(6379|16379)\b' | grep -v '127.0.0.1' || echo "none"

  bold "TURN / coturn"
  (systemctl is-active coturn 2>/dev/null || echo "coturn service not found") ; ss -lnup 2>/dev/null | grep -E ':3478\b' || echo "nothing listening on UDP 3478"
}

# ---- args ----
NAMES=""
while [ $# -gt 0 ]; do
  case "$1" in
    -f|--follow) FOLLOW=1 ;;
    -n) shift; LINES="$1" ;;
    errors) errors; exit 0 ;;
    check)  check;  exit 0 ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) NAMES="$NAMES $(resolve "$1")" ;;
  esac
  shift
done

if [ -n "$FOLLOW" ]; then
  [ -z "$NAMES" ] && NAMES="$ALL"
  pids=""
  for c in $NAMES; do
    exists "$c" || { echo "skip $c (not found)"; continue; }
    if [ "$c" = "redis" ]; then
      docker exec redis tail -n "$LINES" -F /var/log/redis.log 2>&1 | sed "s/^/[redis] /" &
    else
      docker logs -f --tail "$LINES" "$c" 2>&1 | sed "s/^/[$c] /" &
    fi
    pids="$pids $!"
  done
  trap 'kill $pids 2>/dev/null; exit 0' INT TERM
  wait
  exit 0
fi

if [ -z "$NAMES" ]; then
  status
  NAMES="$ALL"
fi
for c in $NAMES; do show "$c"; done
