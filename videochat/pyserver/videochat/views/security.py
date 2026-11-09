"""Abuse protection helpers for public videochat endpoints."""
import html
import logging
import re
from html.parser import HTMLParser
from urllib.parse import urlsplit


# ---------------------------------------------------------------------------
# Rate limiting (fixed window counters in Redis, shared by all gunicorn workers)
# ---------------------------------------------------------------------------

def is_rate_limited(redis_client, scope, identity, limit, window_seconds):
  """Count one hit for (scope, identity); return True when the limit is exceeded.

  Fails open (returns False) if Redis is unavailable, so a Redis outage does
  not take the endpoint down with it.
  """
  key = 'rl:%s:%s' % (scope, identity)
  try:
    count = redis_client.incr(key)
    if count == 1:
      redis_client.expire(key, window_seconds)
    return count > limit
  except Exception as e:  # defensive: never fail the request because of the limiter
    logging.error('Rate limiter unavailable (%s); allowing request.' % e)
    return False


def client_ip(request):
  """Client IP. gunicorn terminates TLS itself (no reverse proxy), so REMOTE_ADDR is the peer."""
  return request.META.get('REMOTE_ADDR', 'unknown')


# ---------------------------------------------------------------------------
# Invitation message sanitizing
# ---------------------------------------------------------------------------

ALLOWED_TAGS = {'a', 'b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span'}
VOID_TAGS = {'br'}
DROP_CONTENT_TAGS = {'script', 'style', 'iframe', 'object', 'embed', 'template', 'svg', 'math', 'head', 'title'}


def _netloc_allowed(netloc, allowed_hosts):
  netloc = netloc.lower()
  host_only = netloc.split(':')[0]
  for allowed in allowed_hosts:
    allowed = allowed.lower()
    if netloc == allowed or host_only == allowed.split(':')[0]:
      return True
  return False


def safe_room_href(href, allowed_hosts):
  """Return a normalized https/http URL if href points to our own app, else None.

  Room links are rendered as '<host>/r/<id>' (no scheme), so a missing scheme is accepted.
  """
  if not href:
    return None
  href = href.strip()
  if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', href) and not re.match(r'^https?://', href, re.I):
    return None  # javascript:, data:, mailto:, ...
  candidate = href
  if href.startswith('//'):
    candidate = 'https:' + href
  elif not re.match(r'^https?://', href, re.I):
    candidate = 'https://' + href
  parts = urlsplit(candidate)
  if not parts.netloc or '@' in parts.netloc:
    return None
  if not _netloc_allowed(parts.netloc, allowed_hosts):
    return None
  return candidate


class _Sanitizer(HTMLParser):
  def __init__(self, allowed_hosts):
    super().__init__(convert_charrefs=True)
    self.allowed_hosts = allowed_hosts
    self.out = []
    self.open_tags = []
    self.drop_depth = 0

  def handle_starttag(self, tag, attrs):
    tag = tag.lower()
    if tag in DROP_CONTENT_TAGS:
      self.drop_depth += 1
      return
    if self.drop_depth or tag not in ALLOWED_TAGS:
      return
    if tag in VOID_TAGS:
      self.out.append('<%s>' % tag)
      return
    if tag == 'a':
      href = safe_room_href(dict(attrs).get('href'), self.allowed_hosts)
      if href is None:
        self.open_tags.append(None)  # keep text, drop the link
        return
      self.out.append('<a href="%s">' % html.escape(href, quote=True))
    else:
      self.out.append('<%s>' % tag)
    self.open_tags.append(tag)

  def handle_startendtag(self, tag, attrs):
    if tag.lower() in VOID_TAGS and not self.drop_depth:
      self.out.append('<%s>' % tag.lower())

  def handle_endtag(self, tag):
    tag = tag.lower()
    if tag in DROP_CONTENT_TAGS:
      self.drop_depth = max(0, self.drop_depth - 1)
      return
    if self.drop_depth or tag not in ALLOWED_TAGS or tag in VOID_TAGS:
      return
    # close the most recent matching open tag
    for i in range(len(self.open_tags) - 1, -1, -1):
      if self.open_tags[i] == tag or (tag == 'a' and self.open_tags[i] is None):
        closed = self.open_tags.pop(i)
        if closed is not None:
          self.out.append('</%s>' % closed)
        return

  def handle_data(self, data):
    if not self.drop_depth:
      self.out.append(html.escape(data, quote=False))

  def result(self):
    for tag in reversed(self.open_tags):
      if tag is not None:
        self.out.append('</%s>' % tag)
    return ''.join(self.out).strip()


def sanitize_message(message, allowed_hosts):
  """Sanitize a user supplied invitation message to safe HTML.

  - Plain text (scheduler textarea) is escaped and newlines become <br>.
  - HTML (contenteditable invitation box) is reduced to a small tag allowlist;
    links are kept only when they point to our own app (anti-phishing).
  """
  message = (message or '').strip()
  if not re.search(r'</?[a-zA-Z][^>]*>', message):
    return html.escape(message, quote=False).replace('\r\n', '\n').replace('\n', '<br>')
  parser = _Sanitizer(allowed_hosts)
  parser.feed(message)
  parser.close()
  return parser.result()


def clean_header(value, max_len):
  """Single-line header value (prevents header injection), truncated."""
  return re.sub(r'[\r\n]+', ' ', value or '').strip()[:max_len]
