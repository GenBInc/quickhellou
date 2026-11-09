import cgi
from html import escape as html_escape
import json
import logging
import os
import random
import uuid
import smtplib
import ssl
from ssl import SSLError
from distutils.util import strtobool

import requests

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.utils import COMMASPACE, formatdate, make_msgid
from email.encoders import encode_base64

import pickle
import redis

from django.shortcuts import render, redirect
from django.conf import settings
from django.http import HttpResponse
from django.views import View

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from django.core.exceptions import ValidationError
from django.core.validators import validate_email

from .main_classes  import Room
from .security import is_rate_limited, client_ip, sanitize_message, clean_header

###

redis_host = str(os.environ.get('REDIS_HOST'))
redis_port = int(os.environ.get('REDIS_PORT'))
redis_password = os.environ.get('REDIS_PASSWORD') or None
redis_client = redis.Redis(host=redis_host, port=redis_port, password=redis_password, db=0)

# Rooms expire after this many seconds without any update (refreshed on every write).
ROOM_TTL_SECONDS = int(os.environ.get('ROOM_TTL_SECONDS', 86400))

# Reused HTTP connection pool for server -> collider requests (avoids a new TCP+TLS
# handshake per signalling message).
COLLIDER_TIMEOUT = (3, 10)  # (connect, read) seconds
collider_session = requests.Session()

def room_lock(key):
  """Per-room lock so concurrent workers don't overwrite each other's room updates."""
  return redis_client.lock('lock:' + key, timeout=10, blocking_timeout=10)

def load_room(key):
  """Return the Room stored under key, or None. Call inside room_lock(key) when modifying it."""
  room_bytes = redis_client.get(key)
  if room_bytes is None:
    return None
  return pickle.loads(room_bytes)  # may also be None for legacy keys

def save_room(key, room):
  """Store a room with a TTL, or delete the key when the room is gone."""
  if room is None:
    redis_client.delete(key)
  else:
    redis_client.set(key, pickle.dumps(room), ex=ROOM_TTL_SECONDS)

class MainPage(View):
  def get(self, request, *args, **kwargs):   
    checkIfRedirect(request)
    return render(request, 'home_template.html')

@method_decorator(csrf_exempt, name='dispatch')
class JoinPage(View):
  def write_response(self, result, params, messages):
      params['messages'] = messages
      return HttpResponse(json.dumps({
        'result': result,
        'params': params
      }))
  def generate_uuid(self):
      user_agent = self.request.headers['User-Agent']
      key = generate_random(8)
      return str(uuid.uuid3(uuid.NAMESPACE_DNS, key))
  def write_room_parameters(self, room_id, client_id, sessions, messages):
      params = get_room_parameters(
      self.request, room_id, client_id, sessions)
      return self.write_response('SUCCESS', params, messages)
  def add_client_to_room(self, request, room_id, client_id):
      key = get_redis_key_for_room(request.META['HTTP_HOST'], room_id)
      with room_lock(key):
        room = load_room(key) or Room()

        if room.has_client(client_id):
          return {'error': settings.RESPONSE_DUPLICATE_CLIENT, 'sessions': [],
            'messages': [], 'room_state': str(room)}

        messages = []
        sessions = []
        # If no pending session are available
        # set client as initiator.
        if room.get_pending_sessions_count() == 0:
          # check for other clients
          active_clients_len = len(room.get_clients())
          print("active_clients_len", active_clients_len)
          # add session and initiator client
          if (active_clients_len == 0):
            print('JoinPage: no active sessions, adding initiator')
            sessions.append(str(room.add_initiator(client_id, '')))
          else:
            print('JoinPage: active sessions exists, adding initiators and receivers')
            for other_client_id in room.get_distinct_clients():
                serializedSession = room.add_initiator(client_id, other_client_id)
                print('JoinPage: append two-way session %s: client %s with other %s' % (serializedSession.id, client_id, other_client_id))
                sessions.append(str(serializedSession))
                sessions.append(str(room.add_receiver(serializedSession.id, other_client_id, client_id, {}, True)))
        else:
          print("session exists")
          for session in room.serialize_pending_sessions():
            initiator_client = session.get_initiator()
            messages = list(initiator_client.messages)
            print('JoinPage: add receiver %s with %s messages (%d)' % (client_id, initiator_client.get_id(), len(messages)))
            sessions.append(str(room.add_receiver(session.id, client_id, initiator_client.get_id(), messages, False)))
            initiator_client.clear_messages()
        check_clients_availability('JoinPage',room.get_clients())
        save_room(key, room)
        print('JoinPage: Added client %s in room %s' % (client_id, room_id))
        return {'error': None, 'sessions': sessions,
          'messages': messages, 'room_state': str(room)}

  def get(self, request, *args, **kwargs):
    return HttpResponse("GET is not allowed.")
  def post(self, request, *args, **kwargs):
    room_id = kwargs['room_id']
    if room_id is None:
      return redirect('videochat:main')
    client_id = self.generate_uuid()
    result = self.add_client_to_room(request, room_id, client_id)

    print('JoinPage: User ' + client_id + ' joined room ' + room_id)
    print('JoinPage: Room ' + room_id + ' has state ' + result['room_state'])

    return self.write_room_parameters(
      room_id, client_id, result['sessions'], result['messages'])

