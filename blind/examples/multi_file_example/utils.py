"""
Utility functions for the calculator example.
Includes validation and formatting helpers.
"""


def validate_number(value):
    """
    Validate that a value is a number.
    Raises TypeError if not a number.
    """
    if not isinstance(value, (int, float)):
        raise TypeError(f"Expected number, got {type(value).__name__}")
    return True


def format_result(operation, result):
    """Format an operation result for display"""
    return f"{operation} = {result}"


def is_even(number):
    """Check if a number is even"""
    validate_number(number)
    return number % 2 == 0


def is_positive(number):
    """Check if a number is positive"""
    validate_number(number)
    return number > 0