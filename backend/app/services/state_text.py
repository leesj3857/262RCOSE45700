from __future__ import annotations


def build_state_text(transcript: str, cause: str | None, location: str | None) -> str:
    """분류기 입력은 전사문과 추출된 원인·위치만 담는다."""
    lines = [transcript.strip()]
    if cause:
        lines.append(f"원인: {cause}")
    if location:
        lines.append(f"위치: {location}")
    return "\n".join(line for line in lines if line)
