import sys
import os
import time
import json
import socket
import threading
import ast
import inspect
from typing import Any, Dict, List, Optional, Set
from dataclasses import dataclass, asdict
from enum import Enum


class EntityType(Enum):
    """Types of Python entities we track"""
    FUNCTION_CALL = "function_call"
    FUNCTION_RETURN = "function_return"
    METHOD_CALL = "method_call"
    METHOD_RETURN = "method_return"
    CLASS_INIT = "class_init"
    LINE_EXECUTION = "line_execution"
    LOOP_START = "loop_start"
    LOOP_ITERATION = "loop_iteration"
    LOOP_END = "loop_end"
    CONDITIONAL_IF = "conditional_if"
    CONDITIONAL_ELIF = "conditional_elif"
    CONDITIONAL_ELSE = "conditional_else"
    EXCEPTION_RAISED = "exception_raised"
    EXCEPTION_CAUGHT = "exception_caught"
    VARIABLE_ASSIGNMENT = "variable_assignment"
    RETURN_VALUE = "return_value"
    IMPORT_MODULE = "import_module"
    COMPREHENSION = "comprehension"
    LAMBDA = "lambda"
    DECORATOR = "decorator"


@dataclass
class TraceEvent:
    """Complete trace event with all metadata"""
    event_type: str  # EntityType value
    timestamp: float
    event_id: int

    # Location information
    file_path: str
    line_number: int
    function_name: str
    class_name: Optional[str]
    module_name: str

    # Code context
    line_content: str

    # Execution context
    call_stack_depth: int
    parent_event_id: Optional[int]
    scope_id: str

    # Entity-specific data
    entity_data: Dict[str, Any]

    # Performance metrics
    execution_time: Optional[float] = None
    memory_delta: Optional[int] = None

    # Relationships
    calls_to: Optional[List[int]] = None
    called_from: Optional[int] = None


