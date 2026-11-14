from __future__ import annotations

INVALID_AUTH = "인증이 유효하지 않습니다"
FORBIDDEN = "권한이 없습니다."
ISSUE_NOT_FOUND = "이슈를 찾을 수 없습니다."
LOGIN_FAILED = "아이디 또는 비밀번호가 올바르지 않습니다"
UPLOAD_TOO_LARGE = "오디오 파일이 너무 큽니다."
EXTERNAL_FAILED = "외부 호출에 실패했습니다. 다시 시도해 주세요."


def error_response(description: str) -> dict[str, object]:
    return {
        "description": description,
        "content": {"application/json": {"example": {"detail": description}}},
    }


RESP_401 = {401: error_response(INVALID_AUTH)}
RESP_403 = {403: error_response(FORBIDDEN)}
RESP_404 = {404: error_response(ISSUE_NOT_FOUND)}
RESP_413 = {413: error_response(UPLOAD_TOO_LARGE)}
RESP_422 = {422: error_response("요청 형식이 올바르지 않습니다")}
RESP_503 = {503: error_response(EXTERNAL_FAILED)}