@method_decorator(csrf_exempt, name='dispatch')
class SessionsGetterPage(View):
  def get(self, request, *args, **kwargs):
    return HttpResponse("GET is not allowed.")
  def post(self, request, *args, **kwargs):
    room_id = kwargs['room_id']
    host_url = request.META['HTTP_HOST']
    key = get_redis_key_for_room(host_url, room_id)
    with room_lock(key):
      room = load_room(key)
      if room is None:
        logging.warning("There is no room in RMS with a key %s" % key)
      else:
        room.clear_duplicate_sessions()
        save_room(key, room)
    # Notify the collider outside the lock.
    result = self.send_session_update(room, room_id)
    return self.write_response(str(result))
  def write_response(self, result):
    content = json.dumps({'sessions': result})
    return HttpResponse(content)
  def send_session_update(self, room, room_id):
    if room is None:
      message = json.dumps([]) 
    else:
      message = str(room.clientSessions)
    url = 'session-update/%s' % room_id
    result = post_request_to_collider(self.request, url, message)
    if result is None:
      print('LeavePage: Request result is none.')
      result = HttpResponse("None")
    if result.status_code != 200:
      logging.error(
        'LeavePage: Failed to send message to collider: %d' % (result.status_code))
    return result

@method_decorator(csrf_exempt, name='dispatch')
class ByePage(View):
  def get(self, request, *args, **kwargs):
    return HttpResponse("GET is not allowed.")
  def post(self, request, *args, **kwargs):
    return HttpResponse("ok")
@method_decorator(csrf_exempt, name='dispatch')
class LeavePage(View):
  def get(self, request, *args, **kwargs):
    return HttpResponse("GET is not allowed.")
  def post(self, request, *args, **kwargs):
    room_id = kwargs['room_id']
    client_id = kwargs['client_id']
    print('LeavePage: client %s' % (client_id))
    self.remove_client_from_room(request.META['HTTP_HOST'], room_id, client_id)
    # Notify the collider outside the lock.
    self.send_session_update(room_id)
    return HttpResponse('ok')
  def remove_client_from_room(self, host, room_id, client_id):
    key = get_redis_key_for_room(host, room_id)
    with room_lock(key):
      room = load_room(key)
      if room is None:
        logging.warning('LeavePage: Unknown room ' + room_id)
        return
      if not room.has_client(client_id):
        logging.warning('LeavePage: Unknown client ' + client_id +
            ' for room ' + room_id)
        return
      for session in room.get_sessions_by_client_id(client_id):
        room.remove_session_client(session.id, client_id)
        other_client = session.get_any_client()
        if other_client is not None:
          print('LeavePage: User %s from session %s became initiator' % (other_client.get_id(), session.id))
          other_client.set_initiator(True)

      sessions_count = room.get_sessions_count()
      print('LeavePage: total sessions %d' % sessions_count)

      room.clear_duplicate_sessions()

      check_clients_availability('LeavePage', room.get_clients())
      if sessions_count == 0:
        print('LeavePage: removing room')
        room = None
      save_room(key, room)
      print('LeavePage: Removed client %s from room %s, state %s'
            % (client_id, room_id, str(room)))
  def send_session_update(self, room_id):
    host_url = self.request.META['HTTP_HOST']
    room = get_room(host_url, room_id)
    if room is None:
      message = json.dumps([]) 
    else:
      message = str(room.clientSessions)
    print('LeavePage: message %s ' % message)
    url = 'session-update/%s' % room_id
    result = post_request_to_collider(self.request, url, message)
    if result is None:
      print('LeavePage: Request result is none.')
      return
    if result.status_code != 200:
      logging.error(
        'LeavePage: Failed to send message to collider: %d' % (result.status_code))
      return

class SchedulerPage(View):
  def get(self, request, *args, **kwargs):
    checkIfRedirect(self)
    params = get_room_parameters(request, None, None, None)
    return render(request, 'scheduler.html', params)

