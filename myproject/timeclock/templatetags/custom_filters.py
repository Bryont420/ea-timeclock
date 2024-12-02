from django import template

register = template.Library()

@register.filter(name='contains_substring')
def contains_substring(notes, substring):
    """
    This filter checks if any note in the list contains the specified substring.
    """
    return any(substring.lower() in note.lower() for note in notes)
