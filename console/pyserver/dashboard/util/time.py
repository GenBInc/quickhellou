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
)
from accounts.models import (
    User,
)

TIME_FORMAT = '%I:%M %p'
DAY_TIME_FORMAT = '%d %I:%M %p'
DEFAULT_FROM_HOUR = '09'
DEFAULT_TO_HOUR = '05'
DEFAULT_MINUTES = '00'
DEFAULT_FROM_ABBREVIATION = 'AM'
DEFAULT_TO_ABBREVIATION = 'PM'

DAYS = ['1', '2', '3', '4', '5', '6', '0']
HOURS: list[str] = ['01', '02', '03', '04', '05',
                    '06', '07', '08', '09', '10', '11', '12', ]
MINUTES: list[str] = ['00', '30', ]

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


def get_day_group(
    self,
    day_code: int
):
    time_field_key_regex: Pattern = compile('^day\d\_\d$')
    return filter(lambda x: 'day{}'.format(day_code) in x and time_field_key_regex.match(x), self.fields.keys())


def collect_weekly_hours(
    user: User,
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
            # s[field_name] = datetime_range

    weekly_hours: dict[str, list[str]] = {}
    for day_code in time_ranges:
        datetime_ranges: list[str] = time_ranges[day_code]
        daily_hours: list[str] = []
        for index, datetime_range in enumerate(datetime_ranges):
            print(index, datetime_range)
            search_result: Match[str] = search(RANGE_PATTERN, datetime_range)
            day: str = search_result.group(1)
            datetime_from_str: str = search_result.group(2)
            datetime_to_str: str = search_result.group(6)
            datetime_from: datetime = datetime.strptime(
                datetime_from_str, TIME_FORMAT)
            datetime_to: datetime = datetime.strptime(
                datetime_to_str, TIME_FORMAT)
            delta = datetime_to - datetime_from
            hours = int(delta.seconds / 60 / 60 * 2)
            for i in range(hours):
                working_hour: datetime = datetime_from + \
                    timedelta(hours=i * .5)
                daily_hours.append(working_hour.strftime(TIME_FORMAT))
        daily_hours = sorted(
            list(set(daily_hours)), key=lambda x: datetime.strptime(x, TIME_FORMAT))
        weekly_hours[day_code] = daily_hours

    return weekly_hours


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
