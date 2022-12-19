import re
import uuid
import hashlib
import short_url


def generate_uuid_code():
    """ Generates uuid code. """
    return str(uuid.uuid4().hex)


def remove_special_chars(
    s: str
) -> str:
    """
    Removes special characters from string.

    Args:
        s (str): string to filter

    Returns:
        str: string w/o special characters
    """
    return re.sub("[^A-Za-z0-9]", "", s)


def hash_string(s: str) -> str:
    """Hash string with SHA256 algorithm.

    Args:
        s (str): the string

    Returns:
        str: the hashed string
    """
    return hashlib.sha256(
        s.encode()).hexdigest()


def encode_short_url(value: int) -> str:
    """Encodes short URL.

    Args:
        value (str): the value

    Returns:
        str: encoded short URL
    """
    return short_url.encode_url(value)