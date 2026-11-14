from __future__ import annotations

from typing import Never

from app.adapters.gateway.client import GatewayClient
from app.adapters.stt.base import STTAdapter
from app.adapters.stt.gateway import GatewaySTT
from app.adapters.stt.mock import MockSTT
from app.config import Settings


def get_stt_adapter(settings: Settings) -> STTAdapter:
    provider = settings.stt_provider
    if provider == "mock":
        return MockSTT()
    if provider == "gateway":
        return GatewaySTT(GatewayClient(settings.gateway_base_url, settings.gateway_api_key))
    never: Never = provider
    raise AssertionError(never)
