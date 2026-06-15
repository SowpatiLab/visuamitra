import os
import time
import logging
import uvicorn
import argparse
import webbrowser
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .routes import router
from pathlib import Path
from threading import Timer

from . import visuamitra_script
#print(f"!!! BACKEND SCRIPT LOCATION: {visuamitra_script.__file__}")

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("timing")

app = FastAPI(
    title="Visuamitra Backend",
    version="1.0.4"
)

# Timing Middleware
@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start
    logger.info(f"{request.method} {request.url.path} took {duration:.3f}s")
    return response

# CORS Middleware (Safe for local tool execution)
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

# Sanitize path outputs to prevent absolute system path exposure
@app.get("/api/local-context")
async def get_local_context():
    vcf_env = os.environ.get("VISUAMITRA_VCF")
    tbi_env = os.environ.get("VISUAMITRA_TBI")
    
    return {
        "vcf": os.path.basename(vcf_env) if vcf_env else None,
        "tbi": os.path.basename(tbi_env) if tbi_env else None
    }

# STATIC FILE SERVING LOGIC WITH CACHE BUSTING
package_dir = Path(__file__).parent.resolve()
frontend_build_dir = package_dir / "frontend" / "build"

if frontend_build_dir.exists():
    static_assets = frontend_build_dir / "static"
    
    # Cache Busting Strategy Step 1: immutable asset rules for hashed components
    if static_assets.exists():
        class ImmutableStaticFiles(StaticFiles):
            def is_not_modified(self, response_headers, request_headers) -> bool:
                response_headers["Cache-Control"] = "public, max-age=31536000, immutable"
                return super().is_not_modified(response_headers, request_headers)
                
        app.mount("/static", ImmutableStaticFiles(directory=str(static_assets)), name="static")

    # Helper to clean response headers for index.html
    def serve_index_with_no_cache():
        index_file = frontend_build_dir / "index.html"
        response = FileResponse(str(index_file))
        # Cache Busting Strategy Step 2: Force index.html to fetch fresh versions immediately
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    # Restrict arbitrary root queries securely to explicit files only
    ALLOWED_ROOT_FILES = {"favicon.ico", "manifest.json", "logo192.png", "logo512.png", "robots.txt"}

    @app.get("/{file_name}")
    async def serve_root_files(file_name: str):
        if file_name in ALLOWED_ROOT_FILES:
            file_path = frontend_build_dir / file_name
            if file_path.is_file():
                return FileResponse(str(file_path))
        
        # Safe fall through to index.html with caching disabled
        return serve_index_with_no_cache()

    # Catch-all routing context for UI sub-paths
    @app.get("/{rest_of_path:path}")
    async def serve_frontend(rest_of_path: str):
        if rest_of_path.startswith("api/") or rest_of_path.startswith("static/"):
            raise HTTPException(status_code=404, detail="Asset not found")
        return serve_index_with_no_cache()
else:
    @app.get("/")
    def health_check():
        return {"status": "Frontend build missing", "path": str(frontend_build_dir)}

# ENTRY POINT FOR PIP
def run_server():
    """Launcher for the visuamitra CLI command."""
    parser = argparse.ArgumentParser(description="VisuaMiTRa CLI")
    parser.add_argument("vcf", nargs="?", help="Path to the VCF file")
    args = parser.parse_args()

    vcf_path = None

    if args.vcf:
        vcf_file = Path(args.vcf).resolve()
        tbi_file = vcf_file.with_suffix(vcf_file.suffix + ".tbi")

        if not vcf_file.exists():
            print(f"Error: VCF file not found at {vcf_file}")
            return
        if not tbi_file.exists():
            print(f"Error: TBI index missing. Both must be in: {vcf_file.parent}")
            return
        
        os.environ["VISUAMITRA_VCF"] = str(vcf_file)
        os.environ["VISUAMITRA_TBI"] = str(tbi_file)
        vcf_path = str(vcf_file)

    port = 8088
    if args.vcf:
        url = f"http://127.0.0.1:{port}/upload?mode=cli&file={os.path.basename(vcf_path)}"
    else:
        url = f"http://127.0.0.1:{port}/"

    def open_browser():
        webbrowser.open_new(url)

    print(f"Starting VisuaMiTRa on {url}")
    Timer(1.5, open_browser).start()

    uvicorn.run("visuamitra.main:app", host="127.0.0.1", port=port, reload=False)

if __name__ == "__main__":
    run_server()