class SchedulerPageWithRoomSelect(View):
  def get(self, request, *args, **kwargs):
    return HttpResponse("GET is not allowed.")
  def post(self, request, *args, **kwargs):
    room_id = kwargs['room_id']
    checkIfRedirect(self)
    # Check if room is full.
    room_bytes = redis_client.get(
      get_redis_key_for_room(self.request.host_url, room_id))
    if room_bytes is None:
      return render(request, 'scheduler.html')
    room = pickle.loads(room_bytes)
    print('SchedulerPageWithRoomSelect: Room ' + room_id + ' has state ' + str(room))
    if room.get_occupancy() >= 8:
      print('Room ' + room_id + ' is full')
    params = get_room_parameters(self.request, room_id, None, None)
    return render(request, 'scheduler.html', params)

@method_decorator(csrf_exempt, name='dispatch')
class ConsumePage(View):
  def get(self, request, *args, **kwargs):
    return HttpResponse("GET is not allowed.")
  def post(self, request, *args, **kwargs):
    room_id = kwargs['room_id']
    session_id = kwargs['session_id']
    client_id = kwargs['client_id']
    host_url = request.META['HTTP_HOST']
    key = get_redis_key_for_room(host_url, room_id)
    with room_lock(key):
      room = load_room(key)
      if room is None:
        return self.write_response([])
      result = self.consume(room, session_id, client_id)
      if result:
        save_room(key, room)
    # Always return a list so the client can iterate it safely.
    return self.write_response(result or [])

  def write_response(self, result):
    content = json.dumps({'messages': result})
    return HttpResponse(content)
  def consume(self, room, session_id, client_id):
    session = room.get_session(session_id)
    if (session is None):
      return
    client = session.get_client(client_id)
    if (client is None):
      return
    if (client.is_initiator):
      return
    initiator_client = session.get_initiator()
    messages_list = list(initiator_client.messages)
    return_list = messages_list[:]
    initiator_client.clear_messages()
    return return_list

@method_decorator(csrf_exempt, name='dispatch')
class MessagePage(View):
  """POST /message/<room_id>/<client_id>: signalling message sent before the
  client knows its session id. Resolves the client's session and handles it
  exactly like /sessionmessage/<room_id>/<session_id>/<client_id>."""
  def get(self, request, *args, **kwargs):
    return HttpResponse("GET is not allowed.")
  def post(self, request, *args, **kwargs):
    room_id = kwargs['room_id']
    client_id = kwargs['client_id']
    room = get_room(request.META['HTTP_HOST'], room_id)
    if room is None:
      logging.warning('MessagePage: Unknown room: ' + room_id)
      return HttpResponse(json.dumps({'result': settings.RESPONSE_UNKNOWN_ROOM}))
    session = room.get_session_by_client_id(client_id)
    if session is None:
      logging.warning('MessagePage: No session for client %s in room %s' % (client_id, room_id))
      return HttpResponse(json.dumps({'result': settings.RESPONSE_UNKNOWN_CLIENT}))
    kwargs['session_id'] = session.id
    return SessionMessagePage.as_view()(request, *args, **kwargs)

@method_decorator(csrf_exempt, name='dispatch')
class SessionMessagePage(View):
  def write_response(self, result):
    content = json.dumps({'result': result})
    return HttpResponse(content)

  def send_message_to_collider(self, room_id, client_id, message):
    result = send_message_to_collider(self.request, room_id, client_id, message)
    if result is None or result.status_code != 200:
      logging.error('Failed to send message to collider: %s' %
        (result.status_code if result is not None else 'no response'))
      return HttpResponse(json.dumps({'result': settings.RESPONSE_ERROR}), status=502)
    return self.write_response(settings.RESPONSE_SUCCESS)
  def get(self, request, *args, **kwargs):
    return HttpResponse("GET is not allowed.")
  def post(self, request, *args, **kwargs):
    room_id = kwargs['room_id']
    session_id = kwargs['session_id']
    client_id = kwargs['client_id']
    host_url = request.META['HTTP_HOST']
    message_json = self.request.body
    result = self.save_message_from_session_client(
      host_url, room_id, session_id, client_id, message_json)
    if result['error'] is not None:
      return self.write_response(result['error'])
    if not result['saved']:
      # Other client joined, forward to collider. Do this outside the lock.
      # Note: this may fail in local dev server due to not having the right
      # certificate file locally for SSL validation.
      # Note: loopback scenario follows this code path.
      # TODO(tkchin): consider async fetch here.
      return self.send_message_to_collider(room_id, client_id, message_json)
    else:
      return self.write_response(settings.RESPONSE_SUCCESS)
  def save_message_from_session_client(self, host, room_id, session_id, client_id, message_bytes):
    try:
      message = json.loads(message_bytes)
    except ValueError:
      return {'error': settings.RESPONSE_INVALID_REQUEST, 'saved': False}
    key = get_redis_key_for_room(host, room_id)
    with room_lock(key):
      room = load_room(key)
      if room is None:
        logging.warning('Unknown room: ' + room_id)
        return {'error': settings.RESPONSE_UNKNOWN_ROOM, 'saved': False}
      if not room.has_client(client_id):
        logging.warning('Unknown client: ' + client_id)
        return {'error': settings.RESPONSE_UNKNOWN_CLIENT, 'saved': False}
      session = room.get_session(session_id)
      client = session.get_client(client_id) if session is not None else None
      if client is None:
        logging.warning('No session %s for client %s' % (session_id, client_id))
        return {'error': settings.RESPONSE_UNKNOWN_CLIENT, 'saved': False}
      # Messages are always queued; the other side picks them up via /consume.
      client.add_message(message)
      save_room(key, room)
      print('SessionMessagePage: saved message for client %s %s' % (client.get_id(), str(client)))
      return {'error': None, 'saved': True}

