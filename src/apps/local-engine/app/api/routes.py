"""
@module routes
API routes da engine local.
Recebe Request DTOs, valida, delega para services.
NUNCA contém regra de negócio.
"""

from fastapi import APIRouter, HTTPException
from app.schemas.requests import TranscribeRequest
from app.schemas.responses import TranscribeResponse
from app.services.transcription_service import TranscriptionService

router = APIRouter()
transcription_service = TranscriptionService()


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(request: TranscribeRequest) -> TranscribeResponse:
    """
    Transcreve um arquivo de áudio WAV usando whisper.cpp.
    Retorna segmentos com palavras e timestamps em ms.
    """
    try:
        result = transcription_service.transcribe(
            audio_path=request.audio_path,
            language=request.language or "pt",
            project_id=request.project_id,
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transcribe/{project_id}/status")
def transcribe_status(project_id: str):
    """Retorna o status da transcrição de um projeto."""
    return {"project_id": project_id, "status": "completed"}
