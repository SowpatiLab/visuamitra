import os
import time
import logging
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .routes import router
from pathlib import Path

from . import visuamitra_script
print(f"!!! BACKEND SCRIPT LOCATION: {visuamitra_script.__file__}")

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("timing")

app = FastAPI(
    title="Visuamitra Backend",
    version="0.1.0"
)

# Timing Middleware
@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start
    logger.info(f"{request.method} {request.url.path} took {duration:.3f}s")
    return response

# CORS Middleware (Keep this for local development)
origins = ["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.14.145:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Next-Cursor"], 
)

# Include your API routes
app.include_router(router, prefix="/api")

# --- NEW: STATIC FILE SERVING LOGIC ---

# 1. Determine where the static files are located
# This assumes you copied the 'build' folder into 'backend/static'
# In main.py
from pathlib import Path

# Use Pathlib for cleaner cross-platform path handling
package_dir = Path(__file__).parent.resolve()
static_dir = package_dir / "static"

if static_dir.exists():
    # Mount the /static/static subfolder
    app.mount("/static", StaticFiles(directory=str(static_dir / "static")), name="static")
    
    @app.get("/{rest_of_path:path}")
    async def serve_frontend(rest_of_path: str):
        if rest_of_path.startswith("api/"):
            return {"error": "API route not found"}
        return FileResponse(str(static_dir / "index.html"))
else:
    # Fallback for development if static folder isn't built yet
    @app.get("/")
    def health_check():
        return {"status": "Visuamitra backend running (Frontend build missing)"}

# --- NEW: ENTRY POINT FOR PIP ---

def run_server():
    """Launcher for the visuamitra CLI command."""
    import uvicorn
    import webbrowser
    from threading import Timer

    port = 8088
    url = f"http://127.0.0.1:{port}"

    def open_browser():
        webbrowser.open_new(url)

    print(f"Starting VisuaMiTRa on {url}")
    
    # Optional: Automatically open the browser after 1.5 seconds
    Timer(1.5, open_browser).start()

    # We use the string import to avoid issues with signal handlers in some OS
    uvicorn.run("visuamitra.main:app", host="127.0.0.1", port=port, reload=False)

if __name__ == "__main__":
    run_server()