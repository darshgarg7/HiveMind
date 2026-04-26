from fastapi import FastAPI
from pydantic import BaseModel
from engine import run_hivemind

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="HiveMind API")

# Allow Lovable or any frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RunRequest(BaseModel):
    task_description: str

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the HiveMind API",
        "docs_url": "/docs",
        "health_check": "/health"
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/run")
def run_engine(request: RunRequest):
    logger.info("Received request to run HiveMind engine")
    try:
        result = run_hivemind(request.task_description)
        logger.info(f"Successfully generated output for run_id: {result.get('run_id')}")
        return result
    except Exception as e:
        logger.error(f"Error executing run_hivemind: {str(e)}", exc_info=True)
        return {"error": str(e)}
