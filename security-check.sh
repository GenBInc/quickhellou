#!/usr/bin/env bash
# Read-only security audit of the Quick Hellou production host.
# Changes nothing. Run as root from the repo root:  sudo ./security-check.sh
# See docs/server-hardening.md for how to fix each finding.

set -u
cd "$(dirname "$0")"

ENV_FILE="./prod.env"
TURN_CONF="/etc/turnserver.conf"
FAILS=0; WARNS=0

pass() { printf '  \033[32mPASS\033[0m %s\n' "$*"; }
warn() { printf '  \033[33mWARN\033[0m %s\n' "$*"; WARNS=$((WARNS+1)); }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$*"; FAILS=$((FAILS+1)); }
info() { printf '       %s\n' "$*"; }
section() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }
# Value of KEY from the env file; accepts both KEY=value and KEY = 'value'.
envval() { grep -E "^[[:space:]]*$1[[:space:]]*=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d "'\"\r" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'; }
# git as root in a repo owned by another user fails with "dubious ownership"; allow it read-only here.
gitq() { git -c safe.directory="$PWD" "$@"; }
# Containers of other projects on this host, as an extended regex, e.g.
#   KNOWN_CONTAINERS='verimedica-.*|self-hosted.*' sudo -E ./security-check.sh
KNOWN_CONTAINERS="${KNOWN_CONTAINERS:-}"

[ "$(id -u)" -eq 0 ] || echo "Note: not running as root - some checks will be incomplete."

# ---------------------------------------------------------------------------
section "Unexpected activity"
OUT=$(ss -tnp 2>/dev/null | awk 'NR>1' | grep -E ':(6379|16379|2375)\b' | grep -v -E '127\.0\.0\.1|192\.170\.|192\.180\.|172\.(1[6-9]|2[0-9]|3[01])\.' )
[ -z "$OUT" ] && pass "no outbound connections to Redis/Docker API ports" || { fail "unexpected outbound Redis/Docker API connections:"; echo "$OUT" | head -10 | sed 's/^/       /'; }

TOP=$(ps -eo pid,user,%cpu,comm --sort=-%cpu | awk 'NR>1 && $3>80' | head -5)
[ -z "$TOP" ] && pass "no process above 80% CPU" || { warn "high CPU processes (miner?):"; echo "$TOP" | sed 's/^/       /'; }

EXE=$(find /tmp /var/tmp /dev/shm -xdev -type f -perm -u+x 2>/dev/null | head -10)
[ -z "$EXE" ] && pass "no executables in /tmp, /var/tmp, /dev/shm" || { fail "executables in temp dirs:"; echo "$EXE" | sed 's/^/       /'; }

CRON=$(find /etc/cron* /var/spool/cron -type f -mtime -30 2>/dev/null)
[ -z "$CRON" ] && pass "no cron files changed in the last 30 days" || { warn "cron files changed in the last 30 days (verify each):"; echo "$CRON" | sed 's/^/       /'; }

