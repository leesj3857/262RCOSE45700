"""일반 CER/WER 과 도메인 용어 인식률을 분리해서 계산한다."""

from __future__ import annotations

import argparse

from app.services.glossary import load_glossary

from eval.common import cer, load_items, mean_std, wer


def term_recall(reference: str, hypothesis: str, terms: list[str]) -> float | None:
    relevant = [term for term in terms if term in reference]
    if not relevant:
        return None
    hits = sum(1 for term in relevant if term in hypothesis)
    return hits / len(relevant)


def main() -> None:
    parser = argparse.ArgumentParser(description="STT CER/WER 와 도메인 용어 인식률")
    parser.add_argument("--split", default="tune", choices=["tune", "test", "demo"])
    parser.add_argument("--runs", type=int, default=1)
    parser.add_argument("--condition", default=None)
    args = parser.parse_args()
    items = load_items(args.split, args.condition)
    terms = load_glossary().terms
    cer_scores: list[float] = []
    wer_scores: list[float] = []
    term_scores: list[float] = []
    for _ in range(args.runs):
        for item in items:
            reference = str(item["reference_text"])
            hypothesis = str(item["hypothesis_text"])
            cer_scores.append(cer(reference, hypothesis))
            wer_scores.append(wer(reference, hypothesis))
            score = term_recall(reference, hypothesis, terms)
            if score is not None:
                term_scores.append(score)
    print(f"samples={len(items)} runs={args.runs} condition={args.condition or 'all'}")
    print(f"CER {mean_std(cer_scores)}")
    print(f"WER {mean_std(wer_scores)}")
    print(f"domain_term_recall {mean_std(term_scores)}")


if __name__ == "__main__":
    main()
