import logging
import uuid
import random
import os
import json
import threading
import time
from random import randrange

import Queue

# templating language
import jinja2

from google.appengine.api import memcache
from google.appengine.api import urlfetch
from google.appengine.api.urlfetch_errors import DeadlineExceededError

import webapp2
import constants

from models import Room

jinja_environment = jinja2.Environment(
  loader=jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__), 'templates')))

memcache_client = memcache.Client()

def get_version_info():
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
    logging.info('version_info.json cannot be opened: ' + str(e))
  return None

def checkIfRedirect(self):
  parsed_args = ''
  if self.request.headers['Host'] in constants.REDIRECT_DOMAINS:
    for argument in self.request.arguments():
      parameter = '=' + self.request.get(argument)
      if parsed_args == '':
        parsed_args += '?'
      else:
        parsed_args += '&'
      parsed_args += argument + parameter
    redirect_url = constants.REDIRECT_URL + self.request.path + parsed_args
    webapp2.redirect(redirect_url, permanent=True, abort=True)

def get_memcache_key_for_room(host, room_id):
  return '%s/%s' % (host, room_id)

def generate_random(length):
  word = ''
  for _ in range(length):
    word += random.choice('0123456789')
  
  return word

def get_room_parameters(request, room_id, client_id, sessions):
  error_messages = []
  warning_messages = []
  # Get the base url without arguments.
  base_url = request.path_url
  user_agent = request.headers['User-Agent']
  # HTML or JSON.
  response_type = request.get('t')
  # Which ICE candidates to allow. This is useful for forcing a call to run
  # over TURN, by setting it=relay.
  ice_transports = request.get('it')
  # Which ICE server transport= to allow (i.e., only TURN URLs with
  # transport=<tt> will be used). This is useful for forcing a session to use
  # TURN/TCP, by setting it=relay&tt=tcp.
  ice_server_transports = request.get('tt')
  # A HTTP server that will be used to find the right ICE servers to use, as
  # described in http://tools.ietf.org/html/draft-uberti-rtcweb-turn-rest-00.
  ice_server_base_url = request.get(
    'ts', default_value=constants.ICE_SERVER_BASE_URL)

  # Use "audio" and "video" to set the media stream constraints. Defined here:
  # http://goo.gl/V7cZg
  #
  # "true" and "false" are recognized and interpreted as bools, for example:
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
  audio = request.get('audio')
  video = request.get('video')

  # Pass firefox_fake_device=1 to pass fake: true in the media constraints,
  # which will make Firefox use its built-in fake device.
  firefox_fake_device = request.get('firefox_fake_device')

  # The hd parameter is a shorthand to determine whether to open the
  # camera at 720p. If no value is provided, use a platform-specific default.
  # When defaulting to HD, use optional constraints, in case the camera
  # doesn't actually support HD modes.
  hd = request.get('hd').lower()
  if hd and video:
    message = 'The "hd" parameter has overridden video=' + video
    logging.warning(message)
    # HTML template is UTF-8, make sure the string is UTF-8 as well.
    warning_messages.append(message.encode('utf-8'))
  if hd == 'true':
    video = 'mandatory:minWidth=1280,mandatory:minHeight=720'
  elif not hd and not video and get_hd_default(user_agent) == 'true':
    video = 'optional:minWidth=1280,optional:minHeight=720'

  if request.get('minre') or request.get('maxre'):
    message = ('The "minre" and "maxre" parameters are no longer ' +
           'supported. Use "video" instead.')
    logging.warning(message)
    # HTML template is UTF-8, make sure the string is UTF-8 as well.
    warning_messages.append(message.encode('utf-8'))

  # Options for controlling various networking features.
  dtls = request.get('dtls')
  dscp = request.get('dscp')
  ipv6 = request.get('ipv6')

  debug = request.get('debug')
  if debug == 'loopback':
    # Set dtls to false as DTLS does not work for loopback.
    dtls = 'false'
    include_loopback_js = '<script src="/js/loopback.js"></script>'
  else:
    include_loopback_js = ''

  include_rtstats_js = ''
  if str(os.environ.get('WITH_RTSTATS')) != 'none' or \
    (os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine/') and
     app_identity.get_application_id() == 'apprtc'):
    include_rtstats_js = \
      '<script src="/js/rtstats.js"></script><script src="/pako/pako.min.js"></script>'

  # TODO(tkchin): We want to provide a ICE request url on the initial get,
  # but we don't provide client_id until a join. For now just generate
  # a random id, but we should make this better.
  username = client_id if client_id is not None else generate_random(9)
  if len(ice_server_base_url) > 0:
    ice_server_url = constants.ICE_SERVER_URL_TEMPLATE % \
      (ice_server_base_url, constants.ICE_SERVER_API_KEY)
  else:
    ice_server_url = ''

  # If defined it will override the ICE server provider and use the specified
  # turn servers directly.
  ice_server_override = constants.ICE_SERVER_OVERRIDE

  pc_config = make_pc_config(ice_transports, ice_server_override)
  pc_constraints = make_pc_constraints(dtls, dscp, ipv6)
  offer_options = {}
  media_constraints = make_media_stream_constraints(audio, video,
                            firefox_fake_device)
  wss_url, wss_post_url = get_wss_parameters(request)

  bypass_join_confirmation = 'BYPASS_JOIN_CONFIRMATION' in os.environ and \
    os.environ['BYPASS_JOIN_CONFIRMATION'] == 'True'

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
    'include_rtstats_js': include_rtstats_js,
    'wss_url': wss_url,
    'wss_post_url': wss_post_url,
    'bypass_join_confirmation': json.dumps(bypass_join_confirmation),
    'version_info': json.dumps(get_version_info())
  }

  if room_id is not None:
    room_link = request.host_url + '/r/' + room_id
    room_link = append_url_arguments(request, room_link)
    params['room_id'] = room_id
    params['room_link'] = room_link
    params['canonical'] = room_link
  else:
    params['canonical'] = 'https://www.quickhellou.com'
    
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

