from zoneinfo import ZoneInfo
from re import (
    search,
    compile,
    Match,
    Pattern,
)
from datetime import (
    datetime,
    timedelta,
)
from dashboard.models import (
    UserWorkingHours,
    Communication,
)
from accounts.models import (
    User,
)
from django.utils.timezone import make_aware
from django.utils import timezone

TIMEZONE_UTC = ZoneInfo('UTC')

TIME_FORMAT: str = '%I:%M %p'
DAY_TIME_FORMAT: str = '%d %I:%M %p'
DATETIME_FORMAT: str = '%Y-%m-%d %I:%M %p'
DEFAULT_FROM_HOUR: str = '09'
DEFAULT_TO_HOUR: str = '05'
DEFAULT_MINUTES: str = '00'
DEFAULT_FROM_ABBREVIATION: str = 'AM'
DEFAULT_TO_ABBREVIATION: str = 'PM'

DAYS: list[str] = ['1', '2', '3', '4', '5', '6', '0']
HOURS: list[str] = ['01', '02', '03', '04', '05',
                    '06', '07', '08', '09', '10', '11', '12', ]
MINUTES: list[str] = ['00', '15', '30', '45', ]

RANGE_PATTERN: Pattern = compile(
    '^(\d)\s((\d{2})\:(\d{2})\s(AM|PM))\s((\d{2})\:(\d{2})\s(AM|PM))$')
TIME_PATTERN: Pattern = compile(
    '^(\d{2}):(\d{2})\s(AM|PM)$')
DAY_PATTERN: Pattern = compile(
    '^()(\d{2}):(\d{2})\s(AM|PM)$')
TIME_INTERVAL_VARIABLES: dict[str, list[float]] = {
    '15': [4, .25],
    '30': [2, .5],
    '45': [1.5, .75],
    '60': [1, 1],
}


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


def get_day_group(
    self,
    day_code: int
):
    time_field_key_regex: Pattern = compile('^day\d\_\d$')
    return filter(lambda x: 'day{}'.format(day_code) in x and time_field_key_regex.match(x), self.fields.keys())


def get_minutes(interval: int) -> list[str]:
    """Gets minutes list according to declared interval.

    Args:
        interval (int): the interval in minutes

    Returns:
        list[str]: the list of available minutes
    """
    pass


def collect_weekly_hours(
    user: User
):
    """Collects and serializie weekly working hours.

    Args:
        user (User): the user

    Returns:
        _type_: the serialized working hours
    """
    # Get user related saved working hours
    working_hours_entries: list[UserWorkingHours] = UserWorkingHours.objects.filter(
        user=user).all()

    # Collect time range values per day
    time_ranges: dict[str, list[str]] = collect_time_ranges(
        working_hours_entries)

    day_fields: dict[str, list[str]] = {}
    for day_code in time_ranges:
        datetime_ranges: list[str] = time_ranges[day_code]
        for index, datetime_range in enumerate(datetime_ranges):
            field_name: str = 'day{}_{}'.format(day_code, index+1)
            if not day_fields.get(field_name):
                day_fields[field_name] = []
            day_fields[field_name].append(datetime_range)

    weekly_hours: dict[str, list[str]] = {}
    for day_code in time_ranges:
        datetime_ranges: list[str] = time_ranges[day_code]
        daily_hours: list[datetime] = []
        for index, datetime_range in enumerate(datetime_ranges):
            search_result: Match[str] = search(RANGE_PATTERN, datetime_range)
            datetime_from_str: str = search_result.group(2)
            datetime_to_str: str = search_result.group(6)
            datetime_from: datetime = datetime.strptime(
                datetime_from_str, TIME_FORMAT)
            datetime_to: datetime = datetime.strptime(
                datetime_to_str, TIME_FORMAT)
            delta = datetime_to - datetime_from
            hours = int(delta.seconds / 60 / 60 *
                        TIME_INTERVAL_VARIABLES[user.time_interval][0])
            for i in range(hours):
                working_hour: datetime = datetime_from + \
                    timedelta(
                        hours=i * TIME_INTERVAL_VARIABLES[user.time_interval][1])
                daily_hours.append(working_hour)
        daily_hours = sorted(
            list(set(daily_hours)), key=lambda x: x)
        weekly_hours[day_code] = daily_hours

    return weekly_hours


