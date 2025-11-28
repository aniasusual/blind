"""
Sample Python script to demonstrate Blind execution flow tracer
"""


def fibonacci(n):
    """Calculate fibonacci number recursively"""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)


def process_numbers(numbers):
    """Process a list of numbers"""
    results = []

    for num in numbers:
        if num < 0:
            print(f"Negative number: {num}")
        elif num == 0:
            print("Zero found")
        else:
            result = num * 2
            results.append(result)

    return results


class Calculator:
    """Simple calculator class"""

    def __init__(self, name):
        self.name = name
        self.history = []

    def add(self, a, b):
        result = a + b
        self.history.append(f"add({a}, {b}) = {result}")
        return result

    def multiply(self, a, b):
        result = a * b
        self.history.append(f"multiply({a}, {b}) = {result}")
        return result

    def show_history(self):
        print(f"\n{self.name} History:")
        for entry in self.history:
            print(f"  - {entry}")


def main():
    """Main function to demonstrate various Python features"""
    print("=== Blind Execution Flow Tracer Demo ===\n")

    # Test fibonacci
    print("Computing Fibonacci(5)...")
    fib_result = fibonacci(5)
    print(f"Result: {fib_result}\n")

    # Test list processing
    print("Processing numbers...")
    numbers = [1, 2, -5, 0, 10, 3]
    processed = process_numbers(numbers)
    print(f"Processed: {processed}\n")

    # Test class
    print("Using Calculator class...")
    calc = Calculator("MyCalc")
    calc.add(10, 5)
    calc.multiply(3, 4)
    calc.add(100, 200)
    calc.show_history()

    # Test list comprehension
    print("\nList comprehension...")
    squares = [x ** 2 for x in range(5)]
    print(f"Squares: {squares}")

    # Test exception handling
    print("\nTesting exception handling...")
    try:
        result = 10 / 0
    except ZeroDivisionError as e:
        print(f"Caught exception: {e}")

    print("\n=== Demo Complete ===")


if __name__ == '__main__':
    main()
