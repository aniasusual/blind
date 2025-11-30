"""
Main entry point for the multi-file calculator example.
This demonstrates how Blind tracks execution flow across multiple files.
"""

from calculator import add, subtract, multiply
from utils import format_result


def main():
    """Run calculator operations and display results"""
    print("Running calculator example...")
    print()

    # Addition
    result = add(5, 3)
    print(format_result("5 + 3", result))

    # Subtraction
    result = subtract(10, 4)
    print(format_result("10 - 4", result))

    # Multiplication
    result = multiply(6, 7)
    print(format_result("6 * 7", result))

    print()
    print("Example complete!")


if __name__ == "__main__":
    main()