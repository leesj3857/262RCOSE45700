"""분류 정확도, 혼동 행렬, 신뢰도 보정, 임계값 커버리지."""

from __future__ import annotations

import argparse
from collections import Counter

from app.adapters.classifier.base import ChoiceAnswer, ScoreAnswer
from app.adapters.classifier.factory import get_classifier
from app.config import Settings
from app.domain.taxonomy.loader import load_taxonomy
from app.domain.taxonomy.questions import build_questions
from app.services.glossary import correct_text
from app.services.state_text import build_state_text

from eval.common import load_items, mean_std


def predict(text: str) -> tuple[str | None, str | None, float | None]:
    taxonomy = load_taxonomy()
    corrected = correct_text(text)
    state = build_state_text(corrected, None, None)
    classifier = get_classifier(Settings(_env_file=None, classifier_provider="mock"))
    result = classifier.classify(state, build_questions(taxonomy))
    event = next(answer for answer in result.answers if isinstance(answer, ChoiceAnswer) and answer.id == "event_type")
    severity = next(answer for answer in result.answers if isinstance(answer, ScoreAnswer))
    label = None
    if severity.score is not None and 0 <= severity.score < len(taxonomy.severity_levels):
        label = taxonomy.severity_levels[severity.score].key
    return event.value, label, event.confidence


def main() -> None:
    parser = argparse.ArgumentParser(description="분류 평가")
    parser.add_argument("--split", default="tune", choices=["tune", "test", "demo"])
    parser.add_argument("--runs", type=int, default=1)
    parser.add_argument("--condition", default=None)
    parser.add_argument("--threshold", type=float, default=0.85)
    args = parser.parse_args()
    items = load_items(args.split, args.condition)
    accuracies: list[float] = []
    severity_accuracies: list[float] = []
    coverages: list[float] = []
    matrix: Counter[tuple[str, str]] = Counter()
    bins: dict[str, list[bool]] = {"0.0-0.5": [], "0.5-0.85": [], "0.85-1.0": []}
    for _ in range(args.runs):
        correct = 0
        severity_correct = 0
        covered = 0
        for item in items:
            event, severity, confidence = predict(str(item["hypothesis_text"]))
            gold_event = str(item["event_type"])
            gold_severity = str(item["severity"])
            matrix[(gold_event, event or "null")] += 1
            if event == gold_event:
                correct += 1
            if severity == gold_severity:
                severity_correct += 1
            if confidence is not None and confidence >= args.threshold and event == gold_event:
                covered += 1
            bucket = "0.0-0.5" if (confidence or 0) < 0.5 else "0.5-0.85" if (confidence or 0) < 0.85 else "0.85-1.0"
            bins[bucket].append(event == gold_event)
        total = max(len(items), 1)
        accuracies.append(correct / total)
        severity_accuracies.append(severity_correct / total)
        coverages.append(covered / total)
    print(f"event_type_accuracy {mean_std(accuracies)}")
    print(f"severity_accuracy {mean_std(severity_accuracies)}")
    print(f"coverage_at_{args.threshold} {mean_std(coverages)}")
    print("confusion gold -> predicted")
    for (gold, predicted), count in sorted(matrix.items()):
        print(f"  {gold} -> {predicted}: {count}")
    print("calibration")
    for name, values in bins.items():
        accuracy = sum(1 for value in values if value) / len(values) if values else 0.0
        print(f"  {name}: n={len(values)} accuracy={accuracy:.4f}")


if __name__ == "__main__":
    main()
