"""근거 없는 값 채움 비율."""

from __future__ import annotations

import argparse

from app.adapters.extractor.factory import get_extractor
from app.config import Settings
from app.services.glossary import correct_text
from app.services.verify import find_span

from eval.common import load_items, mean_std


def hallucination_rate(items: list[dict[str, object]]) -> float:
    extractor = get_extractor(Settings(_env_file=None, extractor_provider="mock"))
    filled = 0
    unsupported = 0
    for item in items:
        text = correct_text(str(item["hypothesis_text"]))
        extracted = extractor.extract(text)
        for field in (extracted.cause, extracted.location, extracted.mentioned_time):
            if field.value is None:
                continue
            filled += 1
            if not field.evidence or find_span(text, field.evidence) is None:
                unsupported += 1
    if filled == 0:
        return 0.0
    return unsupported / filled


def main() -> None:
    parser = argparse.ArgumentParser(description="근거 없는 값 비율")
    parser.add_argument("--split", default="tune", choices=["tune", "test", "demo"])
    parser.add_argument("--runs", type=int, default=1)
    parser.add_argument("--condition", default=None)
    args = parser.parse_args()
    items = load_items(args.split, args.condition)
    scores = [hallucination_rate(items) for _ in range(args.runs)]
    print(f"samples={len(items)} unsupported_value_rate {mean_std(scores)}")


if __name__ == "__main__":
    main()
