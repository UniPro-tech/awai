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
    overall = [counts for counts in result.vote_counts if counts.group_ordinal is None]
    assert len(overall) == 3
    assert all(counts.agree_count == 2 for counts in overall)
    assert all(counts.disagree_count == 2 for counts in overall)
    assert all(counts.pass_count == 0 for counts in overall)

    grouped = [counts for counts in result.vote_counts if counts.group_ordinal is not None]
    assert len(grouped) == 6
    assert all(
        counts.agree_count + counts.disagree_count + counts.pass_count == 2
        for counts in grouped
    )


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


def test_requires_distinct_vote_patterns() -> None:
    values: tuple[VoteValue, ...] = ("AGREE", "DISAGREE")
    votes = [
        VoteInput(participant_id=participant, statement_id=f"statement-{index}", value=value)
        for participant in ("participant-a", "participant-b", "participant-c")
        for index, value in enumerate(values)
    ]

    with pytest.raises(InsufficientDataError, match="two distinct vote patterns"):
        RedDwarfAnalysisEngine().analyze(votes)


def test_automatic_group_search_avoids_impossible_group_counts() -> None:
    result = RedDwarfAnalysisEngine().analyze(sample_votes())

    assert sorted(group.participant_count for group in result.groups) == [2, 2]


def test_rejects_forced_group_count_that_the_data_cannot_support() -> None:
    with pytest.raises(InsufficientDataError, match="between 2 and 2"):
        RedDwarfAnalysisEngine(force_group_count=3).analyze(sample_votes())