def get_wss_parameters(request):
  wss_host_port_pair = request.get('wshpp')
  wss_tls = request.get('wstls')

  if not wss_host_port_pair:
    # Attempt to get a wss server from the status provided by prober,
    # if that fails, use fallback value.
    wss_active_host = memcache_client.get(
      constants.WSS_HOST_ACTIVE_HOST_KEY)
    if wss_active_host in constants.WSS_HOST_PORT_PAIRS:
      wss_host_port_pair = wss_active_host
    else:
      # logging.warning(
      #  'Invalid or no WSS host value returned from memcache, using fallback: '
      #  + json.dumps(wss_active_host))
      wss_host_port_pair = constants.WSS_HOST_PORT_PAIRS[0]

  if wss_tls and wss_tls == 'false':
    wss_url = 'ws://' + wss_host_port_pair + '/ws'
    wss_post_url = 'http://' + wss_host_port_pair
  else:
    wss_url = 'wss://' + wss_host_port_pair + '/ws'
    wss_post_url = 'https://' + wss_host_port_pair
  return (wss_url, wss_post_url)

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

def maybe_add_constraint(constraints, param, constraint):
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
     'video': make_media_track_constraints(video)})
  if firefox_fake_device:
    stream_constraints['fake'] = True
  return stream_constraints

def check_clients_availability(label, clients):
    logging.info("#### [%s] CLIENTS (%d) ####" % (label, len(clients)))
    for client in clients:
      logging.info("## %s" % (str(client)))
    logging.info("#### /CLIENTS ####")

def post_request_to_collider(request, url, message):
  wss_url, wss_post_url = get_wss_parameters(request)
  post_url = wss_post_url + '/' + url
  try:
    result = urlfetch.fetch(url=post_url,
              payload=message,
              deadline=10,
              method=urlfetch.POST)
    return result
  except DeadlineExceededError:
    logging.info('Collider request timeout.')
    return None
  return None
