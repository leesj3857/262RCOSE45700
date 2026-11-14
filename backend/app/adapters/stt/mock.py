from __future__ import annotations

import re
from pathlib import Path

from app.adapters.stt.base import STTAdapter, STTCapabilities, Transcript
from app.schemas.common import WordToken

FIXED_TRANSCRIPT = "강남대로에서 검은 차가 컷 인해서 급제동했다. 라바 콘이 쓰러져 있었다."


def sidecar_candidates(audio_path: Path) -> list[Path]:
    return [
        Path(str(audio_path) + ".transcript.txt"),
        audio_path.with_name(f"{audio_path.stem}.transcript.txt"),
    ]


def words_for(text: str) -> list[WordToken]:
    tokens = re.findall(r"\S+", text)
    words: list[WordToken] = []
    for index, token in enumerate(tokens):
        start = round(index * 0.4, 3)
        confidence = 0.4 if index == 0 else 0.95
        words.append(WordToken(text=token, start=start, end=round(start + 0.35, 3), confidence=confidence))
    return words


class MockSTT(STTAdapter):
    provider_name = "mock"

    @property
    def capabilities(self) -> STTCapabilities:
        return STTCapabilities(
            supports_hints=True,
            supports_word_confidence=True,
            supports_word_timestamps=True,
        )

    def transcribe(self, audio_path: Path, hints: list[str]) -> Transcript:
        del hints
        text = FIXED_TRANSCRIPT
        for candidate in sidecar_candidates(audio_path):
            if candidate.is_file():
                text = candidate.read_text(encoding="utf-8").strip()
                break
        return Transcript(text=text, words=words_for(text), language="ko", provider=self.provider_name)
