from collections import Counter
from typing import Protocol, cast

from reddwarf.implementations.base import run_pipeline

from .models import (
    AnalysisGroup,
    AnalysisPoint,
    AnalysisResult,
    ResultKind,
    StatementResult,
    VoteInput,
)


class InsufficientDataError(ValueError):
    """Raised when PCA and clustering cannot produce a meaningful result."""


class AnalysisEngine(Protocol):
    def analyze(self, votes: list[VoteInput]) -> AnalysisResult: ...


class RedDwarfAnalysisEngine:
    """Adapts Awai UUID-based votes to Red Dwarf's integer identifiers."""

    def __init__(self, *, force_group_count: int | None = None) -> None:
        self._force_group_count = force_group_count

    def analyze(self, votes: list[VoteInput]) -> AnalysisResult:
        participant_ids = sorted({vote.participant_id for vote in votes})
        statement_ids = sorted({vote.statement_id for vote in votes})
        if len(participant_ids) < 2 or len(statement_ids) < 2:
            raise InsufficientDataError(
                "At least two participants and two statements are required."
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
            force_group_count=self._force_group_count,
            random_state=0,
        )

        points: list[AnalysisPoint] = []
        group_counts: Counter[int] = Counter()
        group_coordinates: dict[int, list[tuple[float, float]]] = {}
        for row in pipeline_result.participants_df.to_dict("records"):
            group = None if row["cluster_id"] is None else int(row["cluster_id"])
            x, y = float(row["x"]), float(row["y"])
            points.append(AnalysisPoint(x=x, y=y, group_ordinal=group))
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

        return AnalysisResult(
            participant_count=len(participant_ids),
            statement_count=len(statement_ids),
            points=tuple(points),
            groups=groups,
            statement_results=tuple(statement_results),
        )
