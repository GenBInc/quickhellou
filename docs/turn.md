# TURN/STUN server

## Installation

Install [coturn server](https://github.com/coturn/coturn) on the host (not in Docker):

```bash
apt install coturn
sed -i 's/^#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn   # Debian/Ubuntu
mkdir -p /var/log/turnserver && chown turnserver: /var/log/turnserver
```

## Configuration

1. Copy [turn/turnserver.conf.example](../turn/turnserver.conf.example) to `/etc/turnserver.conf`
   and fill in the `<...>` values.
2. Generate a shared secret and put the **same value** in both places:

   ```bash
   openssl rand -hex 32
   ```

   * `/etc/turnserver.conf`: `static-auth-secret=<secret>`
   * `prod.env`: `TURN_SECRET=<secret>`

3. Restart both:

   ```bash
   systemctl restart coturn
   docker-compose ... --env-file ./prod.env up -d --force-recreate videochat_pyserver
   ```

4. Open the firewall: `3478/udp`, `3478/tcp` and the relay range `49152-50151/udp`
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
