"""
Calculator module with basic arithmetic operations.
Each operation validates inputs before computing.
"""

from utils import validate_number


def add(a, b):
    """Add two numbers together"""
    validate_number(a)
    validate_number(b)
    return a + b


def subtract(a, b):
    """Subtract b from a"""
    validate_number(a)
    validate_number(b)
    return a - b


def multiply(a, b):
    """Multiply two numbers"""
    validate_number(a)
    validate_number(b)
    return a * b


def divide(a, b):
    """Divide a by b (with zero check)"""
    validate_number(a)
    validate_number(b)

    if b == 0:
        raise ValueError("Cannot divide by zero")

    return a / b