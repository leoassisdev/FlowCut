"""
@module schemas.responses
Response DTOs da engine local.
Estrutura compatível com shared-types TypeScript do desktop.
"""

from pydantic import BaseModel
from typing import List, Optional


class WordTokenResponse(BaseModel):
    id: str
    word: str
    start_ms: int
    end_ms: int
    confidence: float
    is_filler_word: bool
    is_removed: bool = False


class TranscriptSegmentResponse(BaseModel):
    id: str
    start_ms: int
    end_ms: int
    text: str
    words: List[WordTokenResponse]
    speaker_id: Optional[str] = None
    confidence: float


class TranscriptResponse(BaseModel):
    id: str
    language: str
    segments: List[TranscriptSegmentResponse]
    raw: str
    engine: str = "whisper.cpp"


class TranscribeResponse(BaseModel):
    project_id: str
    transcript: TranscriptResponse
    duration_ms: int
    processing_time_ms: int
