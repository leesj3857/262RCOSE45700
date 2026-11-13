"""추출 필드별 F1."""

from __future__ import annotations

import argparse

from app.adapters.extractor.factory import get_extractor
from app.config import Settings
from app.services.glossary import correct_text

from eval.common import load_items, mean_std


def f1(precision: float, recall: float) -> float:
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)


def score_field(items: list[dict[str, object]], field: str) -> float:
    extractor = get_extractor(Settings(_env_file=None, extractor_provider="mock"))
    true_positive = 0
    predicted = 0
    actual = 0
    for item in items:
        gold = item.get(field)
        extracted = extractor.extract(correct_text(str(item["hypothesis_text"])))
        guessed = getattr(extracted, field).value
        if gold not in (None, ""):
            actual += 1
        if guessed not in (None, ""):
            predicted += 1
        if gold not in (None, "") and guessed == gold:
            true_positive += 1
    precision = true_positive / predicted if predicted else 0.0
    recall = true_positive / actual if actual else 0.0
    return f1(precision, recall)


def main() -> None:
    parser = argparse.ArgumentParser(description="추출 필드 F1")
    parser.add_argument("--split", default="tune", choices=["tune", "test", "demo"])
    parser.add_argument("--runs", type=int, default=1)
    parser.add_argument("--condition", default=None)
    args = parser.parse_args()
    items = load_items(args.split, args.condition)
    print(f"samples={len(items)} condition={args.condition or 'all'}")
    for field in ("cause", "location", "mentioned_time"):
        scores = [score_field(items, field) for _ in range(args.runs)]
        print(f"{field} {mean_std(scores)}")


if __name__ == "__main__":
    main()