def send_message_to_collider(request, room_id, client_id, message):
  logging.info('Forwarding message to collider for room ' + room_id +
         ' client ' + client_id)
  wss_url, wss_post_url = get_wss_parameters(request)
  url = wss_post_url + '/' + room_id + '/' + client_id
  logging.info('url %s' % url)
  return urlfetch.fetch(url=url,
              payload=message,
              method=urlfetch.POST)

class SessionsGetterPage(webapp2.RequestHandler):
  def post(self, room_id):
    key = get_memcache_key_for_room(self.request.host_url, room_id)
    retries = 0
    while True:
      room = memcache_client.gets(key)
      if room == None:
        return
      room.clear_duplicate_sessions()
      if memcache_client.cas(key, room, constants.ROOM_MEMCACHE_EXPIRATION_SEC):
        logging.info('sessions deduped retries: %d' % retries)
        self.send_session_update(room, room_id)
        return
      if retries > 10:
        return
      retries = retries + 1
    self.write_response(str(messages))
  def write_response(self, result):
    content = json.dumps({'sessions': result})
    self.response.write(content)
  def send_session_update(self, room, room_id):
    if room == None:
      message = json.dumps([]) 
    else:
      message = str(room.clientSessions)
    logging.info('SessionsGetterPage: message %s' % (message))
    url = 'session-update/%s' % room_id
    result = post_request_to_collider(self.request, url, message)
    if result is None:
      logging.info('LeavePage: Request result is none.')
      return
    if result.status_code != 200:
      logging.error(
        'LeavePage: Failed to send message to collider: %d' % (result.status_code))
      self.error(500)
      return

class LeavePage(webapp2.RequestHandler):
  def post(self, room_id, client_id):
    logging.info('LeavePage: client %s' % (client_id))
    lock = threading.Lock()
    remove_thread = threading.Thread(target=self.async_remove_client_from_room, args=(lock, self.request.host_url, room_id, client_id))
    remove_thread.start()
    remove_thread.join()

    self.send_session_update(room_id)
    
  def async_remove_client_from_room(self, lock, host, room_id, client_id):
    lock.acquire()
    self.remove_client_from_room(host, room_id, client_id)
    lock.release()
  def remove_client_from_room(self, host, room_id, client_id):
    key = get_memcache_key_for_room(host, room_id)
    retries = 0
    # Compare and set retry loop.
    while True:
      room = memcache_client.gets(key)
      if room is None:
        logging.warning('LeavePage: Unknown room ' + room_id)
        return {'error': constants.RESPONSE_UNKNOWN_ROOM, 'room_state': None}
      if not room.has_client(client_id):
        logging.warning('LeavePage: Unknown client ' + client_id +
            ' for room ' + room_id)
        return {'error': constants.RESPONSE_UNKNOWN_CLIENT, 'room_state': None}

      sessions = room.get_sessions_by_client_id(client_id)
      for session in sessions:
        room.remove_session_client(session.id, client_id)
        if session is not None:
          other_client = session.get_any_client()
          if other_client is not None:
            logging.info('LeavePage: User %s from session %s became initiator' % (other_client.get_id(), session.id))
            other_client.set_initiator(True)

      #if room.has_client(constants.LOOPBACK_CLIENT_ID):
      #  room.remove_client(constants.LOOPBACK_CLIENT_ID)
        
      pending_sessions_count = room.get_pending_sessions_count()
      sessions_count = room.get_sessions_count()
      logging.info('LeavePage: total sessions %d', sessions_count)

      room.clear_duplicate_sessions()

      check_clients_availability('LeavePage', room.get_clients())
      if sessions_count == 0:
        logging.info('LeavePage: removing room')
        room = None
      
      if memcache_client.cas(key, room, constants.ROOM_MEMCACHE_EXPIRATION_SEC):
        logging.info('LeavePage: Removed client %s from room %s, retries=%d'
            % (client_id, room_id, retries))
        logging.info('LeavePage: Room %s has state %s' % (room_id, str(room)))
        return

      retries = retries + 1
  def send_session_update(self, room_id):
    room = get_room(self.request.host_url, room_id)
    if room == None:
      message = json.dumps([]) 
    else:
      message = str(room.clientSessions)
    url = 'session-update/%s' % room_id
    result = post_request_to_collider(self.request, url, message)
    if result is None:
      logging.info('LeavePage: Request result is none.')
      return
    if result.status_code != 200:
      logging.error(
        'LeavePage: Failed to send message to collider: %d' % (result.status_code))
      self.error(500)
      return

