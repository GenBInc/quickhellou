#!/usr/bin/python2.4

# web framework
import webapp2

import py.compute_page

# app internals
from py.models import Room, Client, ClientSessionSerializer, ClientSession, ClientSessions, ClientList
from py.pages import JoinPage, LeavePage, RemoveRoomPage, MainPage, MessagePage, RoomPage, SessionsPage, ParamsPage, SessionMessagePage, RoomPageWithAdditionalParam, SchedulerPageWithRoomSelect, SchedulerPage, SessionsGetterPage, ConsumePage
from py.api import ApiRequestHandler
from py.emails import SendInvitation

app = webapp2.WSGIApplication([
  ('/', MainPage),
  ('/compute/(\w+)/(\S+)/(\S+)', py.compute_page.ComputePage),
  ('/join/([a-zA-Z0-9-_]+)', JoinPage),
  ('/sessions/([a-zA-Z0-9-_]+)', SessionsPage),
  ('/leave/([a-zA-Z0-9-_]+)/([a-zA-Z0-9-_]+)', LeavePage),
  ('/sessions-getter/([a-zA-Z0-9-_]+)', SessionsGetterPage),
  ('/consume/([a-zA-Z0-9-_]+)/([a-zA-Z0-9-_]+)/([a-zA-Z0-9-_]+)', ConsumePage),
  ('/removeRoom/([a-zA-Z0-9-_]+)', RemoveRoomPage),
  ('/message/([a-zA-Z0-9-_]+)/([a-zA-Z0-9-_]+)', MessagePage),
  ('/sessionmessage/([a-zA-Z0-9-_]+)/([a-zA-Z0-9-_]+)/([a-zA-Z0-9-_]+)', SessionMessagePage),
  ('/params', ParamsPage),
  ('/sendinvitation', SendInvitation),
  ('/scheduler', SchedulerPage),
  ('/scheduler/([a-zA-Z0-9-_]+)', SchedulerPageWithRoomSelect),
  ('/r/([a-zA-Z0-9-_]+)', RoomPage),
  ('/r/([a-zA-Z0-9-_]+)/([a-zA-Z0-9-_]+)', RoomPageWithAdditionalParam),
  ('/.*', ApiRequestHandler),
], debug=False)
