# port from models.py
import logging
import uuid
import json
import gc

class Client:
  def __init__(self, id, is_initiator):
    self.is_initiator = is_initiator
    self.messages = []
    self.id = id

  def add_message(self, msg):
    self.messages.append(msg)
    # for item in self.messages:
    #  if 'sdp' in item:
    #    print("@@@ contains sdp")

  def clear_messages(self):
    self.messages = []

  def has_messages(self):
    return len(self.messages) > 0

  def set_initiator(self, initiator):
    self.is_initiator = initiator

  def get_is_initiator(self):
    return self.is_initiator

  def get_id(self):
    return self.id

  def __str__(self):
    return '{%r, %d}' % (self.is_initiator, len(self.messages))

class ClientSessionSerializer:
  def __init__(self, session_id, other_client_id, messages, is_initiator, is_forward):
    self.id = session_id
    self.other_client_id = other_client_id
    self.is_initiator = is_initiator
    self.is_forward = is_forward
    self.messages = json.dumps(messages)

  def __str__(self):
    return '{\"id\":\"%s\", \"other_client_id\":\"%s\", \"messages\":%s, \"is_initiator\":\"%s\", \"is_forward\":\"%s\"}' % (self.id, self.other_client_id, self.messages, self.is_initiator, self.is_forward)

class ClientSession:
  def __init__(self, session_id):
    self.id = session_id
    self.messages = []
    self.clients = {}
    
  def add_client(self, client_id, client):
    self.clients[client_id] = client

  def remove_client(self, client_id):
    del self.clients[client_id]
  
  def remove_all_clients(self):
    for key in list(self.clients.keys()):
      del self.clients[key]
    # print("[ClientSession::remove_all_clients] len: %d" % len(gc.get_referrers(self.clients[key])))

  def has_client(self, client_id):
    return client_id in self.clients

  def get_client(self, client_id):
    return self.clients[client_id]

  def get_any_client(self):
    for key, client in self.clients.items():
      return client
    return None
  
  def get_initiator(self):
    for key, client in self.clients.items():
      if (client.get_is_initiator):
        return client
    return None;

  def get_other_client(self, client_id):
    for key, client in self.clients.items():
      if key is not client_id:
        return client
    return None

  def is_full(self):
    return len(self.clients) == 2

  def is_pending(self):
    return len(self.clients) == 1
  
  def is_empty(self):
    return len(self.clients) == 0

  def add_message(self, msg):
    self.messages.append(msg)

  def clear_messages(self):
    self.messages = []

  def get_id(self):
    return self.id

  def __str__(self):
    return '{%r}' % (len(self.messages))

