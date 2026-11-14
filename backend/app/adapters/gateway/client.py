"""게이트웨이 공통 클라이언트.

호출 경로, 인증 헤더, 요청/응답 필드명은 팀이 확정하기 전까지 구현하지 않는다.
Claude, GPT, Jev, 게이트웨이 STT 는 이 클라이언트 하나의 키를 쓴다.
이 키는 서버 내부 비밀값이다. 응답이나 프론트로 내보내지 않는다.
"""

from __future__ import annotations


class GatewayClient:
    def __init__(self, base_url: str, api_key: str) -> None:
        self.base_url = base_url.rstrip("/")
        self._api_key = api_key

    def post_json(self, path: str, payload: dict[str, object]) -> dict[str, object]:
        del path, payload
        # TODO: base URL, 인증 방식, Claude/GPT/Jev/STT 요청 형식을 팀이 알려준 뒤 구현한다.
        raise NotImplementedError("게이트웨이 호출 방식은 아직 확정되지 않았습니다.")
