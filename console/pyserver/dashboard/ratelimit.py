from django.http import HttpRequest, HttpResponse


def ratelimited_response(
    request: HttpRequest,
    exception: Exception = None
) -> HttpResponse:
    """Returns a 429 Too Many Requests response when rate limit is exceeded.

    Args:
        request (HttpRequest): the HTTP request
        exception (Exception): the rate limit exception

    Returns:
        HttpResponse: 429 response
    """
    return HttpResponse(
        'Too many requests. Please try again later.',
        status=429,
        content_type='text/plain'
    )
