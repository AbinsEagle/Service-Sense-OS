# Vercel entry point: Vercel serves the ASGI `app` found in this file.
# vercel.json sends every path here.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from hommiez_api.main import app  # noqa: E402,F401
