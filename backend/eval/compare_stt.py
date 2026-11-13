"""STT 후보를 같은 녹음 세트로 비교한다. 1주차 선정용."""

from __future__ import annotations

import argparse
import time
from pathlib import Path

from app.adapters.stt.factory import get_stt_adapter
from app.config import Settings
from app.services.glossary import correct_text, load_glossary

from eval.common import cer, load_items, mean_std
from eval.stt_metrics import term_recall


def _settings_for(provider: str) -> Settings:
    return Settings(_env_file=None, stt_provider=provider)  # type: ignore[arg-type]


def main() -> None:
    parser = argparse.ArgumentParser(description="STT 후보 비교")
    parser.add_argument("--providers", default="mock")
    parser.add_argument("--split", default="tune", choices=["tune", "test", "demo"])
    parser.add_argument("--runs", type=int, default=1)
    parser.add_argument("--condition", default=None)
    args = parser.parse_args()
    items = load_items(args.split, args.condition)
    glossary = load_glossary()
    print("provider\tCER\tterm_hint_on\tterm_hint_off\tlatency_s\tword_confidence\ttimestamps\thints\tcost")
    for provider in [item.strip() for item in args.providers.split(",") if item.strip()]:
        try:
            adapter = get_stt_adapter(_settings_for(provider))
            capabilities = adapter.capabilities
        except NotImplementedError:
            print(f"{provider}\t미구현\t미구현\t미구현\t미구현\tTODO\tTODO\tTODO\t벤더 확정 후 기입")
            continue
        cer_scores: list[float] = []
        hint_on: list[float] = []
        hint_off: list[float] = []
        latencies: list[float] = []
        for _ in range(args.runs):
            for item in items:
                audio = Path(f"/tmp/{item['id']}.wav")
                audio.write_bytes(b"RIFF")
                sidecar = Path(str(audio) + ".transcript.txt")
                sidecar.write_text(str(item["hypothesis_text"]), encoding="utf-8")
                started = time.perf_counter()
                with_hints = adapter.transcribe(audio, glossary.terms if capabilities.supports_hints else [])
                latencies.append(time.perf_counter() - started)
                without_hints = adapter.transcribe(audio, [])
                reference = str(item["reference_text"])
                corrected = correct_text(with_hints.text, glossary)
                cer_scores.append(cer(reference, corrected))
                on_score = term_recall(reference, corrected, glossary.terms)
                off_score = term_recall(reference, correct_text(without_hints.text, glossary), glossary.terms)
                if on_score is not None:
                    hint_on.append(on_score)
                if off_score is not None:
                    hint_off.append(off_score)
                sidecar.unlink(missing_ok=True)
        cost = "0 (mock)" if provider == "mock" else "TODO: 벤더 확정 후 기입"
        print(
            f"{provider}\t{mean_std(cer_scores)}\t{mean_std(hint_on)}\t{mean_std(hint_off)}\t"
            f"{mean_std(latencies)}\t{capabilities.supports_word_confidence}\t"
            f"{capabilities.supports_word_timestamps}\t{capabilities.supports_hints}\t{cost}"
        )


if __name__ == "__main__":
    main()