class ParamsPage(View):
  def get(self, request, *args, **kwargs):
    # Return room independent room parameters.
    params = get_room_parameters(self.request, None, None, None)
    return HttpResponse(json.dumps(params))

@method_decorator(csrf_exempt, name='dispatch')
class SendInvitation(View):
  def get(self, request, *args, **kwargs):
    return HttpResponse("GET is not allowed.")
  # Abuse limits: (scope, limit, window seconds)
  IP_LIMITS = (('inv-ip-10m', 5, 600), ('inv-ip-day', 20, 86400))
  RECIPIENT_LIMIT = ('inv-to-day', 5, 86400)
  GLOBAL_LIMIT = ('inv-all-day', 300, 86400)
  SUBJECTS = ('Quick Hellou - Invitation', 'Quick Hellou - Quick Talk Invitation')
  MAX_MESSAGE = 5000
  MAX_CALENDAR = 20000

  def fail(self, text, status):
    return HttpResponse(text, status=status, content_type='text/plain; charset=utf-8')

  def allowed_link_hosts(self):
    hosts = [h.strip() for h in os.environ.get('DJANGO_ALLOWED_HOSTS', '').split(',')
             if h.strip() and h.strip() != '*']
    app_host = os.environ.get('VIDEOCHAT_APP_HOST', '').strip()
    if app_host:
      hosts.append(app_host)
    return hosts

  def post(self, request, *args, **kwargs):
    request_post = request.POST
    receiver = (request_post.get('email') or '').strip()
    message = request_post.get('message') or ''
    calendar_data = request_post.get('calendar') or ''
    date_time = clean_header(request_post.get('dateTime'), 100)
    attach_calendar = (request_post.get('attachCalendar') or '').lower() == 'true'
    subject = clean_header(request_post.get('subject'), 100)
    if subject not in self.SUBJECTS:
      subject = self.SUBJECTS[0]

    # --- validation
    try:
      if not receiver or any(c in receiver for c in ',;\r\n'):
        raise ValidationError('invalid')
      validate_email(receiver)
    except ValidationError:
      return self.fail('Please enter a valid email address.', 400)
    if not message.strip() or len(message) > self.MAX_MESSAGE:
      return self.fail('The message is empty or too long.', 400)
    if len(calendar_data) > self.MAX_CALENDAR:
      return self.fail('The calendar data is too large.', 400)

    # --- rate limits (shared by all workers via Redis)
    ip = client_ip(request)
    for scope, limit, window in self.IP_LIMITS:
      if is_rate_limited(redis_client, scope, ip, limit, window):
        logging.warning('SendInvitation: rate limit %s hit by %s' % (scope, ip))
        return self.fail('Too many invitations sent. Please try again later.', 429)
    scope, limit, window = self.RECIPIENT_LIMIT
    if is_rate_limited(redis_client, scope, receiver.lower(), limit, window):
      return self.fail('Too many invitations sent to this address today.', 429)
    scope, limit, window = self.GLOBAL_LIMIT
    if is_rate_limited(redis_client, scope, 'all', limit, window):
      logging.error('SendInvitation: global daily limit reached')
      return self.fail('Invitations are temporarily unavailable. Please try again later.', 429)

    # --- build the email (user content sanitized, links only to our own app)
    safe_message = sanitize_message(message, self.allowed_link_hosts())
    if date_time:
      body = ("<p>You've got a talk invitation.</p><br>"
              "<div>Description: %s</div><br/>"
              "<p>Scheduled time: %s</p><br/>") % (safe_message, html_escape(date_time))
    else:
      body = safe_message
    html = '<html><head></head><body>%s</body></html>' % body

    msg = MIMEMultipart('mixed')
    msg['From'] = 'Quick Hellou <no-reply@qhellou.com>'
    msg['To'] = receiver
    msg['Date'] = formatdate(localtime=True)
    msg['Message-Id'] = make_msgid()
    msg['Subject'] = subject
    textual_message = MIMEMultipart('alternative')
    textual_message.attach(MIMEText("You've got a Quick Hellou invitation.", 'plain'))
    textual_message.attach(MIMEText(html, 'html'))
    msg.attach(textual_message)
    if attach_calendar and calendar_data:
      attachment = MIMEText(calendar_data)
      attachment.add_header('Content-Disposition', 'attachment', filename='calendar.csv')
      msg.attach(attachment)

    # --- send
    try:
      host = str(os.environ.get('EMAIL_HOST'))
      port = int(os.environ.get('EMAIL_PORT'))
      if strtobool(os.environ.get('EMAIL_USE_SSL', 'False')):
        smtp = smtplib.SMTP_SSL(host, port, timeout=15)
      else:
        smtp = smtplib.SMTP(host, port, timeout=15)
      try:
        if os.environ.get('EMAIL_HOST_USER'):
          smtp.login(os.environ.get('EMAIL_HOST_USER'), os.environ.get('EMAIL_HOST_PASSWORD'))
        smtp.sendmail(str(os.environ.get('SUPPORT_EMAIL')), receiver, msg.as_string())
      finally:
        smtp.quit()
    except (smtplib.SMTPException, OSError) as e:
      logging.error('SendInvitation: sending to %s failed: %s' % (receiver, e))
      return self.fail('The invitation could not be sent. Please try again later.', 502)
    print('SendInvitation: invitation sent from %s' % ip)
    return HttpResponse("Invitation has been sent.")

