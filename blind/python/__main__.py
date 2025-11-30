"""
Entry point for running Python scripts with Blind tracer
Usage: python -m blind.python your_script.py
"""

import sys
import os
import runpy
from .tracer import start_tracing, stop_tracing


def main():
    if len(sys.argv) < 2:
        print("Usage: python -m blind.python <script.py> [args...]")
        print("\nOptions:")
        print("  --host HOST    Trace server host (default: localhost)")
        print("  --port PORT    Trace server port (default: 9876)")
        sys.exit(1)

    # Parse arguments - defaults from environment variables or fallback values
    host = os.getenv('BLIND_TRACER_HOST', 'localhost')
    port = int(os.getenv('BLIND_TRACER_PORT', '9876'))
    script_args = []
    script_path = None

    i = 1
    while i < len(sys.argv):
        arg = sys.argv[i]

        if arg == '--host' and i + 1 < len(sys.argv):
            host = sys.argv[i + 1]
            i += 2
        elif arg == '--port' and i + 1 < len(sys.argv):
            port = int(sys.argv[i + 1])
            i += 2
        elif script_path is None:
            script_path = arg
            i += 1
        else:
            script_args.append(arg)
            i += 1

    if not script_path:
        print("Error: No script file specified")
        sys.exit(1)

    if not os.path.exists(script_path):
        print(f"Error: Script file '{script_path}' not found")
        sys.exit(1)

    # Update sys.argv for the script
    sys.argv = [script_path] + script_args

    # Detect project root (directory containing the script)
    project_root = os.path.dirname(os.path.abspath(script_path))

    print(f"[Blind Tracer] Starting tracer...")
    print(f"[Blind Tracer] Project root: {project_root}")
    print(f"[Blind Tracer] Connecting to {host}:{port}")
    print(f"[Blind Tracer] Running: {script_path}")
    print("-" * 60)

    # Start tracing with project root
    tracer = start_tracing(host, port, project_root)

    try:
        # Run the script
        script_globals = {
            '__name__': '__main__',
            '__file__': script_path,
        }

        with open(script_path, 'r') as f:
            code = compile(f.read(), script_path, 'exec')
            exec(code, script_globals)

    except KeyboardInterrupt:
        print("\n[Blind Tracer] Interrupted by user")
    except Exception as e:
        print(f"\n[Blind Tracer] Script error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Stop tracing and show stats
        print("\n" + "-" * 60)
        stats = stop_tracing()
        if stats:
            print(f"[Blind Tracer] Captured {stats['total_events']} events")
            print(f"[Blind Tracer] Traced {stats['total_functions']} functions")


if __name__ == '__main__':
    main()
