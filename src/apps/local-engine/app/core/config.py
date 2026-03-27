"""
@module config
Configurações centrais da engine local.
Lê de variáveis de ambiente com fallbacks sensatos para desenvolvimento.
"""

import os
from pathlib import Path


class Settings:
    # ── Server ────────────────────────────────────────────────────────
    port: int = int(os.getenv("FLOWCUT_ENGINE_PORT", "7777"))

    # ── Whisper ───────────────────────────────────────────────────────
    # Path do binário whisper-cli compilado
    whisper_bin_path: str = os.getenv(
        "FLOWCUT_WHISPER_BIN",
        str(Path.home() / "dev" / "whisper.cpp" / "build" / "bin" / "whisper-cli"),
    )

    # Path do modelo .bin
    whisper_model_path: str = os.getenv(
        "FLOWCUT_WHISPER_MODEL",
        str(Path.home() / "dev" / "whisper.cpp" / "models" / "ggml-small.bin"),
    )

    # Idioma padrão para transcrição
    whisper_language: str = os.getenv("FLOWCUT_WHISPER_LANGUAGE", "pt")

    # ── Storage ───────────────────────────────────────────────────────
    # Diretório base para projetos processados
    projects_dir: str = os.getenv(
        "FLOWCUT_PROJECTS_DIR",
        str(Path("/tmp") / "flowcut" / "projects"),
    )


settings = Settings()