@method_decorator(csrf_exempt, name='dispatch')
class RemoveRoomPage(View):
  def get(self, request, *args, **kwargs):
    return HttpResponse("GET is not allowed.")
  def post(self, request, *args, **kwargs):
    room_id = kwargs['room_id']
    host_url = request.META['HTTP_HOST']
    result = self.remove_room(host_url, room_id)
    if result['error'] is None:
      print('RemoveRoomPage: Room ' + room_id + ' has been removed.')
    return HttpResponse(json.dumps(result))
  def remove_room(self, host, room_id):
    key = get_redis_key_for_room(host, room_id)
    # Called by the collider when its room becomes empty. The endpoint is public,
    # so never delete a room that still has clients (prevents killing live calls).
    with room_lock(key):
      if redis_client.get(key) is None:
        logging.warning('RemoveRoomPage: remove_room: Unknown room ' + room_id)
        return {'error': settings.RESPONSE_UNKNOWN_ROOM, 'room_state': None}
      room = load_room(key)
      if room is not None and len(room.get_clients()) > 0:
        logging.warning('RemoveRoomPage: refusing to remove room %s with %d client(s)'
                        % (room_id, len(room.get_clients())))
        return {'error': settings.RESPONSE_ERROR, 'room_state': 'NOT_EMPTY'}
      redis_client.delete(key)
    return {'error': None}

class RoomPage(View):
  def get(self, request, *args, **kwargs):
    room_id = kwargs['room_id']
    """Renders index.html or full.html."""
    checkIfRedirect(request)
    # Check if room is full.
    key = get_redis_key_for_room(request.META['HTTP_HOST'], room_id)
    room_bytes = redis_client.get(key)  
    room = None
    if room_bytes is not None:
      room = pickle.loads(room_bytes)
    if room is not None:
      print('RoomPage: Room ' + room_id + ' has state ' + str(room))
      check_clients_availability('RoomPage', room.get_clients())
      if room.get_occupancy() >= 8:
        print('Room ' + room_id + ' is full')
        return render(request, 'full_template.html', {})
    else:
      print('No room %s found.' % (room_id))
    # Parse out room parameters from request.
    params = get_room_parameters(self.request, room_id, None, None)
    # room_id/room_link will be included in the returned parameters
    # so the client will launch the requested room.
    return render(request, 'main.html', params)