def get_room(host, room_id):
  key = get_memcache_key_for_room(host, room_id)
  return memcache_client.gets(key)
    

class RemoveRoomPage(webapp2.RequestHandler):
  def post(self, room_id):
    result = self.remove_room(
      self.request.host_url, room_id)
    if result['error'] is None:
      logging.info('RemoveRoomPage: Room ' + room_id + ' has been removed.')

  def remove_room(self, host, room_id):
    key = get_memcache_key_for_room(host, room_id)
    room = memcache_client.gets(key)
    if room is None:
      logging.warning('RemoveRoomPage: remove_room: Unknown room ' + room_id)
      return {'error': constants.RESPONSE_UNKNOWN_ROOM, 'room_state': None}
      
    room.clear_sessions()
    del room
    memcache_client.delete(key)

    return {'error': None}

class JoinPage(webapp2.RequestHandler):
  def write_response(self, result, params, messages):
    # TODO(tkchin): Clean up response format. For simplicity put everything in
    # params for now.
    params['messages'] = messages
    self.response.write(json.dumps({
      'result': result,
      'params': params
    }))

  def write_room_parameters(self, room_id, client_id, sessions, messages):
    params = get_room_parameters(
      self.request, room_id, client_id, sessions)
    self.write_response('SUCCESS', params, messages)

  def post(self, room_id):
    client_id = self.generate_uuid()
    is_loopback = self.request.get('debug') == 'loopback'
    lock = threading.Lock()
    queue = Queue.Queue()
    add_thread = threading.Thread(target=self.async_add_client_to_room, args=(lock, queue, self.request, room_id, client_id, is_loopback))
    add_thread.start()
    add_thread.join()
    result = queue.get()
    # self.send_session_update(room_id)
    self.write_room_parameters(
      room_id, client_id, result['sessions'], result['messages'])
    logging.info('JoinPage: User ' + client_id + ' joined room ' + room_id)
    logging.info('JoinPage: Room ' + room_id + ' has state ' + result['room_state'])

  def async_add_client_to_room(self, lock, queue, request, room_id, client_id, is_loopback):
    lock.acquire()
    result = self.add_client_to_room(queue, request, room_id, client_id, is_loopback)
    lock.release()
  def add_client_to_room(self, queue, request, room_id, client_id, is_loopback):
    key = get_memcache_key_for_room(request.host_url, room_id)
    error = None
    retries = 0
    room = None
    # Compare and set retry loop.
    while True:
      messages = []
      room_state = ''
      room = memcache_client.gets(key)
      if room is None:
        # 'set' and another 'gets' are needed for CAS to work.
        if not memcache_client.set(key, Room()):
          logging.warning('JoinPage: memcache.Client.set failed for key ' + key)
          error = constants.RESPONSE_ERROR
          break
        room = memcache_client.gets(key)

      sessions_count = room.get_sessions_count()
      pending_sessions_count = room.get_pending_sessions_count()

      if room.has_client(client_id):
        error = constants.RESPONSE_DUPLICATE_CLIENT
        break

      other_clients = []
      sessions = []

      # If no pending session are available
      # set client as initiator.
      if pending_sessions_count == 0:
        # check for other clients
        active_clients_len = len(room.get_clients()) 
        # add session and initiator client
        if (active_clients_len == 0):
          logging.info('JoinPage: no active sessions, adding initiator')
          sessions.append(str(room.add_initiator(client_id, '')))
        else:
          logging.info('JoinPage: active sessions exists, adding initiators and receivers')
          for other_client_id in room.get_distinct_clients():
              serializedSession = room.add_initiator(client_id, other_client_id)
              logging.info('JoinPage: append two-way session %s: client %s with other %s' % (serializedSession.id, client_id, other_client_id))
              sessions.append(str(serializedSession))
              sessions.append(str(room.add_receiver(serializedSession.id, other_client_id, client_id, {}, True)))
        #if is_loopback:
        #  room.add_client(constants.LOOPBACK_CLIENT_ID, Client(False))
      else:
        for session in room.serialize_pending_sessions():
          initiator_client = session.get_initiator()
          messages = list(initiator_client.messages)
          logging.info('JoinPage: add receiver %s with %s messages (%d)' % (client_id, initiator_client.get_id(), len(messages)))
          sessions.append(str(room.add_receiver(session.id, client_id, initiator_client.get_id(), messages, False)))
          initiator_client.clear_messages()

      if memcache_client.cas(key, room, constants.ROOM_MEMCACHE_EXPIRATION_SEC):
        logging.info('JoinPage: Added client %s in room %s, retries = %d'
              % (client_id, room_id, retries))
        logging.info('JoinPage: Room %s has state %s' % (room_id, str(room)))
        break
      else:
        retries = retries + 1
    check_clients_availability('JoinPage',room.get_clients())
    return_value = {'error': error, 'sessions':sessions,
        'messages': messages, 'room_state': str(room)}
    queue.put(return_value)
    return return_value

  def generate_uuid(self):
    user_agent = self.request.headers['User-Agent']
    key = generate_random(8) + str(self.request.cookies['_ga'])
    return str(uuid.uuid3(uuid.NAMESPACE_DNS, key))

