# TURN/STUN server

## Installation

Install [coturn server](https://github.com/coturn/coturn) on the host (not in Docker):

```bash
apt install coturn
sed -i 's/^#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn   # Debian/Ubuntu
mkdir -p /var/log/turnserver && chown turnserver: /var/log/turnserver
```

## Configuration

**New installation:** copy [turn/turnserver.conf.example](../turn/turnserver.conf.example)
to `/etc/turnserver.conf`, fill in the `<...>` values, then follow step 2 below.

**Existing, working installation:** do not replace the file. Change it in two
steps and test a call after each one, so a problem is easy to trace back:

```bash
cp -a /etc/turnserver.conf /etc/turnserver.conf.bak.$(date +%F)   # rollback point
```

### Step 1: relay protection (safe, no auth or network changes)

Append the `--- forbidden relay destinations ---` block and the lines
`no-tcp-relay`, `no-multicast-peers`, `no-cli` from the example to the existing
file, then `systemctl restart coturn` and test a call. These only stop the relay
from reaching private addresses (`127.0.0.1`, Docker networks) and from acting
as a TCP proxy; they do not change who can log in or which addresses coturn uses.

### Step 2: short-lived credentials

1. Generate a shared secret: `openssl rand -hex 32`.
2. Put it in `prod.env` as `TURN_SECRET=<secret>` and recreate the app:

   ```bash
   docker-compose ... --env-file ./prod.env up -d --force-recreate videochat_pyserver
   ```

3. Verify the app now hands out signed logins (`<digits>:qh...`, not the static username):

   ```bash
   docker exec videochat_pyserver sh -c 'test -n "$TURN_SECRET" && echo ok'
   curl -sk -X POST https://<videochat-host>/api/video-settings/test | grep -o '"username": *"[^"]*"'
   ```

4. Only then switch coturn: remove `lt-cred-mech` and `user=` lines, add
   `use-auth-secret` and `static-auth-secret=<same secret>`,
   `systemctl restart coturn`, and test a call immediately. If calls fail,
   restore the backup and check `/var/log/turnserver/turnserver.log` for `401`.

Keep your existing `listening-ip` / `external-ip` / `relay-ip` values; they
depend on the server's network setup (public IP on the interface vs. NAT).

### Firewall

Open `3478/udp`, `3478/tcp` and the relay port range (`min-port`-`max-port`)
(see [server-hardening.md](server-hardening.md)).

## How credentials work

With `TURN_SECRET` set, the videochat app gives every visitor a TURN login that
expires after 24 h (`TURN_CREDENTIAL_TTL`, seconds):

* username: `<expiry unix timestamp>:qh<random>` (random per visitor, so `user-quota` applies per visitor)
* password: `base64(HMAC-SHA1(TURN_SECRET, username))`

coturn verifies the signature and the expiry itself (`use-auth-secret`), so a
leaked login stops working on its own. Without `TURN_SECRET` the app falls back
to the old static `TURN_SERVER_USERNAME` login. Switch coturn to
`use-auth-secret` only after `TURN_SECRET` is deployed in the app, or calls that
need TURN will fail in between.

## Environment params

```
TURN_SERVER_BASE_URL='<your-domain>:3478'
TURN_SERVER_USERNAME='<username>'     # legacy static login, used only without TURN_SECRET
TURN_SECRET='<openssl rand -hex 32>'  # prod.env only, never commit
TURN_CREDENTIAL_TTL=86400             # optional
```

## Test

* <https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/>:
  add `turn:<domain>:3478` with a username/password printed by the app
  (`pc_config` in the room page source). You should see `relay` candidates.
* Relay to private addresses must fail. In `/var/log/turnserver/turnserver.log`
  attempts show as `Forbidden IP`.