class RoomPageWithAdditionalParam(View):
  def get(self, request, *args, **kwargs):
    room_id = kwargs['room_id']
    additional_param = kwargs['additional_param']
    """Renders index.html or full.html."""
    checkIfRedirect(request)
    # Check if room is full.
    key = get_redis_key_for_room(request.META['HTTP_HOST'], room_id)      
    room_bytes = redis_client.get(key)  
    if room_bytes is not None:
      room = pickle.loads(room_bytes)
      print('RoomPageWithAdditionalParam: Room ' + room_id + ' has state ' + str(room))
      if room.get_occupancy() >= 8:
        print('Room ' + room_id + ' is full')
        return render(request, 'full_template.html', {})
    else:
      print('No room %s found.' % (room_id))
    # Parse out room parameters from request.
    params = get_room_parameters(self.request, room_id, None, None)
    if additional_param is not None:
      params['additional_param'] = additional_param
    print('add param: ' + str(params['additional_param']))
    # room_id/room_link will be included in the returned parameters
    # so the client will launch the requested room.
    return render(request, 'main.html', params)


def generate_random(length):
    word = ''
    for _ in range(length):
        word += random.choice('0123456789')

    return word

def checkIfRedirect(request):
  parsed_args = ''
  if request.headers['Host'] in settings.REDIRECT_DOMAINS:
    for argument in request.arguments():
      parameter = '=' + request.GET.get(argument)
      if parsed_args == '':
        parsed_args += '?'
      else:
        parsed_args += '&'
      parsed_args += argument + parameter
    redirect_url = settings.REDIRECT_URL + request.path + parsed_args
    print(parsed_args)
    redirect(redirect_url, permanent=True, abort=True)

# Returns appropriate room parameters based on query parameters in the request.
# TODO(tkchin): move query parameter parsing to JS code.


def get_room_parameters(request, room_id, client_id, sessions):
    error_messages = []
    warning_messages = []
    # Get the base url without arguments.
    base_url = request.path
    request_get = request.GET
    user_agent = request.headers['User-Agent']
    
    # HTML or JSON.
    response_type = request_get.get('t')
    # Which ICE candidates to allow. This is useful for forcing a call to run
    # over TURN, by setting it=relay.
    ice_transports = request_get.get('it')
    # Which ICE server transport= to allow (i.e., only TURN URLs with
    # transport=<tt> will be used). This is useful for forcing a session to use
    # TURN/TCP, by setting it=relay&tt=tcp.
    ice_server_transports = request_get.get('tt')
    # A HTTP server that will be used to find the right ICE servers to use, as
    # described in http://tools.ietf.org/html/draft-uberti-rtcweb-turn-rest-00.
    ice_server_base_url = request_get.get(
        'ts', settings.ICE_SERVER_BASE_URL)

    # Use "audio" and "video" to set the media stream constraints. Defined here:
    # http://goo.gl/V7cZg
    #
    # "true" and "false" are recognized and inte  reted as bools, for example:
    #   "?audio=true&video=false" (Start an audio-only call.)
    #   "?audio=false" (Start a video-only call.)
    # If unspecified, the stream constraint defaults to True.
    #
    # To specify media track constraints, pass in a comma-separated list of
    # key/value pairs, separated by a "=". Examples:
    #   "?audio=googEchoCancellation=false,googAutoGainControl=true"
    #   (Disable echo cancellation and enable gain control.)
    #
    #   "?video=minWidth=1280,minHeight=720,googNoiseReduction=true"
    #   (Set the minimum resolution to 1280x720 and enable noise reduction.)
    #
    # Keys starting with "goog" will be added to the "optional" key; all others
    # will be added to the "mandatory" key.
    # To override this default behavior, add a "mandatory" or "optional" prefix
    # to each key, e.g.
    #   "?video=optional:minWidth=1280,optional:minHeight=720,
    #       mandatory:googNoiseReduction=true"
    #   (Try to do 1280x720, but be willing to live with less; enable
    #  noise reduction or die trying.)
    #
    # The audio keys are defined here: talk/app/webrtc/localaudiosource.cc
    # The video keys are defined here: talk/app/webrtc/videosource.cc
    audio = request_get.get('audio')
    video = request_get.get('video')

    # Pass firefox_fake_device=1 to pass fake: true in the media constraints,
    # which will make Firefox use its built-in fake device.
    firefox_fake_device = request_get.get('firefox_fake_device')

    # The hd parameter is a shorthand to determine whether to open the
    # camera at 720p. If no value is provided, use a platform-specific default.
    # When defaulting to HD, use optional constraints, in case the camera
    # doesn't actually support HD modes.
    hd = request_get.get('hd')
    if hd:
      hd = hd.lower()
    if hd and video:
        message = 'The "hd" parameter has overridden video=' + video
        logging.warning(message)
        # HTML template is UTF-8, make sure the string is UTF-8 as well.
        warning_messages.append(message.encode('utf-8'))
    if hd == 'true':
        video = 'mandatory:minWidth=1280,mandatory:minHeight=720'
    elif not hd and not video and get_hd_default(user_agent) == 'true':
        video = 'optional:minWidth=1280,optional:minHeight=720'

    if request_get.get('minre') or request_get.get('maxre'):
        message = ('The "minre" and "maxre" parameters are no longer ' +
                   'supported. Use "video" instead.')
        logging.warning(message)
        # HTML template is UTF-8, make sure the string is UTF-8 as well.
        warning_messages.append(message.encode('utf-8'))

    # Options for controlling various networking features.
    dtls = request_get.get('dtls')
    dscp = request_get.get('dscp')
    ipv6 = request_get.get('ipv6')

    debug = request_get.get('debug')
    if debug == 'loopback':
        # Set dtls to false as DTLS does not work for loopback.
        dtls = 'false'
        include_loopback_js = '<script src="/js/loopback.js"></script>'
    else:
        include_loopback_js = ''

    # TODO(tkchin): We want to provide a ICE request url on the initial get,
    # but we don't provide client_id until a join. For now just generate
    # a random id, but we should make this better.
    username = client_id if client_id is not None else generate_random(9)
    if len(ice_server_base_url) > 0:
        ice_server_url = settings.ICE_SERVER_URL_TEMPLATE % \
            (ice_server_base_url, settings.ICE_SERVER_API_KEY)
    else:
        ice_server_url = ''

    # If defined it will override the ICE server provider and use the specified
    # turn servers directly.
    ice_server_override = settings.ICE_SERVER_OVERRIDE

    pc_config = make_pc_config(ice_transports, ice_server_override)
    pc_constraints = make_pc_constraints(dtls, dscp, ipv6)
    offer_options = {}
    media_constraints = make_media_stream_constraints(audio, video,
                                                      firefox_fake_device)
    wss_url, wss_post_url = get_wss_parameters(request)

    bypass_join_confirmation = 'BYPASS_JOIN_CONFIRMATION' in os.environ and \
        os.environ['BYPASS_JOIN_CONFIRMATION'] == 'True'

    host_url = settings.HOST_URL

    params = {
        'error_messages': error_messages,
        'warning_messages': warning_messages,
        'is_loopback': json.dumps(debug == 'loopback'),
        'pc_config': json.dumps(pc_config),
        'pc_constraints': json.dumps(pc_constraints),
        'offer_options': json.dumps(offer_options),
        'media_constraints': json.dumps(media_constraints),
        'ice_server_url': ice_server_url,
        'ice_server_transports': ice_server_transports,
        'include_loopback_js': include_loopback_js,
        'include_rtstats_js': '',
        'wss_url': wss_url,
        'wss_post_url': wss_post_url,
        'host_url': host_url,
        'bypass_join_confirmation': json.dumps(bypass_join_confirmation),
        'version_info': json.dumps(get_version_info())
    }

    if room_id is not None:
        host_url = request.META['HTTP_HOST']
        print('host_url', host_url)
        room_link = host_url + '/r/' + room_id
        print('room_link', room_link)
        # migration: removed add args to link
        # room_link = append_url_arguments(request, room_link)
        params['room_id'] = room_id
        params['room_link'] = room_link
        params['canonical'] = room_link
    else:
        params['canonical'] = 'https://www.qhellou.com'

    if client_id is not None:
        params['client_id'] = client_id
    if sessions is not None:
        params['sessions'] = sessions
    else:
        params['sessions'] = []
    return params

