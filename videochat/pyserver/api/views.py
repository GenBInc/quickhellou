import uuid
import random
import os
import json

from django.shortcuts import render
from rest_framework import (views, viewsets, status)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.renderers import JSONRenderer, StaticHTMLRenderer
from rest_framework.decorators import (action, api_view, permission_classes)

from django.conf import settings

# Create your views here.

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
        'is_loopback': debug == 'loopback',
        'pc_config': pc_config,
        'pc_constraints': pc_constraints,
        'offer_options': offer_options,
        'media_constraints': media_constraints,
        'ice_server_url': ice_server_url,
        'ice_server_transports': ice_server_transports,
        'include_loopback_js': include_loopback_js,
        'include_rtstats_js': '',
        'wss_url': wss_url,
        'wss_post_url': wss_post_url,
        'bypass_join_confirmation': bypass_join_confirmation,
        'host_url': host_url,
        'version_info': get_version_info()
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
         'video': make_media_track_constraints(video)})
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
        wss_host_port_pair = settings.WSS_HOST_PORT_PAIRS[0]
    if wss_tls == False:
        wss_url = 'ws://' + wss_host_port_pair + '/ws'
        wss_post_url = 'http://' + wss_host_port_pair
    else:
        wss_url = 'wss://' + wss_host_port_pair + '/ws'
        wss_post_url = 'https://' + wss_host_port_pair
    return (wss_url, wss_post_url)

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
        print('version_info.json cannot be opened: ' + str(e))
    return None



@permission_classes((AllowAny,))
class VideoSettingsViewSet(views.APIView):
    def post(self, request, *args, **kwargs):
        room_id = kwargs['room_id']
        client_id = None
        params = get_room_parameters(request, room_id, client_id, None)
        # results = YourSerializer(yourdata, many=True).data
        return Response(params, content_type="application/json")

def generate_random(length):
    word = ''
    for _ in range(length):
        word += random.choice('0123456789')

    return word
