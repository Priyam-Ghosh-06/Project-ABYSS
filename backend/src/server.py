"""
Server entrypoint for OceanEmbed Backend API.
Runs Uvicorn ASGI server on port 8000.
"""

import uvicorn
import os
import sys
from pathlib import Path

# Add backend directory to python path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if __name__ == "__main__":
    uvicorn.run("src.api.app:app", host="0.0.0.0", port=8000, reload=True)
