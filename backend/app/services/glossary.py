from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import BaseModel


class Glossary(BaseModel):
    terms: list[str]
    replacements: list[tuple[str, str]]


def glossary_path() -> Path:
    return Path(__file__).resolve().parents[1] / "domain" / "glossary.yaml"


@lru_cache
def load_glossary() -> Glossary:
    raw = yaml.safe_load(glossary_path().read_text(encoding="utf-8"))
    pairs = [(item["from"], item["to"]) for item in raw["replacements"]]
    pairs.sort(key=lambda item: len(item[0]), reverse=True)
    return Glossary(terms=list(raw["terms"]), replacements=pairs)


def correct_text(text: str, glossary: Glossary | None = None) -> str:
    spec = glossary or load_glossary()
    corrected = text
    for source, target in spec.replacements:
        corrected = corrected.replace(source, target)
    return corrected