class ConsumePage(webapp2.RequestHandler):
  def post(self, room_id, session_id, client_id):
    key = get_memcache_key_for_room(self.request.host_url, room_id)
    retries = 0
    while True:
      room = memcache_client.gets(key)
      if room == None:
        return
      result = self.consume(room, session_id, client_id)
      if memcache_client.cas(key, room, constants.ROOM_MEMCACHE_EXPIRATION_SEC):
        logging.info('consume actions done, retries: %d' % retries)
        self.write_response(result)
        return
      if retries > 10:
        return
      retries = retries + 1
  def write_response(self, result):
    content = json.dumps({'messages': result})
    self.response.write(content)
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
    # logging.info('ConsumePage: consume receiver %s messages [%d]' % (client_id, len(return_list)))
    initiator_client.clear_messages()
    return return_list

class SessionsPage(webapp2.RequestHandler):
  def post(self, room_id):
    key = get_memcache_key_for_room(self.request.host_url, room_id)
    error = None
    retries = 0
    room = None
    # Compare and set retry loop.
    while True:
      messages = []
      room_state = ''
      room = memcache_client.gets(key)
      if room is None:
        # 'set' and another 'gets' are needed for CAS to work.
        if not memcache_client.set(key, Room()):
          logging.warning('memcache.Client.set failed for key ' + key)
          error = constants.RESPONSE_ERROR
          break
        room = memcache_client.gets(key)
      sessions = []
      for session in room.serialize_pending_sessions():
        sessionObj = {'id':session.id,'other_client_id':session.get_initiator().id}
        sessions.append(sessionObj)
      self.write_response(sessions)
      break
  def write_response(self, result):
    content = json.dumps({'sessions': result})
    self.response.write(content)

