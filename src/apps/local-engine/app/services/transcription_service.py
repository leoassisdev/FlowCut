"""
@module transcription_service
Orquestra a transcrição via whisper.cpp CLI.

Fluxo:
1. Valida paths
2. Chama whisper-cli com -ojf (JSON full com tokens)
3. Parseia o JSON
4. Agrupa tokens em palavras (whisper quebra em sílabas)
5. Mapeia para TranscribeResponse (compatível com shared-types TS)
"""

import json
import os
import re
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from typing import List

from app.core.config import settings
from app.schemas.responses import (
    TranscribeResponse,
    TranscriptResponse,
    TranscriptSegmentResponse,
    WordTokenResponse,
)

# Filler words em português
FILLER_WORDS_PT = {
    "uh", "um", "ah", "eh", "né", "tipo", "assim",
    "então", "bom", "bem", "sabe", "cara", "viu",
    "tá", "ta", "hm", "hmm", "ahn",
}


class TranscriptionService:

    def transcribe(
        self,
        audio_path: str,
        language: str,
        project_id: str,
    ) -> TranscribeResponse:
        # ── Validações ────────────────────────────────────────────────
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        if not os.path.exists(settings.whisper_bin_path):
            raise FileNotFoundError(
                f"whisper-cli not found: {settings.whisper_bin_path}\n"
                "Run: cd ~/dev/whisper.cpp && cmake -B build -DGGML_METAL=ON && cmake --build build"
            )

        if not os.path.exists(settings.whisper_model_path):
            raise FileNotFoundError(
                f"Whisper model not found: {settings.whisper_model_path}\n"
                "Run: cd ~/dev/whisper.cpp && bash models/download-ggml-model.sh small"
            )

        # ── Chama whisper-cli ─────────────────────────────────────────
        with tempfile.TemporaryDirectory() as tmp_dir:
            output_base = os.path.join(tmp_dir, "transcript")

            cmd = [
                settings.whisper_bin_path,
                "-m", settings.whisper_model_path,
                "-f", audio_path,
                "-l", language,
                "-ojf",          # JSON full (com tokens e timestamps por token)
                "-of", output_base,
                "-np",           # no prints (só output)
            ]

            start_time = time.time()

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5 min máximo
            )

            processing_time_ms = int((time.time() - start_time) * 1000)

            if result.returncode != 0:
                raise RuntimeError(
                    f"whisper-cli failed (code {result.returncode}):\n{result.stderr}"
                )

            json_path = output_base + ".json"
            if not os.path.exists(json_path):
                raise RuntimeError("whisper-cli did not produce JSON output")

            with open(json_path, "r", encoding="utf-8") as f:
                whisper_data = json.load(f)

        # ── Parseia e mapeia ──────────────────────────────────────────
        transcript = self._parse_whisper_json(
            whisper_data=whisper_data,
            project_id=project_id,
            language=language,
        )

        # Duração total em ms
        duration_ms = 0
        if transcript.segments:
            duration_ms = transcript.segments[-1].end_ms

        return TranscribeResponse(
            project_id=project_id,
            transcript=transcript,
            duration_ms=duration_ms,
            processing_time_ms=processing_time_ms,
        )

    # ── Parsing ───────────────────────────────────────────────────────

    def _parse_whisper_json(
        self,
        whisper_data: dict,
        project_id: str,
        language: str,
    ) -> TranscriptResponse:
        """
        Converte o JSON do whisper.cpp para TranscriptResponse.

        O whisper.cpp quebra palavras em tokens de sub-palavra (BPE).
        Ex: "oferece" → [" ofere", "ce"]
            "produtos" → [" prod", "utos"]

        A estratégia de agrupamento:
        - Token que começa com espaço = início de nova palavra
        - Token sem espaço = continua a palavra anterior
        - Tokens especiais ([_BEG_], [_TT_*]) são ignorados
        """
        raw_segments = whisper_data.get("transcription", [])
        segments: List[TranscriptSegmentResponse] = []
        all_texts: List[str] = []

        for seg_idx, raw_seg in enumerate(raw_segments):
            raw_tokens = raw_seg.get("tokens", [])
            seg_text = raw_seg.get("text", "").strip()
            seg_offsets = raw_seg.get("offsets", {})

            seg_start_ms = seg_offsets.get("from", 0)
            seg_end_ms = seg_offsets.get("to", 0)

            # Agrupa tokens em palavras
            words = self._group_tokens_into_words(raw_tokens)

            if not words:
                continue

            segment = TranscriptSegmentResponse(
                id=f"seg-{project_id}-{seg_idx}",
                start_ms=seg_start_ms,
                end_ms=seg_end_ms,
                text=seg_text,
                words=words,
                speaker_id="speaker-1",
                confidence=self._avg_confidence(words),
            )
            segments.append(segment)
            all_texts.append(seg_text)

        return TranscriptResponse(
            id=f"transcript-{project_id}",
            language=language,
            segments=segments,
            raw="\n".join(all_texts),
            engine="whisper.cpp",
        )

    def _group_tokens_into_words(
        self,
        raw_tokens: list,
    ) -> List[WordTokenResponse]:
        """
        Agrupa tokens BPE em palavras completas.
        """
        words: List[WordTokenResponse] = []

        # Acumulador da palavra atual
        current_text = ""
        current_start_ms = 0
        current_end_ms = 0
        current_confidence = 1.0
        token_count = 0

        def flush_word():
            nonlocal current_text, current_start_ms, current_end_ms
            nonlocal current_confidence, token_count

            if not current_text.strip():
                current_text = ""
                token_count = 0
                return

            clean = current_text.strip().lower()
            # Remove pontuação para checar filler
            clean_no_punct = re.sub(r'[^\w]', '', clean)

            word = WordTokenResponse(
                id=f"word-{uuid.uuid4().hex[:8]}",
                word=current_text.strip(),
                start_ms=current_start_ms,
                end_ms=current_end_ms,
                confidence=round(current_confidence / max(token_count, 1), 4),
                is_filler_word=clean_no_punct in FILLER_WORDS_PT,
                is_removed=False,
            )
            words.append(word)
            current_text = ""
            token_count = 0

        for token in raw_tokens:
            text = token.get("text", "")
            offsets = token.get("offsets", {})
            p = token.get("p", 1.0)

            # Ignora tokens especiais
            if text.startswith("[") and text.endswith("]"):
                continue
            if not text.strip():
                continue

            start_ms = offsets.get("from", 0)
            end_ms = offsets.get("to", 0)

            # Token começa com espaço = nova palavra
            if text.startswith(" ") and current_text:
                flush_word()

            if not current_text:
                # Início de palavra nova
                current_start_ms = start_ms
                current_confidence = p
                token_count = 1
            else:
                current_confidence += p
                token_count += 1

            current_text += text
            current_end_ms = end_ms

        # Flush última palavra
        if current_text:
            flush_word()

        return words

    def _avg_confidence(self, words: List[WordTokenResponse]) -> float:
        if not words:
            return 0.0
        return round(sum(w.confidence for w in words) / len(words), 4)