def filter_upcoming_hours(
    user: User,
    day_date: datetime,
    all_working_hours: list
) -> list:
    """Filter upcoming hours.

    Args:
        user (User): the user
        day_date (datetime): the current date
        all_working_hours (list): all working hours 

    Returns:
        list: the hours list
    """
    if not all_working_hours:
        return []

    now: datetime = datetime.now(user.tzinfo)

    if not day_date.date().__eq__(now.date()):
        return list(map(lambda working_hour: datetime(
            day_date.year,
            day_date.month,
            day_date.day,
            working_hour.hour,
            working_hour.minute,
            0,
            0,
            user.tzinfo
        ), all_working_hours))

    upcoming_dates: list = []
    for working_time in all_working_hours:
        working_time_aware: datetime = make_aware(
            working_time, user.tzinfo)
        today_working_time: datetime = now.replace(hour=working_time_aware.hour,
                                                   minute=working_time_aware.minute)
        if now < today_working_time:
            upcoming_dates.append(today_working_time)
    return upcoming_dates


def filter_available_hours(
    user: User,
    day: datetime,
    appointments: list[Communication],
    upcoming_working_hours: list
) -> list:
    """Filters available hours.

    Args:
        user (User): the user
        day (datetime): the current day
        appointments (list[Communication]): the appointments list
        upcoming_working_hours (list): working hours

    Returns:
        list: the hours list
    """

    # Collect appointment from current date
    appointments = list(filter(lambda appointment: (
        appointment.datetime.date().__eq__(day)), appointments))

    # If there are no busy appointments for current date, return the upcoming dates list
    if not appointments.__len__():
        return upcoming_working_hours

    now: datetime = datetime.now(user.tzinfo)

    # Create busy, user timezone aware dates list
    busy_terms: list = []
    for appointment in appointments:
        busy_terms.append(appointment.datetime.replace(tzinfo=user.tzinfo))

    available_dates: list = []
    for working_time in upcoming_working_hours:
        # Create the today's date out of hour an minute taken from working time and current date
        today_working_time: datetime = now.replace(year=day.year, month=day.month, day=day.day, hour=working_time.hour,
                                                   minute=working_time.minute, second=0, microsecond=0)
        # Check if working hour is busy
        is_available = list(filter(lambda busy_term: (
            busy_term.__eq__(today_working_time)), busy_terms)).__len__()

        # If hour is available, add it to the list
        if not is_available:
            available_dates.append(today_working_time)

    return available_dates


def set_timezone(timezone_key: str):
    """Activates timezone by key.

    Args:
        timezone_key (str): the timezone key
    """
    if timezone_key:
        zone_info: ZoneInfo = ZoneInfo(timezone_key)
        timezone.activate(zone_info)


def time_left_delta(datetime_to: datetime) -> timedelta:
    """Returns time left to given datetime as time diff.

    Args:
        datetime_to (datetime): end date time 

    Returns:
        str: the time delta
    """
    datetime_from: datetime = make_aware(datetime.now())
    return datetime_to - datetime_from


def one_day_left_delta(datetime_to: datetime) -> bool:
    """Checks if one day left to date.

    Args:
        datetime_to (datetime): the end date

    Returns:
        bool: True if one day left
    """
    delta: timedelta = time_left_delta(datetime_to)
    return delta.days == 1 and delta.seconds < (60 * 60 * 1.5)


def one_hour_left_delta(datetime_to: datetime) -> bool:
    """Checks if one hour left to date.

    Args:
        datetime_to (datetime): the end date

    Returns:
        bool: True if one hour left
    """
    delta: timedelta = time_left_delta(datetime_to)
    return delta.days == 0 and delta.seconds in range(60 * 60, (60 * 60 * 1.5) - 1)


def time_left_verbose(datetime_to: datetime) -> str:
    """Returns time left to given datetime.

    Args:
        datetime_to (datetime): end date time 

    Returns:
        str: the time diff verbose
    """
    return time_left_delta(datetime_to).__str__().split('.')[0]


def collect_time_ranges(
    working_hour_entries: list[UserWorkingHours]
) -> dict[str, list[str]]:
    """Collects time range values per day

    Args:
        working_hour_entries (list[UserWorkingHours]): the working hours entries

    Returns:
        dict[str, list[str]]: the time ranges
    """
    time_ranges: dict[str, list[str]] = {}
    for working_hours in working_hour_entries:
        time_result: Match[str] = search(RANGE_PATTERN, working_hours.time)
        day: str = time_result.group(1)

        if not time_ranges.get(day):
            time_ranges[day] = []
        time_ranges[day].append(working_hours.time)
    return time_ranges


def format_day_with_ordinal(date: datetime) -> str:
    """Formats date with ordinal suffix.

    Args:
        date (datetime): the date

    Returns:
        str: the formatted day
    """
    return '{}{}'.format(date.day, {'1': 'st', '2': 'nd', '3': 'rd'}.get(str(date.day)[-1:], 'th'))
