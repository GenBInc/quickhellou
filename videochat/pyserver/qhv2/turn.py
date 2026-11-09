"""ICE server (STUN/TURN) configuration handed to the browser.

With TURN_SECRET set, every page load gets short-lived TURN credentials using
coturn's TURN REST API scheme (turnserver.conf: use-auth-secret +
static-auth-secret=<TURN_SECRET>):

    username   = "<unix expiry timestamp>:qh<random>"
    credential = base64(HMAC-SHA1(TURN_SECRET, username))

Leaked credentials stop working after TURN_CREDENTIAL_TTL seconds.
Without TURN_SECRET the old static username/password from settings is used.
"""
import base64
import hashlib
import hmac
import os
import secrets
import time

from django.conf import settings

TURN_CREDENTIAL_TTL = int(os.environ.get('TURN_CREDENTIAL_TTL', 24 * 3600))


def make_turn_credentials(secret, ttl=TURN_CREDENTIAL_TTL, label='qh', now=None):
  expiry = int(now if now is not None else time.time()) + ttl
  username = '%d:%s' % (expiry, label)
  digest = hmac.new(secret.encode('utf-8'), username.encode('utf-8'), hashlib.sha1).digest()
  return username, base64.b64encode(digest).decode('ascii')


def get_ice_servers():
  secret = os.environ.get('TURN_SECRET', '').strip()
  if not secret:
    return settings.ICE_SERVER_OVERRIDE
  base = str(os.environ.get('TURN_SERVER_BASE_URL'))
  # Random label per visitor so coturn's per-user quota isn't shared between visitors.
  username, credential = make_turn_credentials(secret, label='qh' + secrets.token_hex(4))
  return [
    {
      'username': username,
      'credential': credential,
      'urls': [
        'turn:' + base + '?transport=udp',
        'turn:' + base + '?transport=tcp',
      ],
    },
    {'urls': ['stun:' + base]},
  ]
