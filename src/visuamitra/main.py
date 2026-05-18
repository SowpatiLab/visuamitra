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
import argparse


from . import visuamitra_script
#print(f"!!! BACKEND SCRIPT LOCATION: {visuamitra_script.__file__}")

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

# API routes
app.include_router(router, prefix="/api")

# API route to fetch local paths
@app.get("/api/local-context")
async def get_local_context():
    return {
        "vcf": os.environ.get("VISUAMITRA_VCF"),
        "tbi": os.environ.get("VISUAMITRA_TBI")
    }

# STATIC FILE SERVING LOGIC
# Determine where the React build files are located
package_dir = Path(__file__).parent.resolve()

# folder name used in src/visuamitra/
frontend_build_dir = package_dir / "frontend" / "build"

#   STATIC FILE SERVING LOGIC 
if frontend_build_dir.exists():
    # Mount the /static subfolder (CSS/JS) first
    static_assets = frontend_build_dir / "static"
    if static_assets.exists():
        app.mount("/static", StaticFiles(directory=str(static_assets)), name="static")

    # Serve specific files (favicon, manifest, etc.) if they exist
    @app.get("/{file_name}")
    async def serve_root_files(file_name: str):
        file_path = frontend_build_dir / file_name
        if file_path.is_file():
            return FileResponse(str(file_path))
        # If not a file, it's likely a React Route, so fall through to index.html
        return FileResponse(str(frontend_build_dir / "index.html"))

    # Catch-all for React Router (Landing, Upload, Viewer)
    @app.get("/{rest_of_path:path}")
    async def serve_frontend(rest_of_path: str):
        return FileResponse(str(frontend_build_dir / "index.html"))
else:
    @app.get("/")
    def health_check():
        return {"status": "Frontend build missing", "path": str(frontend_build_dir)}

# ENTRY POINT FOR PIP 
def run_server():
    """Launcher for the visuamitra CLI command."""
    import uvicorn
    import webbrowser
    from threading import Timer

    parser = argparse.ArgumentParser(description="VisuaMiTRa CLI")
    parser.add_argument("vcf", nargs="?", help="Path to the VCF file")
    args = parser.parse_args()

    vcf_path = None
    tbi_path = None

    if args.vcf:
        vcf_file = Path(args.vcf).resolve()
        tbi_file = vcf_file.with_suffix(vcf_file.suffix + ".tbi")

        if not vcf_file.exists():
            print(f"Error: VCF file not found at {vcf_file}")
            return
        if not tbi_file.exists():
            print(f"Error: TBI index missing. Both must be in: {vcf_file.parent}")
            return
        
        # Store paths globally for the API to hand to the frontend
        os.environ["VISUAMITRA_VCF"] = str(vcf_file)
        os.environ["VISUAMITRA_TBI"] = str(tbi_file)
        vcf_path = str(vcf_file)

    port = 8088
    # we go straight to /upload if file is provided
    if args.vcf:
        url = f"http://127.0.0.1:{port}/upload?mode=cli&file={os.path.basename(vcf_path)}"
    else:
        url = f"http://127.0.0.1:{port}/" # Go to Landing Page

    def open_browser():
        webbrowser.open_new(url)

    print(f"Starting VisuaMiTRa on {url}")
    
    # Optional: Automatically open the browser after 1.5 seconds
    Timer(1.5, open_browser).start()

    # We use string import to avoid issues with signal handlers in some OS
    uvicorn.run("visuamitra.main:app", host="127.0.0.1", port=port, reload=False)

if __name__ == "__main__":
    run_server()