from django.utils import translation
from django.conf import settings

from common.requests import add_to_session


def set_language(request, language=None):
    """ Sets language. """
    if not language:
        language = request.POST.get('language', settings.LANGUAGE_CODE)
    add_to_session(request, 'language', language)
    translation.activate(language)


def get_language():
    """ Returns language. """
    return translation.get_language()


def session_language(request, user=None):
    """ Sets language when it's available in session or user is set. """
    if user is not None:
        language = user.language
    if user is None:
        language = translation.get_language()
    if language:
        set_language(request, language)