class ClientSessions:
  def __init__(self):
    self.sessions = {}

  def add_initiator(self, client_id, session_id):
    print('MAIN =======> ClientSessions: add_initiator %s %s' % (client_id, session_id))
    session = ClientSession(session_id)
    session.add_client(client_id, Client(client_id, True))
    self.add_session(session_id, session)
  
  def add_receiver(self, session_id, client_id, other_client_id, messages, is_forward):
    print('MAIN =======> ClientSessions: add_receiver %s for initiator %s' % (client_id, other_client_id))
    session = self.get_pending_session()
    session.add_client(client_id, Client(client_id, False))
    if is_forward:
      return ClientSessionSerializer(session.get_id(), client_id, messages, False, is_forward)
    else:
      return ClientSessionSerializer(session.get_id(), other_client_id, messages, False, is_forward)

  def add_client(self, client_id, client):
    pending_sessions_count = self.get_pending_sessions_count()
    if (pending_sessions_count == 0):
      session_id = str(uuid.uuid4())
      session = ClientSession(session_id)
    else:
      session = self.get_pending_session()

    session.add_client(client_id, client)
    self.add_session(session_id, session)
    return session_id

  def remove_client(self, client_id):
   for key, session in self.sessions.items():
     if session.has_client(client_id):
       session.remove_client(client_id)
       if session.is_empty():
         self.remove_session(session.get_id())
       break
  def get_client(self, client_id):
    for key, session in self.sessions.items():
      if session.has_client(client_id):
        return session.get_client(client_id)
    return None;

  def get_other_client(self, client_id):
    for key, session in self.sessions.items():
     if (session.has_client(client_id)):
       return session.get_other_client(client_id)
    return None

  def get_clients(self):
    clients = []
    for key, session in self.sessions.items():
     clients = clients + list(session.clients.items())
    return clients
  
  def get_distinct_clients(self):
    distinct_clients = []
    for client_id, client in self.get_clients():
      distinct_clients.append(client.get_id())
    distinct_clients = list(set(distinct_clients))
    print('MAIN =======> ClientSessions: distinct clients: %s ' % (distinct_clients))
    return distinct_clients

  def get_pending_client(self):
    pending_session = self.get_pending_session()
    return pending_session.get_initiator() 

  def add_session(self, session_id, session):
    self.sessions[session_id] = session

  def remove_session(self, session_id):
    del self.sessions[session_id]
    # print('MAIN =======> ClientSessions: Session %s removed' % session_id)
    print('MAIN =======> Removing session [%s] %d' % (session_id, len(self.sessions.items())))
  

  def has_session(self, session_id):
    return session_id in self.sessions

  def get_session(self, session_id):
    if session_id in self.sessions:
      return self.sessions[session_id]
    print('MAIN =======> ClientSessions: Session %s doesn\'t exist' % session_id)
    return None
  def get_sessions(self):
    return self.sessions.items()

  def get_sessions_count(self):
    return len(self.sessions.items())
  
  def get_pending_sessions(self):
    sessions = {}
    for key, session in self.sessions.items():
      if (session.is_pending()):
        sessions[session.id] = session
    return sessions

  def serialize_pending_sessions(self):
    sessions = []
    for key, session in self.sessions.items():
      if (session.is_pending()):
        initiator = session.get_initiator()
        sessions.append(session)
    return sessions

  def get_pending_session(self):
    for key, session in self.sessions.items():
      if (session.is_pending()):
        return session
    
  def get_full_sessions(self):
    sessions = {}
    for key, session in self.sessions.items():
      if (session.is_full()):
        sessions[session.id] = session
    return sessions
    
  def get_full_sessions_count(self):
    sessions = self.get_pending_sessions()
    return len(sessions.items())

  def get_pending_sessions_count(self):
    sessions = self.get_pending_sessions()
    return len(sessions.items())

  def get_session_by_client_id(self, client_id):
    for key, session in self.sessions.items():
      if (session.has_client(client_id)):
        return session
    return None  

  def get_sessions_by_client_id(self, client_id):
    sessions = []
    for key, session in self.sessions.items():
      if (session.has_client(client_id)):
        sessions.append(session)
    return sessions  

  def has_client(self, client_id):
    for key, session in self.sessions.items():
      if (session.has_client(client_id)):
        return True
    return False

  def get_state(self):
    output = ''
    for key, session in self.sessions.items():
      output = output + '<' + key + ':'
      for clientId, client in session.clients.items():
        output = output + ' ' + clientId + str(client)
      output  = output + '>'
          
    return output

  def clear_sessions(self):
    for key in list(self.sessions.keys()):
      self.sessions[key].remove_all_clients()
      self.remove_session(key)
      print('MAIN =======> ===========================> DELETE SESSION clear_sessions [%s]' % (key))
      
  def clear_duplicate_sessions(self):
    clients = []
    pending_sessions = self.get_pending_sessions()
    ordered_sessions = []
    for session_id in pending_sessions:
      session = self.get_session(session_id)
      client = session.get_initiator()
      if not client.has_messages():
        ordered_sessions.append(session)
    for session_id in pending_sessions:
      session = self.get_session(session_id)
      client = session.get_initiator()
      if client.has_messages():
        ordered_sessions.append(session)
    for session in ordered_sessions:
      client = session.get_initiator()
      if client.get_id() in clients and client.has_messages():
      # if client.get_id() in clients:
        print('MAIN =======> %%%% ClientSessions: removing client %s along with session %s' % (client.get_id(), session.id))
        session.remove_client(client.get_id())
        self.remove_session(session.id)
      else:
        clients.append(client.get_id())
  def __str__(self):
    return str(list(self.sessions.keys()))

