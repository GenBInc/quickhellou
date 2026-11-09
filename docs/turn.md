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
to `/etc/turnserver.conf` and fill in the `<...>` values.

**Existing, working installation:** do not replace the file. Back it up and add
only the relay protection, then test a call:

```bash
cp -a /etc/turnserver.conf /etc/turnserver.conf.bak.$(date +%F)   # rollback point
```

Append the `--- forbidden relay destinations ---` block and the lines
`no-tcp-relay`, `no-multicast-peers`, `no-cli` from the example to the existing
file, then `systemctl restart coturn` and test a call. These only stop the relay
from reaching private addresses (`127.0.0.1`, Docker networks) and from acting
as a TCP proxy; they do not change who can log in or which addresses coturn uses.
Keep your existing `listening-ip` / `external-ip` / `relay-ip` and login settings.

### Credentials

The videochat app hands browsers a static TURN login built from
`TURN_SERVER_USERNAME` (used as both username and password, see
`ICE_SERVER_OVERRIDE` in `videochat/pyserver/qhv2/settings.py`). coturn must
accept exactly that login:

```
lt-cred-mech
user=<TURN_SERVER_USERNAME>:<TURN_SERVER_USERNAME>
realm=<your-domain>
```

### Firewall

Open `3478/udp`, `3478/tcp` and the relay port range (`min-port`-`max-port`)
(see [server-hardening.md](server-hardening.md)).

## Environment params

```
TURN_SERVER_BASE_URL='<your-domain>:3478'
TURN_SERVER_USERNAME='<username>'
```

## Test

* <https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/>:
  add `turn:<domain>:3478` with the TURN username/password. You should see
  `relay` candidates.
* Relay to private addresses must fail. In `/var/log/turnserver/turnserver.log`
  attempts show as `Forbidden IP`.
