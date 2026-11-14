import pytest
from app.domain.taxonomy.loader import load_taxonomy
from app.domain.taxonomy.questions import build_questions
from app.schemas.issues import IssueUpdate
from eval.common import load_items
from pydantic import ValidationError


def test_unknown_event_type_rejected() -> None:
    with pytest.raises(ValidationError):
        IssueUpdate(event_type="not_in_taxonomy")


def test_unknown_road_type_rejected() -> None:
    with pytest.raises(ValidationError):
        IssueUpdate(road_type="highway")


def test_guide_questions_follow_taxonomy() -> None:
    question_ids = [question.id for question in build_questions()]
    assert question_ids[:2] == ["event_type", "severity"]
    assert "road_type" in question_ids
    assert "ego_action_before" in question_ids
    assert "target_type" in question_ids
    assert "ego_reaction" in question_ids
    assert "lane_type" not in question_ids
    assert "two_wheeler" not in question_ids
    assert "pedestrian" not in question_ids
    taxonomy = load_taxonomy()
    spoken = {item.key for item in taxonomy.guide["ego_action_before"].options}
    assert "u_turn" not in spoken


def test_eval_script_can_read_test_split() -> None:
    items = load_items("test")
    assert items
    assert items[0]["id"] == "sample_test"
