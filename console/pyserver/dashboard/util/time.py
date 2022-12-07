from re import (
    search,
    compile,
    Match,
    Pattern,
)
from datetime import (
    timedelta,
    datetime
)

TIME_FORMAT = '%d %I:%M %p'
DEFAULT_FROM_HOUR = '09'
DEFAULT_TO_HOUR = '05'
DEFAULT_MINUTES = '00'
DEFAULT_FROM_ABBREVIATION = 'AM'
DEFAULT_TO_ABBREVIATION = 'PM'
RANGE_PATTERN: Pattern = compile(
    '^(\d)\s((\d{2})\:(\d{2})\s(AM|PM))\s((\d{2})\:(\d{2})\s(AM|PM))$')
TIME_PATTERN: Pattern = compile(
    '^(\d{2}):(\d{2})\s(AM|PM)$')


def get_day(date_time: str) -> str:
    range_result: Match[str] = search(RANGE_PATTERN, date_time)
    return range_result.group(1)


def get_datetime_from(date_time: str) -> str:
    range_result: Match[str] = search(RANGE_PATTERN, date_time)
    return range_result.group(2)


def get_datetime_to(date_time: str) -> str:
    range_result: Match[str] = search(RANGE_PATTERN, date_time)
    return range_result.group(6)


def get_hour(time: str) -> str:
    time_result: Match[str] = search(TIME_PATTERN, time)
    return time_result.group(1)


def get_minutes(time: str) -> str:
    time_result: Match[str] = search(TIME_PATTERN, time)
    return time_result.group(2)


def get_time_abbreviation(time: str) -> str:
    time_result: Match[str] = search(TIME_PATTERN, time)
    return time_result.group(3)


def get_from_hour(date_time: str) -> str:
    if 'None' in date_time:
        return DEFAULT_FROM_HOUR
    datetime: str = get_datetime_from(date_time)
    return get_hour(datetime)


def get_from_minutes(date_time: str) -> str:
    if 'None' in date_time:
        return DEFAULT_MINUTES
    datetime: str = get_datetime_from(date_time)
    return get_minutes(datetime)


def get_from_time_abbreviation(date_time: str) -> str:
    if 'None' in date_time:
        return DEFAULT_FROM_ABBREVIATION
    datetime: str = get_datetime_from(date_time)
    return get_time_abbreviation(datetime)


def get_to_hour(date_time: str) -> str:
    if 'None' in date_time:
        return DEFAULT_TO_HOUR
    datetime: str = get_datetime_to(date_time)
    return get_hour(datetime)


def get_to_minutes(date_time: str) -> str:
    if 'None' in date_time:
        return DEFAULT_MINUTES
    datetime: str = get_datetime_to(date_time)
    return get_minutes(datetime)


def get_to_time_abbreviation(date_time: str) -> str:
    if 'None' in date_time:
        return DEFAULT_TO_ABBREVIATION
    datetime: str = get_datetime_to(date_time)
    return get_time_abbreviation(datetime)
