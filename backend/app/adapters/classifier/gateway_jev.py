"""게이트웨이 Jev 호출. 결정 모델의 요청/응답 형식은 팀 확인 전까지 구현하지 않는다."""

from __future__ import annotations

from app.adapters.classifier.base import ClassificationResult, ClassifierAdapter, Question
from app.adapters.gateway.client import GatewayClient


class GatewayJevClassifier(ClassifierAdapter):
    def __init__(self, client: GatewayClient, model_version: str) -> None:
        self._client = client
        self.model_version = model_version

    def classify(self, state_text: str, questions: list[Question]) -> ClassificationResult:
        del state_text, questions
        raise NotImplementedError("TODO: Jev Choice/Score/Noul 호출 형식 확정 후 구현")
