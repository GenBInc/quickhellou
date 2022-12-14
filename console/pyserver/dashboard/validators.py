from re import (
    compile,
    search,
    Pattern,
    Match,
)
from datetime import datetime

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from dashboard.util.time import RANGE_PATTERN


def validate_time_range(date_time: str):
    """Validates time range.

    Args:
        date_time (str): the date time

    Raises:
        ValidationError: the validation error
    """
    result: Match[str] = search(RANGE_PATTERN, date_time)
    day: str = result.group(1)

    datetime_from_str: str = '{} {}'.format(day, result.group(2))
    datetime_to_str: str = '{} {}'.format(day, result.group(6))

    datetime_format: str = '%w %I:%M %p'
    datetime_from: datetime = datetime.strptime(
        datetime_from_str, datetime_format)
    datetime_to: datetime = datetime.strptime(
        datetime_to_str, datetime_format)

    if datetime_from == datetime_to:
        raise ValidationError(
            _('Both the start and end dates are equal.'),
            code='invalid_time_range'
        )
    if datetime_from > datetime_to:
        raise ValidationError(
            _('The end date is earlier than the start date.'),
            code='invalid_time_range'
        )
