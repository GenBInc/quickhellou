from django.http import HttpRequest
from django.utils import timezone, translation
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser
from django.conf import settings

from common.requests import add_to_session, get_from_session


class UserLanguageMiddleware(MiddlewareMixin):
    """ User language middleware. """

    def process_view(self, request: HttpRequest, callback, callback_args, callback_kwargs):
        if hasattr(request, 'user'):
            is_anonymous = isinstance(request.user, AnonymousUser)
            if is_anonymous:
                language = get_from_session(request, 'language')
                if language:
                    translation.activate(language)
                if not language:
                    translation.activate(settings.LANGUAGE_CODE)
            if not is_anonymous:
                if not request.user.is_authenticated:
                    return
                # user_language = request.user.language
                # if user_language:
                #     translation.activate(user_language)
        if not hasattr(request, 'user'):
            language = get_from_session(request, 'language')
            if language:
                translation.activate(language)
            else:
                language = translation.get_language()
                add_to_session(request, 'language', language)
                translation.activate(language)


class TimezoneMiddleware(MiddlewareMixin):
    """Timezone middleware

    Args:
        MiddlewareMixin (MiddlewareMixin): the middleware mixin
    """

    def process_view(self, request: HttpRequest, callback, callback_args, callback_kwargs):
        if hasattr(request, 'user'):
            is_anonymous: bool = isinstance(request.user, AnonymousUser)
            if is_anonymous:
                timezone.deactivate()
            if not is_anonymous:
                if not request.user.is_authenticated:
                    return
                timezone.activate(request.user.tzinfo)

        if not hasattr(request, 'user'):
            timezone.deactivate()