# HD is on by default for desktop Chrome, but not Android or Firefox (yet)


def get_hd_default(user_agent):
    if 'Android' in user_agent or not 'Chrome' in user_agent:
        return 'false'
    return 'true'

# iceServers will be filled in by the TURN HTTP request.


def make_pc_config(ice_transports, ice_server_override):
    config = {
        'iceServers': [],
        'bundlePolicy': 'max-bundle',
        'rtcpMuxPolicy': 'require'
    }
    if ice_server_override:
        config['iceServers'] = ice_server_override
    if ice_transports:
        config['iceTransports'] = ice_transports
    return config


def add_media_track_constraint(track_constraints, constraint_string):
    tokens = constraint_string.split(':')
    mandatory = True
    if len(tokens) == 2:
        # If specified, e.g. mandatory:minHeight=720, set mandatory appropriately.
        mandatory = (tokens[0] == 'mandatory')
    else:
        # Otherwise, default to mandatory, except for goog constraints, which
        # won't work in other browsers.
        mandatory = not tokens[0].startswith('goog')

    tokens = tokens[-1].split('=')
    if len(tokens) == 2:
        if mandatory:
            track_constraints['mandatory'][tokens[0]] = tokens[1]
        else:
            track_constraints['optional'].append({tokens[0]: tokens[1]})
    else:
        logging.error('Ignoring malformed constraint: ' + constraint_string)


