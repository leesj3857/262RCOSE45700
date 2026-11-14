from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel

from app.schemas.common import WordToken


class STTCapabilities(BaseModel):
    supports_hints: bool
    supports_word_confidence: bool
    supports_word_timestamps: bool


class Transcript(BaseModel):
    text: str
    words: list[WordToken]
    language: str
    provider: str


class STTAdapter:
    provider_name: str

    @property
    def capabilities(self) -> STTCapabilities:
        raise NotImplementedError

    def transcribe(self, audio_path: Path, hints: list[str]) -> Transcript:
        raise NotImplementedError
