"""
WSGI config for qhv2 project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.2/howto/deployment/wsgi/
"""

import os
# Logging WSGI middleware.

import pprint

class LoggingMiddleware:

    def __init__(self, application):
        self.__application = application

    def __call__(self, environ, start_response):
        errors = environ['wsgi.errors']
        def _start_response(status, headers, *args):
            pprint.pprint(('<=== RESPONSE', status), stream=errors)
            return start_response(status, headers, *args)
        return self.__application(environ, _start_response)

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('SERVER_GATEWAY_INTERFACE', 'Web')

os.environ["DJANGO_SETTINGS_MODULE"] = "qhv2.settings"

application = LoggingMiddleware(get_wsgi_application())
