from __future__ import annotations

from typing import Never

from app.adapters.extractor.base import ExtractorAdapter
from app.adapters.extractor.gateway_claude import GatewayClaudeExtractor
from app.adapters.extractor.mock import MockExtractor
from app.adapters.gateway.client import GatewayClient
from app.config import Settings


def get_extractor(settings: Settings) -> ExtractorAdapter:
    provider = settings.extractor_provider
    if provider == "mock":
        return MockExtractor()
    if provider == "gateway_claude":
        client = GatewayClient(settings.gateway_base_url, settings.gateway_api_key)
        return GatewayClaudeExtractor(client, settings.claude_model)
    never: Never = provider
    raise AssertionError(never)