class RoomPage(webapp2.RequestHandler):
  def write_response(self, target_page, params={}):
    template = jinja_environment.get_template(target_page)
    content = template.render(params)
    self.response.out.write(content)

  def send_message_to_collider(self, room_id, client_id, message):
    result = send_message_to_collider(self.request, room_id, client_id, message)
    if result.status_code != 200:
      logging.error(
        'Failed to send message to collider: %d' % (result.status_code))
      # TODO(tkchin): better error handling.
      self.error(500)
      return
    self.write_response(constants.RESPONSE_SUCCESS)

  def get(self, room_id):
    """Renders index.html or full.html."""
    checkIfRedirect(self)
    # Check if room is full.
    room = memcache.get(
      get_memcache_key_for_room(self.request.host_url, room_id))
    if room is not None:
      logging.info('RoomPage: Room ' + room_id + ' has state ' + str(room))
      check_clients_availability('RoomPage',room.get_clients())
      if room.get_occupancy() >= 8:
        logging.info('Room ' + room_id + ' is full')
        self.write_response('full_template.html')
        return
    else:
      logging.info('No room %s found.' % (room_id))
    
    # Parse out room parameters from request.
    params = get_room_parameters(self.request, room_id, None, None)
    # room_id/room_link will be included in the returned parameters
    # so the client will launch the requested room.
    self.write_response('index_template.html', params)

class SessionMessagePage(webapp2.RequestHandler):
  def write_response(self, result):
    content = json.dumps({'result': result})
    self.response.write(content)

  def send_message_to_collider(self, room_id, client_id, message):
    result = send_message_to_collider(self.request, room_id, client_id, message)
    if result.status_code != 200:
      logging.error(
        'Failed to send message to collider: %d' % (result.status_code))
      # TODO(tkchin): better error handling.
      self.error(500)
      return
    self.write_response(constants.RESPONSE_SUCCESS)
    
  def post(self, room_id, session_id, client_id):
    message_json = self.request.body
    result = self.save_message_from_session_client(
      self.request.host_url, room_id, session_id, client_id, message_json)
    if result['error'] is not None:
      self.write_response(result['error'])
      return
    if not result['saved']:
      # Other client joined, forward to collider. Do this outside the lock.
      # Note: this may fail in local dev server due to not having the right
      # certificate file locally for SSL validation.
      # Note: loopback scenario follows this code path.
      # TODO(tkchin): consider async fetch here.
      self.send_message_to_collider(room_id, client_id, message_json)
    else:
      self.write_response(constants.RESPONSE_SUCCESS)
  def save_message_from_session_client(self, host, room_id, session_id, client_id, message):
    text = None
    try:
      text = message.encode(encoding='utf-8', errors='strict')
    except Exception as e:
      return {'error': constants.RESPONSE_ERROR, 'saved': False}

    key = get_memcache_key_for_room(host, room_id)
    retries = 0
    # Compare and set retry loop.
    while True:
      room = memcache_client.gets(key)
      if room is None:
        logging.warning('Unknown room: ' + room_id)
        return {'error': constants.RESPONSE_UNKNOWN_ROOM, 'saved': False}
      if not room.has_client(client_id):
        logging.warning('Unknown client: ' + client_id)
        return {'error': constants.RESPONSE_UNKNOWN_CLIENT, 'saved': False}
      
      session = room.get_session(session_id)

      if session is None:
        return {'error': None, 'saved': False}

      if session.is_full() > 1:
        return {'error': None, 'saved': False}

      client = room.get_session_client(session.id, client_id)
      # logging.info('SessionMessagePage: save_message_from_session_client client: %s %s' % (client.get_id(), str(client)))
      client.add_message(text)
      if memcache_client.cas(key, room, constants.ROOM_MEMCACHE_EXPIRATION_SEC):
        # logging.info('Saved message for client %s:%s in room %s, retries=%d'
        #       % (client_id, str(client), room_id, retries))
        return {'error': None, 'saved': True}
      retries = retries + 1

