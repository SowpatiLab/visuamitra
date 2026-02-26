from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routes import router
import time
import logging


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("timing")


app = FastAPI(
    title="Visuamitra Backend",
    version="0.1.0"
)

@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start

    logger.info(
        f"{request.method} {request.url.path} took {duration:.3f}s"
    )
    return response


# CORS Middleware
origins = ["http://localhost:3000","http://127.0.0.1:3000", "http://192.168.14.145:3000"]   # React dev server
           
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Next-Cursor"], 
)

app.include_router(router)

@app.get("/")
def health_check():
    return {"status": "Visuamitra backend running"}

