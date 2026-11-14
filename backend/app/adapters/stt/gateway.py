"""용어 힌트 방식: 공식 문서 확인 필요. 게이트웨이 STT 스펙은 팀 확인 전까지 구현하지 않는다."""

from __future__ import annotations

from pathlib import Path

from app.adapters.gateway.client import GatewayClient
from app.adapters.stt.base import STTAdapter, STTCapabilities, Transcript


class GatewaySTT(STTAdapter):
    provider_name = "gateway"

    def __init__(self, client: GatewayClient) -> None:
        self._client = client

    @property
    def capabilities(self) -> STTCapabilities:
        raise NotImplementedError("TODO: 게이트웨이 STT의 힌트·단어 신뢰도·타임스탬프 지원 여부를 문서에서 확인")

    def transcribe(self, audio_path: Path, hints: list[str]) -> Transcript:
        del audio_path, hints
        raise NotImplementedError("TODO: 게이트웨이 STT 호출 형식 확정 후 구현")