class ExecutionTracer:
    """Project-wide Python execution tracer with file-level organization"""

    def __init__(self, host='localhost', port=9876, project_root=None):
        self.host = host
        self.port = port
        self.socket = None
        self.event_counter = 0
        self.active = False
        self.project_root = project_root or os.getcwd()

        # Project-wide tracking
        self.project_files: Dict[str, Dict] = {}  # filepath -> {code, lines, metadata}
        self.file_execution_order: List[str] = []  # Order of files accessed
        self.file_events: Dict[str, List[TraceEvent]] = {}  # filepath -> events
        self.cross_file_calls: List[Dict] = []  # Track calls between files

        # Tracking state
        self.call_stack: List[Dict] = []
        self.scope_stack: List[str] = []
        self.event_history: List[TraceEvent] = []
        self.loop_stack: List[Dict] = []
        self.variables_cache: Dict[str, Dict] = {}
        self.current_file: Optional[str] = None

        # Performance tracking
        self.function_timings: Dict[str, List[float]] = {}
        self.last_event_time = time.time()

        # Filters
        self.exclude_files: Set[str] = {
            '<string>',
            '<stdin>',
            __file__
        }
        self.exclude_modules: Set[str] = {
            'importlib',
            '_frozen_importlib',
            '_frozen_importlib_external',
            'threading',
            'socket',
            'socketserver'
        }

    def connect(self):
        """Connect to VS Code extension"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.host, self.port))
            self.active = True
            print(f"[Blind Tracer] Connected to VS Code at {self.host}:{self.port}")
        except Exception as e:
            print(f"[Blind Tracer] Failed to connect: {e}")
            self.active = False

    def send_event(self, event: TraceEvent):
        """Send trace event to VS Code"""
        if not self.active or not self.socket:
            return

        try:
            event_json = json.dumps(asdict(event))
            message = event_json + '\n'
            self.socket.sendall(message.encode('utf-8'))
        except Exception as e:
            print(f"[Blind Tracer] Error sending event: {e}")
            self.active = False

    def should_trace_file(self, filename: str) -> bool:
        """Check if file should be traced"""
        if not filename or filename in self.exclude_files:
            return False

        # Exclude frozen modules (internal Python modules)
        if filename.startswith('<frozen') or filename.startswith('<'):
            return False

        # Exclude standard library and site-packages
        if '/lib/python' in filename or '/site-packages/' in filename:
            return False

        return True

    def should_trace_frame(self, frame) -> bool:
        """Check if frame should be traced"""
        filename = frame.f_code.co_filename
        module_name = frame.f_globals.get('__name__', '')

        if module_name in self.exclude_modules:
            return False

        return self.should_trace_file(filename)

    def get_line_content(self, filename: str, line_number: int) -> str:
        """Get the content of a specific line"""
        try:
            with open(filename, 'r') as f:
                lines = f.readlines()
                if 0 <= line_number - 1 < len(lines):
                    return lines[line_number - 1].strip()
        except:
            pass
        return ""

    def analyze_line_ast(self, line_content: str) -> Dict[str, Any]:
        """Analyze line using AST to detect entity type"""
        try:
            tree = ast.parse(line_content)

            for node in ast.walk(tree):
                if isinstance(node, ast.For) or isinstance(node, ast.While):
                    return {'type': 'loop', 'loop_type': type(node).__name__}
                elif isinstance(node, ast.If):
                    return {'type': 'conditional', 'has_elif': False, 'has_else': False}
                elif isinstance(node, ast.Try):
                    return {'type': 'try_except'}
                elif isinstance(node, ast.With):
                    return {'type': 'context_manager'}
                elif isinstance(node, ast.ListComp) or isinstance(node, ast.DictComp):
                    return {'type': 'comprehension', 'comp_type': type(node).__name__}
                elif isinstance(node, ast.Lambda):
                    return {'type': 'lambda'}
                elif isinstance(node, ast.Assign):
                    targets = [t.id if isinstance(t, ast.Name) else str(t) for t in node.targets]
                    return {'type': 'assignment', 'variables': targets}
                elif isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom):
                    return {'type': 'import'}

        except:
            pass

        return {'type': 'simple_statement'}

    def get_local_variables(self, frame) -> Dict[str, str]:
        """Get local variables and their values"""
        variables = {}
        try:
            for name, value in frame.f_locals.items():
                if not name.startswith('__'):
                    try:
                        # Get string representation, limit length
                        val_str = repr(value)[:100]
                        variables[name] = val_str
                    except:
                        variables[name] = '<unprintable>'
        except:
            pass
        return variables

    def register_file(self, filepath: str):
        """Register a file in the project and read its complete code"""
        if filepath in self.project_files or not self.should_trace_file(filepath):
            return

        try:
            with open(filepath, 'r') as f:
                code = f.read()
                lines = code.split('\n')

            relative_path = os.path.relpath(filepath, self.project_root)

            self.project_files[filepath] = {
                'code': code,
                'lines': lines,
                'total_lines': len(lines),
                'relative_path': relative_path,
                'executed_lines': set(),
                'first_seen': time.time()
            }

            self.file_execution_order.append(filepath)
            self.file_events[filepath] = []

            # Send file registration event to VS Code
            self.send_file_metadata(filepath)

        except Exception as e:
            print(f"[Blind Tracer] Error registering file {filepath}: {e}")

    def send_file_metadata(self, filepath: str):
        """Send complete file metadata and code to VS Code"""
        if filepath not in self.project_files or not self.active or not self.socket:
            return

        file_data = self.project_files[filepath]
        metadata = {
            'type': 'file_metadata',
            'file_path': filepath,
            'relative_path': file_data['relative_path'],
            'code': file_data['code'],
            'lines': file_data['lines'],
            'total_lines': file_data['total_lines'],
            'timestamp': file_data['first_seen']
        }

        try:
            message = json.dumps(metadata) + '\n'
            self.socket.sendall(message.encode('utf-8'))
        except Exception as e:
            print(f"[Blind Tracer] Error sending file metadata: {e}")

    def track_cross_file_call(self, from_file: str, to_file: str, from_event_id: int, to_event_id: int):
        """Track when execution crosses from one file to another"""
        if from_file != to_file:
            cross_call = {
                'from_file': from_file,
                'to_file': to_file,
                'from_event_id': from_event_id,
                'to_event_id': to_event_id,
                'timestamp': time.time()
            }
            self.cross_file_calls.append(cross_call)

            # Send cross-file call event
            if self.active and self.socket:
                try:
                    message = json.dumps({
                        'type': 'cross_file_call',
                        **cross_call
                    }) + '\n'
                    self.socket.sendall(message.encode('utf-8'))
                except:
                    pass

    def mark_line_executed(self, filepath: str, line_number: int):
        """Mark a line as executed in a file"""
        if filepath in self.project_files:
            self.project_files[filepath]['executed_lines'].add(line_number)

    def create_event(
        self,
        event_type: EntityType,
        frame,
        entity_data: Dict[str, Any]
    ) -> TraceEvent:
        """Create a trace event from frame info"""
        self.event_counter += 1
        current_time = time.time()

        filename = frame.f_code.co_filename
        line_number = frame.f_lineno
        function_name = frame.f_code.co_name

        # Register file if not already registered
        self.register_file(filename)

        # Track cross-file call if file changed
        if self.current_file and self.current_file != filename and self.call_stack:
            self.track_cross_file_call(
                self.current_file,
                filename,
                self.call_stack[-1]['event_id'],
                self.event_counter
            )
        self.current_file = filename

        # Mark this line as executed
        self.mark_line_executed(filename, line_number)

        # Get class name if in a class method
        class_name = None
        if 'self' in frame.f_locals:
            class_name = frame.f_locals['self'].__class__.__name__
        elif 'cls' in frame.f_locals:
            class_name = frame.f_locals['cls'].__name__

        module_name = frame.f_globals.get('__name__', '')
        line_content = self.get_line_content(filename, line_number)

        # Generate scope ID
        scope_id = f"{module_name}::{function_name}::{len(self.call_stack)}"

        # Get parent event ID
        parent_event_id = None
        if self.call_stack:
            parent_event_id = self.call_stack[-1].get('event_id')

        event = TraceEvent(
            event_type=event_type.value,
            timestamp=current_time,
            event_id=self.event_counter,
            file_path=filename,
            line_number=line_number,
            function_name=function_name,
            class_name=class_name,
            module_name=module_name,
            line_content=line_content,
            call_stack_depth=len(self.call_stack),
            parent_event_id=parent_event_id,
            scope_id=scope_id,
            entity_data=entity_data
        )

        self.event_history.append(event)
        self.last_event_time = current_time

        # Store event in file-specific list
        if filename in self.file_events:
            self.file_events[filename].append(event)

        return event

    def trace_function(self, frame, event, arg):
        """Main trace function called by sys.settrace"""
        if not self.should_trace_frame(frame):
            return None

        try:
            if event == 'call':
                self.handle_call(frame)
            elif event == 'line':
                self.handle_line(frame)
            elif event == 'return':
                self.handle_return(frame, arg)
            elif event == 'exception':
                self.handle_exception(frame, arg)

        except Exception as e:
            print(f"[Blind Tracer] Error in trace function: {e}")

        return self.trace_function

    def handle_call(self, frame):
        """Handle function/method call"""
        function_name = frame.f_code.co_name
        class_name = None

        if 'self' in frame.f_locals:
            class_name = frame.f_locals['self'].__class__.__name__
            entity_type = EntityType.METHOD_CALL
        elif 'cls' in frame.f_locals:
            class_name = frame.f_locals['cls'].__name__
            entity_type = EntityType.METHOD_CALL
        else:
            entity_type = EntityType.FUNCTION_CALL

        # Get function arguments
        args_info = {}
        try:
            arg_names = frame.f_code.co_varnames[:frame.f_code.co_argcount]
            for name in arg_names:
                if name in frame.f_locals:
                    args_info[name] = repr(frame.f_locals[name])[:100]
        except:
            pass

        entity_data = {
            'arguments': args_info,
            'is_method': class_name is not None,
            'class_name': class_name
        }

        event = self.create_event(entity_type, frame, entity_data)

        # Track in call stack
        self.call_stack.append({
            'event_id': event.event_id,
            'function_name': function_name,
            'start_time': time.time()
        })

        self.send_event(event)

    def handle_line(self, frame):
        """Handle line execution"""
        line_content = self.get_line_content(
            frame.f_code.co_filename,
            frame.f_lineno
        )

        # Analyze line to determine entity type
        ast_info = self.analyze_line_ast(line_content)

        # Determine specific entity type
        if ast_info['type'] == 'loop':
            # Check if this is loop start or iteration
            if not self.loop_stack or self.loop_stack[-1].get('line') != frame.f_lineno:
                entity_type = EntityType.LOOP_START
                self.loop_stack.append({
                    'line': frame.f_lineno,
                    'iteration': 0
                })
            else:
                entity_type = EntityType.LOOP_ITERATION
                self.loop_stack[-1]['iteration'] += 1
        elif ast_info['type'] == 'conditional':
            entity_type = EntityType.CONDITIONAL_IF
        elif ast_info['type'] == 'assignment':
            entity_type = EntityType.VARIABLE_ASSIGNMENT
        elif ast_info['type'] == 'import':
            entity_type = EntityType.IMPORT_MODULE
        elif ast_info['type'] == 'comprehension':
            entity_type = EntityType.COMPREHENSION
        elif ast_info['type'] == 'lambda':
            entity_type = EntityType.LAMBDA
        else:
            entity_type = EntityType.LINE_EXECUTION

        # Get local variables
        variables = self.get_local_variables(frame)

        entity_data = {
            'ast_info': ast_info,
            'variables': variables,
            'iteration': self.loop_stack[-1]['iteration'] if self.loop_stack else None
        }

        event = self.create_event(entity_type, frame, entity_data)
        self.send_event(event)

    def handle_return(self, frame, return_value):
        """Handle function return"""
        if not self.call_stack:
            return

        call_info = self.call_stack.pop()
        execution_time = time.time() - call_info['start_time']

        class_name = None
        if 'self' in frame.f_locals:
            class_name = frame.f_locals['self'].__class__.__name__
            entity_type = EntityType.METHOD_RETURN
        else:
            entity_type = EntityType.FUNCTION_RETURN

        entity_data = {
            'return_value': repr(return_value)[:200] if return_value is not None else 'None',
            'execution_time': execution_time,
            'is_method': class_name is not None
        }

        event = self.create_event(entity_type, frame, entity_data)
        event.execution_time = execution_time

        self.send_event(event)

        # Track function timings
        func_key = f"{frame.f_code.co_filename}::{frame.f_code.co_name}"
        if func_key not in self.function_timings:
            self.function_timings[func_key] = []
        self.function_timings[func_key].append(execution_time)

    def handle_exception(self, frame, exc_info):
        """Handle exception"""
        exc_type, exc_value, exc_traceback = exc_info

        entity_data = {
            'exception_type': exc_type.__name__,
            'exception_message': str(exc_value),
            'is_caught': False  # Will be updated if caught
        }

        event = self.create_event(EntityType.EXCEPTION_RAISED, frame, entity_data)
        self.send_event(event)

    def start_tracing(self):
        """Start the tracer"""
        self.connect()
        sys.settrace(self.trace_function)
        print("[Blind Tracer] Tracing started")

    def stop_tracing(self):
        """Stop the tracer"""
        sys.settrace(None)
        if self.socket:
            self.socket.close()
        print("[Blind Tracer] Tracing stopped")
        print(f"[Blind Tracer] Total events captured: {self.event_counter}")

    def get_statistics(self) -> Dict[str, Any]:
        """Get execution statistics"""
        return {
            'total_events': self.event_counter,
            'total_functions': len(self.function_timings),
            'function_timings': {
                func: {
                    'calls': len(times),
                    'total_time': sum(times),
                    'avg_time': sum(times) / len(times),
                    'min_time': min(times),
                    'max_time': max(times)
                }
                for func, times in self.function_timings.items()
            }
        }


# Global tracer instance
_tracer_instance: Optional[ExecutionTracer] = None


def start_tracing(host='localhost', port=9876, project_root=None):
    """Start execution tracing"""
    global _tracer_instance
    _tracer_instance = ExecutionTracer(host, port, project_root)
    _tracer_instance.start_tracing()
    return _tracer_instance


def stop_tracing():
    """Stop execution tracing"""
    global _tracer_instance
    if _tracer_instance:
        _tracer_instance.stop_tracing()
        stats = _tracer_instance.get_statistics()
        _tracer_instance = None
        return stats
    return None


# Context manager for easy usage
class Tracer:
    """Context manager for tracing"""

    def __init__(self, host='localhost', port=9876):
        self.host = host
        self.port = port
        self.tracer = None

    def __enter__(self):
        self.tracer = start_tracing(self.host, self.port)
        return self.tracer

    def __exit__(self, exc_type, exc_val, exc_tb):
        stop_tracing()
        return False
