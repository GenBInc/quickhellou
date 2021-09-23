from rest_framework.views import APIView
from rest_framework.response import Response

class PostInitiateView(APIView):
  def get(self, request, format=None):
    app_id = request.POST["appid"]
    client_id = request.POST["clientid"]
    return add_client_to_client_list(request, app_id, client_id, False)
  @classmethod
  def get_extra_actions(cls):
    return []

class PostClientList(APIView):
  def post(self, request, format=None):
    app_id = request.POST["appid"]
    key = get_redis_key_for_client_list(app_id)
    memcache_client = redis.Client()
    clientList = redis_client.gets(key)
    return ["%s" % k for k in clientList.get_other_clients()]
  @classmethod
  def get_extra_actions(cls):
    return []