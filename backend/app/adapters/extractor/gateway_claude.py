"""게이트웨이 Claude 호출. 요청/응답 형식은 팀 확인 전까지 구현하지 않는다."""

from __future__ import annotations

from app.adapters.extractor.base import Extraction, ExtractorAdapter
from app.adapters.gateway.client import GatewayClient


class GatewayClaudeExtractor(ExtractorAdapter):
    def __init__(self, client: GatewayClient, model: str) -> None:
        self._client = client
        self.model = model

    def extract(self, transcript_text: str) -> Extraction:
        del transcript_text
        raise NotImplementedError("TODO: Claude JSON schema 사실 추출 호출 형식 확정 후 구현")

    def summarize(self, stats: dict[str, object]) -> str:
        del stats
        raise NotImplementedError("TODO: Claude 요약 호출 형식 확정 후 구현. 숫자는 호출 전에 SQL로 계산한다.")
