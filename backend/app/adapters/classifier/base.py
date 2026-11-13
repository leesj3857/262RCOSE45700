from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ChoiceOption(BaseModel):
    key: str
    description: str


class ChoiceQuestion(BaseModel):
    kind: Literal["choice"] = "choice"
    id: str
    prompt: str
    options: list[ChoiceOption]


class ScoreQuestion(BaseModel):
    kind: Literal["score"] = "score"
    id: str
    prompt: str
    levels: int


class NoulQuestion(BaseModel):
    kind: Literal["noul"] = "noul"
    id: str
    prompt: str


Question = ChoiceQuestion | ScoreQuestion | NoulQuestion


class ChoiceAnswer(BaseModel):
    kind: Literal["choice"] = "choice"
    id: str
    value: str | None
    probabilities: dict[str, float]
    confidence: float | None


class ScoreAnswer(BaseModel):
    kind: Literal["score"] = "score"
    id: str
    score: int | None
    distribution: dict[str, float]
    confidence: float | None


class NoulAnswer(BaseModel):
    kind: Literal["noul"] = "noul"
    id: str
    probability: float
    confidence: float | None


class ClassificationResult(BaseModel):
    answers: list[ChoiceAnswer | ScoreAnswer | NoulAnswer] = Field(default_factory=list)


class ClassifierAdapter:
    def classify(self, state_text: str, questions: list[Question]) -> ClassificationResult:
        raise NotImplementedError
