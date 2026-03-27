"""
@module schemas.requests
Request DTOs da engine local.
"""

from pydantic import BaseModel
from typing import Optional


class TranscribeRequest(BaseModel):
    project_id: str
    audio_path: str
    language: Optional[str] = "pt"
