from collections import Counter
from typing import Protocol, cast

from reddwarf.implementations.base import run_pipeline

from .models import (
    AnalysisGroup,
    AnalysisPoint,
    AnalysisResult,
    ResultKind,
    StatementResult,
    StatementVoteCounts,
    VoteInput,
)


class InsufficientDataError(ValueError):
    """Raised when PCA and clustering cannot produce a meaningful result."""


class AnalysisEngine(Protocol):
    def analyze(self, votes: list[VoteInput]) -> AnalysisResult: ...


def _maximum_meaningful_group_count(
    votes: list[VoteInput], participant_ids: list[str], statement_ids: list[str]
) -> int:
    votes_by_participant: dict[str, dict[str, str]] = {
        participant_id: {} for participant_id in participant_ids
    }
    for vote in votes:
        votes_by_participant[vote.participant_id][vote.statement_id] = vote.value

    unique_vote_patterns = {
        tuple(
            votes_by_participant[participant_id].get(statement_id)
            for statement_id in statement_ids
        )
        for participant_id in participant_ids
    }
    maximum = min(5, len(participant_ids) - 1, len(unique_vote_patterns))
    if maximum < 2:
        raise InsufficientDataError(
            "At least three participants with two distinct vote patterns are required."
        )
    return maximum


class RedDwarfAnalysisEngine:
    """Adapts Awai UUID-based votes to Red Dwarf's integer identifiers."""

    def __init__(self, *, force_group_count: int | None = None) -> None:
        self._force_group_count = force_group_count

    def analyze(self, votes: list[VoteInput]) -> AnalysisResult:
        participant_ids = sorted({vote.participant_id for vote in votes})
        statement_ids = sorted({vote.statement_id for vote in votes})
        if len(participant_ids) < 3 or len(statement_ids) < 2:
            raise InsufficientDataError(
                "At least three participants and two statements are required."
            )

        maximum_group_count = _maximum_meaningful_group_count(
            votes, participant_ids, statement_ids
        )
        if self._force_group_count is not None and not (
            2 <= self._force_group_count <= maximum_group_count
        ):
            raise InsufficientDataError(
                f"Forced group count must be between 2 and {maximum_group_count} for this data."
            )

        participant_to_int = {value: index for index, value in enumerate(participant_ids)}
        statement_to_int = {value: index for index, value in enumerate(statement_ids)}
        int_to_statement = {index: value for value, index in statement_to_int.items()}
        numeric_value = {"AGREE": 1, "DISAGREE": -1, "PASS": 0}

        red_dwarf_votes = [
            {
                "participant_id": participant_to_int[vote.participant_id],
                "statement_id": statement_to_int[vote.statement_id],
                "vote": numeric_value[vote.value],
                "modified": 0,
            }
            for vote in votes
        ]
        pipeline_result = run_pipeline(
            votes=red_dwarf_votes,
            min_user_vote_threshold=1,
            max_group_count=maximum_group_count,
            force_group_count=self._force_group_count,
            random_state=0,
        )

        points: list[AnalysisPoint] = []
        participant_groups: dict[str, int | None] = {}
        group_counts: Counter[int] = Counter()
        group_coordinates: dict[int, list[tuple[float, float]]] = {}
        for participant_index, row in pipeline_result.participants_df.iterrows():
            group = None if row["cluster_id"] is None else int(row["cluster_id"])
            x, y = float(row["x"]), float(row["y"])
            points.append(AnalysisPoint(x=x, y=y, group_ordinal=group))
            participant_groups[participant_ids[int(participant_index)]] = group
            if group is not None:
                group_counts[group] += 1
                group_coordinates.setdefault(group, []).append((x, y))

        groups = tuple(
            AnalysisGroup(
                ordinal=ordinal,
                participant_count=group_counts[ordinal],
                centroid_x=sum(point[0] for point in coordinates) / len(coordinates),
                centroid_y=sum(point[1] for point in coordinates) / len(coordinates),
            )
            for ordinal, coordinates in sorted(group_coordinates.items())
        )

        statement_results: list[StatementResult] = []
        for direction, entries in pipeline_result.consensus.items():
            for rank, entry in enumerate(entries, start=1):
                statement_results.append(
                    StatementResult(
                        statement_id=int_to_statement[int(entry["tid"])],
                        group_ordinal=None,
                        kind=cast(ResultKind, f"CONSENSUS_{direction.upper()}"),
                        score=float(entry.get("p-success", entry.get("consensus", 0.0))),
                        rank=rank,
                    )
                )

        for group_ordinal, entries in pipeline_result.repness.items():
            for rank, entry in enumerate(entries, start=1):
                direction = str(entry["repful-for"]).upper()
                statement_results.append(
                    StatementResult(
                        statement_id=int_to_statement[int(entry["tid"])],
                        group_ordinal=int(group_ordinal),
                        kind=cast(ResultKind, f"REPRESENTATIVE_{direction}"),
                        score=float(entry["repness"]),
                        rank=rank,
                    )
                )

        count_keys: list[tuple[str, int | None]] = [
            (statement_id, None) for statement_id in statement_ids
        ]
        count_keys.extend(
            (statement_id, group.ordinal)
            for statement_id in statement_ids
            for group in groups
        )
        vote_counts: dict[tuple[str, int | None], Counter[str]] = {
            key: Counter() for key in count_keys
        }
        for vote in votes:
            vote_counts[(vote.statement_id, None)][vote.value] += 1
            group_ordinal = participant_groups.get(vote.participant_id)
            if group_ordinal is not None:
                vote_counts[(vote.statement_id, group_ordinal)][vote.value] += 1

        statement_vote_counts = tuple(
            StatementVoteCounts(
                statement_id=statement_id,
                group_ordinal=group_ordinal,
                agree_count=counts["AGREE"],
                disagree_count=counts["DISAGREE"],
                pass_count=counts["PASS"],
            )
            for (statement_id, group_ordinal), counts in vote_counts.items()
        )

        return AnalysisResult(
            participant_count=len(participant_ids),
            statement_count=len(statement_ids),
            points=tuple(points),
            groups=groups,
            statement_results=tuple(statement_results),
            vote_counts=statement_vote_counts,
        )
