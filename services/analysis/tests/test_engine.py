from dataclasses import asdict

import pytest

from private_polis_analysis.engine import InsufficientDataError, RedDwarfAnalysisEngine
from private_polis_analysis.models import VoteInput, VoteValue


def sample_votes() -> list[VoteInput]:
    rows: dict[str, list[VoteValue]] = {
        "participant-a": ["AGREE", "AGREE", "DISAGREE"],
        "participant-b": ["AGREE", "AGREE", "DISAGREE"],
        "participant-c": ["DISAGREE", "DISAGREE", "AGREE"],
        "participant-d": ["DISAGREE", "DISAGREE", "AGREE"],
    }
    return [
        VoteInput(participant_id=participant, statement_id=f"statement-{index}", value=value)
        for participant, values in rows.items()
        for index, value in enumerate(values)
    ]


def test_red_dwarf_adapter_finds_opinion_groups() -> None:
    result = RedDwarfAnalysisEngine(force_group_count=2).analyze(sample_votes())

    assert result.participant_count == 4
    assert result.statement_count == 3
    assert len(result.points) == 4
    assert sorted(group.participant_count for group in result.groups) == [2, 2]
    assert {item.group_ordinal for item in result.statement_results} == {0, 1}


def test_analysis_result_does_not_persist_participant_identity() -> None:
    result = RedDwarfAnalysisEngine(force_group_count=2).analyze(sample_votes())
    serialized = repr(asdict(result))

    assert "participant-a" not in serialized
    assert "participant_id" not in serialized
    assert "user_id" not in serialized


def test_requires_enough_data() -> None:
    with pytest.raises(InsufficientDataError):
        RedDwarfAnalysisEngine().analyze(
            [VoteInput(participant_id="one", statement_id="only", value="PASS")]
        )
