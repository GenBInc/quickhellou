from requests import get

from django.http import (
    JsonResponse,
    HttpRequest,
)


def remove_from_session(
    request: HttpRequest,
    key: str
):
    """ Removes object from session. """
    add_to_session(request, key, None)


def add_to_session(
    request: HttpRequest,
    key: str,
    value
):
    """ Adds object to session. """
    request.session[key] = value


def get_from_session(
    request: HttpRequest,
    key: str
):
    """ Gets object from session by key. """
    if key in request.session:
        return request.session[key]
    return None


def get_ip_address():
    """ Returns external IP address. """
    return get('https://api.ipify.org').content.decode('utf8')


class JsonSuccessResponse(JsonResponse):
    """
    JSON success response object
    """

    def __init__(self, message: str = ''):
        return_data: dict = {'result': 'success'}
        if message:
            return_data['message'] = message
        super().__init__(return_data)


class JsonErrorResponse(JsonResponse):
    """
    JSON error response object
    """

    def __init__(self, error: str = ''):
        return_data: dict = {'result': 'error'}
        if error:
            return_data['message'] = error
        super().__init__(return_data)
