# Server hardening checklist

Production host: Debian/Ubuntu running Docker (videochat, console, collider) and
coturn directly on the host. Run `sudo ./security-check.sh` at any time for a
read-only audit of the items below.

> Work through this over an SSH session **and keep a second SSH session open**
> until you have confirmed you can still log in. Firewall and SSH changes can
> lock you out.

---

## 0. Health check before hardening

If a service was ever reachable from the internet without authentication (for
example Redis), check the host before hardening it: closing a port does not
remove anything that may already be running.

```bash
ss -tnp | grep -E ':(6379|16379)\b'           # unexpected outbound Redis connections
top -o %CPU                                    # unknown processes using CPU
ls -la /tmp /var/tmp /dev/shm                  # unexpected executables
crontab -l; ls -la /etc/cron* /var/spool/cron/crontabs/
cat /root/.ssh/authorized_keys /home/*/.ssh/authorized_keys
systemctl list-units --type=service --state=running
docker ps -a; docker images                    # containers/images you did not create
last -n 30; journalctl -u ssh --since "-14 days" | grep -i accepted
```

* Something unexpected only inside a container: `docker compose down`, rebuild
  with `build --pull --no-cache`, `up`.
* Something unexpected on the host itself (unknown keys, cron jobs, services,
  binaries): reinstall the server, redeploy from git and restore the database
  from a known-good `pg_dump`.
* In both cases rotate: `REDIS_PASSWORD`, `POSTGRES_PASSWORD`, `SECRET_KEY`,
  `EMAIL_HOST_PASSWORD`, `TURN_SERVER_USERNAME` (TURN login), SSH keys, pgAdmin password.

---

## 1. Secrets in `prod.env`

`prod.env` is git-ignored; keep it that way (`chmod 600 prod.env`).

| Variable | Requirement |
|---|---|
| `SECRET_KEY` | ≥ 50 random chars: `python3 -c "import secrets;print(secrets.token_urlsafe(50))"` |
| `REDIS_PASSWORD` | `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` (changing it needs `ALTER USER` in Postgres, the env var only applies on first init) |
| `VIDEOCHAT_ALLOWED_HOSTS` / `HELPDESK_ALLOWED_HOSTS` | your real hostnames, comma separated |
| `DJANGO_DEBUG` | not set (defaults to off) |

---

## 2. Ports: what may be reachable from the internet

| Port | Service | Public? |
|---|---|---|
| 22/tcp | SSH | yes (keys only, fail2ban) - restrict to your IPs if possible |
| `VIDEOCHAT_APP_PORT`, `HELPDESK_APP_PORT` | Django apps | yes |
| `COLLIDER_SERVER_PORT` (8099) | collider websocket | yes |
| 3478/udp+tcp, 49152-50151/udp | coturn | yes |
| `REDIS_PORT` (6380) | Redis | **no** - `127.0.0.1` |
| `POSTGRES_PORT` (5435) | Postgres | **no** - `127.0.0.1` |
| 5050 | pgAdmin | **no** - `127.0.0.1`, use `ssh -L 5050:localhost:5050` |

Check: `ss -tulnp | grep -v -E '127.0.0.1|\[::1\]'` must show only the "yes" rows.

**Docker bypasses ufw/firewalld** for published ports. Private services must be
published as `127.0.0.1:host:container` in compose (already done in this repo).

---

## 3. Firewall (ufw + Docker egress rules)

Inbound for host services (Docker-published app ports are handled by Docker):

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp                       # or: ufw allow from <your-ip> to any port 22
ufw allow 3478                         # TURN udp+tcp
ufw allow 49152:50151/udp              # TURN relay range (turnserver.conf min/max-port)
ufw enable
ufw status verbose
```

Outbound: block ports that are commonly abused (Redis, Docker API, SSH) so a
misbehaving container or process cannot open connections to them on other hosts.

Find the internet-facing interface first:

```bash
ip route get 1.1.1.1 | grep -o 'dev [^ ]*'      # e.g. "dev eno1" -> EXT_IF=eno1
```

Add to the end of `/etc/ufw/after.rules`, before the final `COMMIT` of the
`*filter` section, replacing `EXT_IF`:

```
# --- Quick Hellou egress protection -------------------------------------
:DOCKER-USER - [0:0]
# containers -> internet only (-o EXT_IF): container-to-container traffic such as
# pyserver -> redis also passes DOCKER-USER and must NOT match these rules.
-A DOCKER-USER -o EXT_IF -p tcp -m multiport --dports 6379,6380,16379,2375,2376 -j DROP
-A DOCKER-USER -o EXT_IF -p tcp --dport 22 -m conntrack --ctstate NEW -j DROP
-A DOCKER-USER -j RETURN
# host -> internet: no Redis / Docker API
-A ufw-before-output -o EXT_IF -p tcp -m multiport --dports 6379,6380,16379,2375,2376 -j DROP
```

```bash
ufw reload && systemctl restart docker
iptables -S DOCKER-USER
./logs.sh check          # pyserver -> redis must still print "ping: True"
```

Test a video call after enabling.

---

## 4. SSH

`/etc/ssh/sshd_config.d/99-hardening.conf`:

```
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
MaxAuthTries 3
X11Forwarding no
AllowAgentForwarding no
```

```bash
sshd -t && systemctl reload ssh       # test syntax first, keep a session open
apt install fail2ban                   # default jail protects sshd
systemctl enable --now fail2ban
fail2ban-client status sshd
```

Prefer a normal user with `sudo` over logging in as root.

---

## 5. Updates

```bash
apt install unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

Docker images: base images are pinned in this repo where an upgrade broke
things (`postgres:14-alpine`, `gunicorn==23.0.0`). Rebuild monthly with
`build --pull` and test, rather than letting versions float.

---

## 6. coturn

See [turn.md](turn.md) and
[turn/turnserver.conf.example](../turn/turnserver.conf.example). Required:
`no-tcp-relay`, `no-multicast-peers`, the `denied-peer-ip`
list (blocks relaying to `127.0.0.1` and the Docker networks).

---

## 7. Backups

```bash
# daily logical backup of the console DB, keep 14 days
0 3 * * * docker exec console_db pg_dumpall -U postgres | gzip > /root/backups/qh-db-$(date +\%F).sql.gz && find /root/backups -name 'qh-db-*' -mtime +14 -delete
```

Copy backups off the server as well; local-only backups are lost with the host.

---

## 8. Monitoring

* `sudo ./security-check.sh` after every deploy. If other projects run on the
  same host, list their containers so they are not reported as unknown:
  `sudo KNOWN_CONTAINERS='projectA-.*|projectB-.*' ./security-check.sh`.
* `./logs.sh check` for Redis/TURN health and outbound Redis connections.
* Make sure someone reads the security/abuse contact address registered with
  your hosting provider.