for f in /root/.ssh/authorized_keys /home/*/.ssh/authorized_keys; do
  [ -f "$f" ] || continue
  n=$(grep -c -E '^(ssh-|ecdsa-|sk-)' "$f")
  info "$f: $n key(s) - verify each one is yours:"
  have ssh-keygen && ssh-keygen -lf "$f" 2>/dev/null | sed 's/^/         /'
done

# ---------------------------------------------------------------------------
section "Ports reachable from the internet"
PUB=$(ss -Htulnp 2>/dev/null | awk '{print $1, $5, $7}' | grep -v -E ' (127\.0\.0\.1|\[::1\]|::1):' )
info "listening on non-loopback addresses:"
echo "$PUB" | sed 's/^/         /'
REDIS_PORT=$(envval REDIS_PORT); PG_PORT=$(envval POSTGRES_PORT)
for p in ${REDIS_PORT:-6380} 6379 ${PG_PORT:-5435} 5432 5050 2375; do
  if echo "$PUB" | grep -qE ":$p\b"; then fail "port $p is reachable from outside (must be 127.0.0.1)"; fi
done
echo "$PUB" | grep -qE ":(${REDIS_PORT:-6380}|6379|${PG_PORT:-5435}|5432|5050|2375)\b" || pass "Redis, Postgres, pgAdmin, Docker API not exposed"

if have docker; then
  DPUB=$(docker ps --format '{{.Names}} {{.Ports}}' | tr ',' '\n' | grep -E '0\.0\.0\.0|:::' )
  info "Docker ports published on all interfaces:"
  echo "${DPUB:-none}" | sed 's/^/         /'
fi

# ---------------------------------------------------------------------------
section "Firewall"
if have ufw; then
  ufw status 2>/dev/null | grep -q "Status: active" && pass "ufw active" || fail "ufw not active"
else
  warn "ufw not installed (check iptables/nftables manually)"
fi
if have iptables; then
  iptables -S DOCKER-USER 2>/dev/null | grep -qE 'dports .*6379' && pass "DOCKER-USER blocks outbound Redis from containers" || warn "no DOCKER-USER egress rules (docs/server-hardening.md section 3)"
fi

# ---------------------------------------------------------------------------
section "SSH"
if have sshd; then
  SSHD=$(sshd -T 2>/dev/null)
  echo "$SSHD" | grep -qi '^passwordauthentication no' && pass "password login disabled" || fail "PasswordAuthentication is not 'no'"
  echo "$SSHD" | grep -qiE '^permitrootlogin (no|prohibit-password|without-password)' && pass "root password login disabled" || fail "PermitRootLogin allows passwords"
fi
systemctl is-active --quiet fail2ban 2>/dev/null && pass "fail2ban running" || warn "fail2ban not running"

# ---------------------------------------------------------------------------
section "Updates"
if [ -f /etc/apt/apt.conf.d/20auto-upgrades ] && grep -q 'Unattended-Upgrade "1"' /etc/apt/apt.conf.d/20auto-upgrades; then
  pass "unattended-upgrades enabled"
else
  warn "unattended-upgrades not enabled"
fi
[ -f /var/run/reboot-required ] && warn "reboot required (kernel/library updates pending)"

# ---------------------------------------------------------------------------
section "coturn ($TURN_CONF)"
if [ -f "$TURN_CONF" ]; then
  grep -qE '^\s*use-auth-secret' "$TURN_CONF" && pass "use-auth-secret (short-lived credentials)" || warn "static TURN credentials (no use-auth-secret)"
  grep -qE '^\s*no-tcp-relay' "$TURN_CONF" && pass "no-tcp-relay" || fail "TCP relay enabled (TURN usable as TCP proxy)"
  grep -qE '^\s*denied-peer-ip=127\.0\.0\.0' "$TURN_CONF" && pass "loopback peers denied" || fail "TURN can relay to 127.0.0.1 (Redis/Postgres/pgAdmin)"
  grep -qE '^\s*denied-peer-ip=192\.170\.0\.0' "$TURN_CONF" && pass "Docker networks denied" || fail "TURN can relay into Docker networks 192.170/192.180"
  grep -qE '^\s*denied-peer-ip=::ffff:' "$TURN_CONF" && pass "IPv4-mapped IPv6 denied" || warn "IPv4-mapped IPv6 peers not denied"
  grep -qE '^\s*no-cli' "$TURN_CONF" && pass "no-cli" || warn "coturn CLI enabled"
else
  warn "$TURN_CONF not found (coturn not on this host?)"
fi

# ---------------------------------------------------------------------------
section "Application secrets ($ENV_FILE)"
if [ -f "$ENV_FILE" ]; then
  PERM=$(stat -c '%a' "$ENV_FILE")
  [ "${PERM: -1}" = "0" ] && pass "$ENV_FILE not world-readable ($PERM)" || warn "$ENV_FILE is world-readable ($PERM): chmod 600 $ENV_FILE"
  gitq check-ignore -q "$ENV_FILE" 2>/dev/null; rc=$?
  case $rc in
    0) pass "$ENV_FILE is git-ignored" ;;
    1) if grep -qx 'prod.env' .gitignore 2>/dev/null; then fail "$ENV_FILE is NOT git-ignored"
       else fail "$ENV_FILE is NOT git-ignored (.gitignore has no prod.env entry - git pull?)"; fi ;;
    *) warn "could not ask git whether $ENV_FILE is ignored (git error $rc)" ;;
  esac
  gitq ls-files --error-unmatch "$ENV_FILE" >/dev/null 2>&1 && fail "$ENV_FILE is tracked by git!"
  v=$(envval SECRET_KEY);      [ ${#v} -ge 40 ] && pass "SECRET_KEY length ${#v}" || fail "SECRET_KEY too short (${#v} chars)"
  v=$(envval REDIS_PASSWORD);  [ ${#v} -ge 20 ] && pass "REDIS_PASSWORD set" || fail "REDIS_PASSWORD missing/short"
  v=$(envval TURN_SECRET);     [ ${#v} -ge 20 ] && pass "TURN_SECRET set" || warn "TURN_SECRET not set (static TURN login in use)"
  v=$(envval DJANGO_DEBUG | tr 'A-Z' 'a-z'); [ "$v" = "true" ] || [ "$v" = "1" ] && fail "DJANGO_DEBUG is on" || pass "DJANGO_DEBUG off"
  v=$(envval VIDEOCHAT_ALLOWED_HOSTS); [ -n "$v" ] && [ "$v" != "*" ] && pass "VIDEOCHAT_ALLOWED_HOSTS=$v" || warn "VIDEOCHAT_ALLOWED_HOSTS not set (accepts any Host header)"
  v=$(envval HELPDESK_ALLOWED_HOSTS);  [ -n "$v" ] && [ "$v" != "*" ] && pass "HELPDESK_ALLOWED_HOSTS=$v" || warn "HELPDESK_ALLOWED_HOSTS not set (accepts any Host header)"
else
  warn "$ENV_FILE not found - run from the repo root"
fi

# ---------------------------------------------------------------------------
section "Redis"
if have docker && docker ps --format '{{.Names}}' | grep -qx redis; then
  RP=$(envval REDIS_PORT)
  R=$(docker exec redis redis-cli -p "${RP:-6379}" ping 2>&1)
  echo "$R" | grep -q NOAUTH && pass "Redis requires a password" || fail "Redis answered without password: $R"
  R=$(docker exec redis redis-cli -p "${RP:-6379}" -a "$(envval REDIS_PASSWORD)" --no-auth-warning CONFIG GET dir 2>&1)
  echo "$R" | grep -qi "unknown command" && pass "CONFIG command disabled" || fail "CONFIG command available"
else
  warn "redis container not running"
fi

# ---------------------------------------------------------------------------
section "Containers"
if have docker; then
  for c in $(docker ps --format '{{.Names}}'); do
    u=$(docker inspect -f '{{.Config.User}}' "$c"); [ -z "$u" ] && u=root
    info "$c runs as: $u"
  done
  KNOWN='goserver|videochat_pyserver|redis|videochat_client|console_pyserver|console_db|pgadmin4_qh|quickhellou[-_].*'
  [ -n "$KNOWN_CONTAINERS" ] && KNOWN="$KNOWN|$KNOWN_CONTAINERS"
  UNKNOWN=$(docker ps -a --format '{{.Names}}' | grep -v -E "^($KNOWN)$")
  [ -z "$UNKNOWN" ] && pass "no unknown containers" || { warn "containers not part of this project (verify, or list them in KNOWN_CONTAINERS):"; echo "$UNKNOWN" | sed 's/^/       /'; }
fi

printf '\n\033[1m%d failure(s), %d warning(s)\033[0m\n' "$FAILS" "$WARNS"
[ "$FAILS" -eq 0 ]