def make_media_track_constraints(constraints_string):
    if not constraints_string or constraints_string.lower() == 'true':
        track_constraints = True
    elif constraints_string.lower() == 'false':
        track_constraints = False
    else:
        track_constraints = {'mandatory': {}, 'optional': []}
        for constraint_string in constraints_string.split(','):
            add_media_track_constraint(track_constraints, constraint_string)

    return track_constraints


def make_media_stream_constraints(audio, video, firefox_fake_device):

    stream_constraints = (
        {'audio': make_media_track_constraints(audio),
         'video': {
            'width': {'min': 640, 'ideal': 1280, 'max': 1920},
            'height': {'min': 480, 'ideal': 720, 'max': 1080}
            }
         })
           
    if firefox_fake_device:
        stream_constraints['fake'] = True
    return stream_constraints


def maybe_add_constraint(constraints, param, constraint):
    if param:
      if (param.lower() == 'true'):
          constraints['optional'].append({constraint: True})
      elif (param.lower() == 'false'):
          constraints['optional'].append({constraint: False})

    return constraints


def make_pc_constraints(dtls, dscp, ipv6):
    constraints = {'optional': []}
    maybe_add_constraint(constraints, dtls, 'DtlsSrtpKeyAgreement')
    maybe_add_constraint(constraints, dscp, 'googDscp')
    maybe_add_constraint(constraints, ipv6, 'googIPv6')

    return constraints


def get_wss_parameters(request):
    request_get = request.GET
    wss_host_port_pair = request_get.get('wshpp')
    wss_tls = settings.WSTLS
    
    if not wss_host_port_pair:
        # Single collider instance; no prober writes an active host to Redis.
        wss_host_port_pair = settings.WSS_HOST_PORT_PAIRS[0]
    if wss_tls == False:
        wss_url = 'ws://' + wss_host_port_pair + '/ws'
        wss_post_url = 'http://' + wss_host_port_pair
    else:
        wss_url = 'wss://' + wss_host_port_pair + '/ws'
        wss_post_url = 'https://' + wss_host_port_pair
    return (wss_url, wss_post_url)

_version_info_cache = []

def get_version_info():
    # Read version_info.json once per worker instead of on every request.
    if not _version_info_cache:
        _version_info_cache.append(_load_version_info())
    return _version_info_cache[0]

def _load_version_info():
    try:
        path = os.path.join(os.path.dirname(__file__), 'version_info.json')
        f = open(path)
        if f is not None:
            try:
                return json.load(f)
            except ValueError as e:
                logging.warning(
                    'version_info.json cannot be decoded: ' + str(e))
    except IOError as e:
        print('version_info.json cannot be opened: ' + str(e))
    return None

def get_redis_key_for_room(host, room_id):
  return '%s/%s' % (host, room_id)

def check_clients_availability(label, clients):
    print("#### [%s] CLIENTS (%d) ####" % (label, len(clients)))
    for client in clients:
      print("## %s" % (str(client)))
    print("#### /CLIENTS ####")

# migration: deprecated?
def append_url_arguments(request, link):
  arguments = request.arguments()
  if len(arguments) == 0:
    return link
  link += ('?' + cgi.escape(arguments[0], True) + '=' +
       cgi.escape(request.get(arguments[0]), True))
  for argument in arguments[1:]:
    link += ('&' + cgi.escape(argument, True) + '=' +
         cgi.escape(request.get(argument), True))
  return link
def get_room(host, room_id):
  key = get_redis_key_for_room(host, room_id)
  room_bytes = redis_client.get(key)
  if room_bytes is None:
    logging.warning("Room for key %s doesn't exists in the Redis store." % key)
    return None
  return pickle.loads(room_bytes)

def _post_to_collider(url, message):
  """POST to the collider over a pooled connection; returns None on network error/timeout."""
  try:
    return collider_session.post(url, data=message, timeout=COLLIDER_TIMEOUT, verify=settings.VERIFY)
  except requests.RequestException as e:
    logging.error('Collider request to %s failed: %s' % (url, e))
    return None

def post_request_to_collider(request, url, message):
  wss_url, wss_post_url = get_wss_parameters(request)
  post_url = wss_post_url + '/' + url + '?y=1'
  print('Post request to collider with url', post_url)
  return _post_to_collider(post_url, message)

def send_message_to_collider(request, room_id, client_id, message):
  wss_url, wss_post_url = get_wss_parameters(request)
  url = wss_post_url + '/' + room_id + '/' + client_id + '?x=1'
  print('Forwarding message to collider for room ' + room_id +
         ' client ', client_id, 'with url', url )
  return _post_to_collider(url, message)

