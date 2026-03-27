"""
FlowCut Local Engine
FastAPI server que roda localmente como sidecar do Tauri.
Responsável por: transcrição (whisper.cpp), alinhamento, auto-cut, export.
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings

app = FastAPI(
    title="FlowCut Local Engine",
    version="0.1.0",
    description="Local processing engine for FlowCut desktop app",
)

# CORS — permite chamadas do frontend Tauri (localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "tauri://localhost"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "flowcut-local-engine",
        "version": "0.1.0",
        "whisper_model": settings.whisper_model_path,
        "whisper_bin": settings.whisper_bin_path,
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=settings.port,
        reload=False,
        log_level="info",
    )