class ClientList:
  def __init__(self):
    self.clients = {}

  def add_client(self, client_id, client):
    self.clients[client_id] = client

  def remove_client(self, client_id):
    del self.clients[client_id]

  def get_count(self):
    return len(self.clients)

  def has_client(self, client_id):
    return client_id in self.clients

  def get_client(self, client_id):
    return self.clients[client_id]

  def get_other_clients(self, client_id):
    otherClientList = {}
    for key, client in self.clients.items():
      if key != client_id:
        otherClientList[client_id] = client
    return otherClientList

  def __str__(self):
    return ["%s" % k for k in self.clients]

# For now we have (room_id, client_id) pairs are 'unique' but client_ids are
# not. Uniqueness is not enforced however and bad things may happen if RNG
# generates non-unique numbers. We also have a special loopback client id.
# TODO(tkchin): Generate room/client IDs in a unique way while handling
# loopback scenario correctly.

class Room:
  def __init__(self):
    self.clients = {}
    self.clientSessions = ClientSessions()

  def add_client(self, client_id, client):
    return self.clientSessions.add_client(client_id, client)

  def add_initiator(self, client_id, other_client_id):
    session_id = str(uuid.uuid4())
    self.clientSessions.add_initiator(client_id, session_id)
    return ClientSessionSerializer(session_id, other_client_id, {}, True, False)

  def add_receiver(self, session_id, client_id, other_client_id, messages, is_forward):
    return self.clientSessions.add_receiver(session_id, client_id, other_client_id, messages, is_forward)
  
  def remove_session_client(self, session_id, client_id):
    session = self.clientSessions.get_session(session_id)
    session.remove_client(client_id)
    if (session.is_empty()):
      self.clientSessions.remove_session(session_id)

  def get_occupancy(self):
    return len(self.clients)

  def get_sessions_count(self):
    return self.clientSessions.get_sessions_count()

  def get_pending_sessions(self):
    return self.clientSessions.get_pending_sessions()

  def serialize_pending_sessions(self):
    return self.clientSessions.serialize_pending_sessions()

  def get_full_sessions_count(self):
    return self.clientSessions.get_full_sessions_count()

  def get_pending_sessions_count(self):
    return self.clientSessions.get_pending_sessions_count()

  def add_session(self, session_id, session):
    self.clientSessions.add_session(session_id, session)

  def get_session(self, session_id):
    return self.clientSessions.get_session(session_id)

  def get_session_by_client_id(self, client_id):
    return self.clientSessions.get_session_by_client_id(client_id)
  
  def get_sessions(self):
    return self.clientSessions.get_sessions()
  
  def get_sessions_by_client_id(self, client_id):
    return self.clientSessions.get_sessions_by_client_id(client_id)
  
  def has_client(self, client_id):
    return self.clientSessions.has_client(client_id)

  def get_client(self, client_id):
    return self.clientSessions.get_client(client_id)

  def get_session_client(self, session_id, client_id):
    session = self.clientSessions.get_session(session_id)
    return session.get_client(client_id)

  def get_other_client(self, client_id):
    return self.clientSessions.get_other_client(client_id)

  def get_clients(self):
    return self.clientSessions.get_clients()
  
  def get_pending_client(self):
    return self.clientSessions.get_pending_client()
  
  def get_distinct_clients(self):
    return self.clientSessions.get_distinct_clients()
  
  def clear_sessions(self):
    self.clientSessions.clear_sessions()

  def clear_duplicate_sessions(self):
    self.clientSessions.clear_duplicate_sessions()

  def __str__(self):
    return self.clientSessions.get_state()