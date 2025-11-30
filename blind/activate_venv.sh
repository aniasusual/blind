#!/bin/bash
# Quick activation script for blind venv

source venv/bin/activate
echo "✅ Virtual environment activated!"
echo "📦 blind package version: $(python -c 'import blind; print(blind.__version__ if hasattr(blind, "__version__") else "0.1.0")')"
echo ""
echo "Usage:"
echo "  python -m blind your_script.py"
echo ""