class MessagePage(webapp2.RequestHandler):
  def write_response(self, result):
    content = json.dumps({'result': result})
    self.response.write(content)

  def post(self, room_id, client_id):
    message_json = self.request.body
    result = save_message_from_client(
      self.request.host_url, room_id, client_id, message_json)
    if result['error'] is not None:
      self.write_response(result['error'])
      return
    if not result['saved']:
      # Other client joined, forward to collider. Do this outside the lock.
      # Note: this may fail in local dev server due to not having the right
      # certificate file locally for SSL validation.
      # Note: loopback scenario follows this code path.
      # TODO(tkchin): consider async fetch here.
      self.send_message_to_collider(room_id, client_id, message_json)
    else:
      self.write_response(constants.RESPONSE_SUCCESS)

class MainPage(webapp2.RequestHandler):
  def write_response(self, target_page, params={}):
    template = jinja_environment.get_template(target_page)
    content = template.render(params)
    self.response.out.write(content)

  def get(self):
    """Renders index.html."""
    checkIfRedirect(self)
    # room_id/room_link will not be included in the returned parameters
    # so the client will show the landing page for room selection.
    self.write_response('home_template.html')

class SchedulerPage(webapp2.RequestHandler):
  def write_response(self, target_page, params={}):
    template = jinja_environment.get_template(target_page)
    content = template.render(params)
    self.response.out.write(content)
  def get(self):
    """Renders index.html."""
    checkIfRedirect(self)
    # Parse out parameters from request.
    params = get_room_parameters(self.request, None, None, None)
    # room_id/room_link will not be included in the returned parameters
    # so the client will show the landing page for room selection.
    self.write_response('scheduler.html', params)

class SchedulerPageWithRoomSelect(webapp2.RequestHandler):
  def write_response(self, target_page, params={}):
    template = jinja_environment.get_template(target_page)
    content = template.render(params)
    self.response.out.write(content)

  def get(self, room_id):
    checkIfRedirect(self)
    # Check if room is full.
    room = memcache.get(
      get_memcache_key_for_room(self.request.host_url, room_id))
    if room is not None:
      logging.info('SchedulerPageWithRoomSelect: Room ' + room_id + ' has state ' + str(room))
      if room.get_occupancy() >= 8:
        logging.info('Room ' + room_id + ' is full')
        self.write_response('scheduler.html')
        return
    # Parse out room parameters from request.
    params = get_room_parameters(self.request, room_id, None, None)
    # room_id/room_link will be included in the returned parameters
    # so the client will launch the requested room.
    self.write_response('scheduler.html', params)

class RoomPageWithAdditionalParam(webapp2.RequestHandler):
  def write_response(self, target_page, params={}):
    template = jinja_environment.get_template(target_page)
    content = template.render(params)
    self.response.out.write(content)

  def get(self, room_id, additional_param):
    """Renders index.html or full.html."""
    checkIfRedirect(self)
    # Check if room is full.
    room = memcache.get(
      get_memcache_key_for_room(self.request.host_url, room_id))
    if room is not None:
      logging.info('RoomPageWithAdditionalParam: Room ' + room_id + ' has state ' + str(room))
      if room.get_occupancy() >= 8:
        logging.info('Room ' + room_id + ' is full')
        self.write_response('full_template.html')
        return
    
    # Parse out room parameters from request.
    params = get_room_parameters(self.request, room_id, None, None)
    if additional_param is not None:
      params['additional_param'] = additional_param
    logging.info('add param: ' + str(params['additional_param']))
    # room_id/room_link will be included in the returned parameters
    # so the client will launch the requested room.
    self.write_response('index_template.html', params)

class ParamsPage(webapp2.RequestHandler):
  def get(self):
    # Return room independent room parameters.
    params = get_room_parameters(self.request, None, None, None)
    self.response.write(json.dumps(params))