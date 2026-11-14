from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import BaseModel


class EventTypeSpec(BaseModel):
    key: str
    label: str
    description: str
    keywords: list[str]


class SeverityLevelSpec(BaseModel):
    key: str
    label: str
    description: str
    keywords: list[str]


class ChoiceOptionSpec(BaseModel):
    key: str
    label: str
    description: str
    keywords: list[str] = []


class ChoiceGroupSpec(BaseModel):
    label: str
    prompt: str
    options: list[ChoiceOptionSpec]


GUIDE_IDS = ("road_type", "ego_action_before", "target_type", "ego_reaction")


class Taxonomy(BaseModel):
    version: str
    event_types: list[EventTypeSpec]
    severity_levels: list[SeverityLevelSpec]
    guide: dict[str, ChoiceGroupSpec]


def taxonomy_path() -> Path:
    return Path(__file__).with_name("v1.yaml")


@lru_cache
def load_taxonomy() -> Taxonomy:
    raw = yaml.safe_load(taxonomy_path().read_text(encoding="utf-8"))
    guide = {key: ChoiceGroupSpec.model_validate(raw["guide"][key]) for key in GUIDE_IDS}
    return Taxonomy(
        version=raw["version"],
        event_types=[EventTypeSpec.model_validate(item) for item in raw["event_types"]],
        severity_levels=[SeverityLevelSpec.model_validate(item) for item in raw["severity"]["levels"]],
        guide=guide,
    )


def event_type_keys() -> list[str]:
    return [item.key for item in load_taxonomy().event_types]


def severity_keys() -> list[str]:
    return [item.key for item in load_taxonomy().severity_levels]


def choice_keys(group_id: str) -> list[str]:
    return [item.key for item in load_taxonomy().guide[group_id].options]
