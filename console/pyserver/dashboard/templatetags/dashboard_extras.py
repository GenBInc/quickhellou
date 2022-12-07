from django import template
from django.utils.safestring import mark_safe
from django.template.defaultfilters import stringfilter

from django.forms import Form
from dashboard.util.time import (
    get_from_hour,
    get_from_minutes,
    get_from_time_abbreviation,
    get_to_hour,
    get_to_minutes,
    get_to_time_abbreviation,
)

register = template.Library()


@register.simple_tag
def tag_day_id(
    day_code: str,
    time_code: str,
):
    day_code: str = 'day{}_{}'.format(day_code, time_code)
    return mark_safe(day_code)


@register.filter
def get_field(
    form: Form,
    field_name: str
):
    return form.fields[field_name].get_bound_field(form, field_name)


@register.filter
def get_field_value(
    form: Form,
    field_name: str
):
    return form.fields[field_name].value()


@register.filter
@stringfilter
def get_start_hour(
    date_range_str: str,
) -> str:
    """Gets the start hour from the day time range. 

    Args:
        date_range_str (str): the day range

    Returns:
        str: the start hour
    """
    return get_from_hour(date_range_str)


@register.filter
@stringfilter
def get_end_hour(
    date_range_str: str,
) -> str:
    """Gets the end hour from the day time range. 

    Args:
        date_range_str (str): the day range

    Returns:
        str: the end hour
    """
    return get_to_hour(date_range_str)


@register.filter
@stringfilter
def get_start_minutes(
    date_range_str: str,
) -> str:
    """Gets the start minutes from the day time range. 

    Args:
        date_range_str (str): the day range

    Returns:
        str: the start minutes
    """
    return get_from_minutes(date_range_str)


@register.filter
@stringfilter
def get_end_minutes(
    date_range_str: str,
) -> str:
    """Gets the end minutes from the day time range. 

    Args:
        date_range_str (str): the day range

    Returns:
        str: the end minutes
    """
    return get_to_minutes(date_range_str)


@register.filter
@stringfilter
def get_start_abbreviation(
    date_range_str: str,
) -> str:
    """Gets the start time abbreviation from the day time range. 

    Args:
        date_range_str (str): the day range

    Returns:
        str: the start time abbreviation
    """
    return get_from_time_abbreviation(date_range_str)


@register.filter
@stringfilter
def get_end_abbreviation(
    date_range_str: str,
) -> str:
    """Gets the end time abbreviation from the day time range. 

    Args:
        date_range_str (str): the day range

    Returns:
        str: the end time abbreviation
    """
    return get_to_time_abbreviation(date_range_str)
