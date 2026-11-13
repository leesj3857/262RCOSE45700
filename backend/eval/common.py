from __future__ import annotations

import json
from pathlib import Path


def backend_root() -> Path:
    return Path(__file__).resolve().parents[1]


def data_root() -> Path:
    return backend_root() / "data"


def load_items(split: str, condition: str | None = None) -> list[dict[str, object]]:
    root = data_root()
    splits = json.loads((root / "splits.json").read_text(encoding="utf-8"))
    items: list[dict[str, object]] = []
    for item_id in splits[split]:
        label = json.loads((root / "labels" / split / f"{item_id}.json").read_text(encoding="utf-8"))
        transcript = (root / "transcripts" / split / f"{item_id}.transcript.txt").read_text(encoding="utf-8").strip()
        label["hypothesis_text"] = transcript
        if condition and label.get("condition") != condition:
            continue
        items.append(label)
    return items


def edit_distance(left: str | list[str], right: str | list[str]) -> int:
    if len(left) < len(right):
        left, right = right, left
    previous = list(range(len(right) + 1))
    for index, current_item in enumerate(left, start=1):
        current = [index]
        for inner, other in enumerate(right, start=1):
            insert_cost = current[inner - 1] + 1
            delete_cost = previous[inner] + 1
            replace_cost = previous[inner - 1] + (current_item != other)
            current.append(min(insert_cost, delete_cost, replace_cost))
        previous = current
    return previous[-1]


def cer(reference: str, hypothesis: str) -> float:
    return edit_distance(reference, hypothesis) / max(len(reference), 1)


def wer(reference: str, hypothesis: str) -> float:
    reference_words = reference.split()
    hypothesis_words = hypothesis.split()
    return edit_distance(reference_words, hypothesis_words) / max(len(reference_words), 1)


def mean_std(values: list[float]) -> str:
    if not values:
        return "n/a"
    mean = sum(values) / len(values)
    variance = sum((value - mean) ** 2 for value in values) / len(values)
    return f"{mean:.4f}±{variance**0.5:.4f}"
