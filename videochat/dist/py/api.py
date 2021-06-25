import webapp2

_endpoints = {
  'GET' : {},
  'POST' : {},
  'PUT' : {},
  'DELETE' : {},
}

class _api_method(object):

  method = None

  def __init__(self, path):
    self.path = path

  def __call__(self, fnc):

    def inner(*args, **kwargs):
      data = fnc(*args, **kwargs)
      response = args[0].response
      response.status = 200
      response.headers['Content-Type'] = 'application/json'
      return response.write(json.dumps(data))

    _endpoints[self.method][self.path] = inner
    return inner

class api(object):

  class get(_api_method):
    method = 'GET'

  class post(_api_method):
    method = 'POST'

  class put(_api_method):
    method = 'PUT'

  class delete(_api_method):
    method = 'DELETE'

class ApiRequestHandler(webapp2.RequestHandler):

  def dispatch(self):
    
    method = self.request.method
    path = self.request.path

    if not path in _endpoints[method]:
      return self.response.set_status(404)

    api_method = _endpoints[method][path]

    return api_method(self)

@api.post('/s/initiate')
def post_initiate(cls):
  app_id = cls.request.POST["appid"]
  client_id = cls.request.POST["clientid"]
  return add_client_to_client_list(cls.request, app_id, client_id, False)

@api.post('/s/other-clients')
def post_client_list(cls):
  app_id = cls.request.POST["appid"]
  key = get_memcache_key_for_client_list(app_id)
  memcache_client = memcache.Client()
  clientList = memcache_client.gets(key)
  return ["%s" % k for k in clientList.get_other_clients()]