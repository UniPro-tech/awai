from dataclasses import dataclass
from typing import Literal

VoteValue = Literal["AGREE", "DISAGREE", "PASS"]
ResultKind = Literal[
    "CONSENSUS_AGREE",
    "CONSENSUS_DISAGREE",
    "REPRESENTATIVE_AGREE",
    "REPRESENTATIVE_DISAGREE",
]


@dataclass(frozen=True)
class VoteInput:
    participant_id: str
    statement_id: str
    value: VoteValue


@dataclass(frozen=True)
class AnalysisPoint:
    x: float
    y: float
    group_ordinal: int | None


@dataclass(frozen=True)
class AnalysisGroup:
    ordinal: int
    participant_count: int
    centroid_x: float
    centroid_y: float


@dataclass(frozen=True)
class StatementResult:
    statement_id: str
    group_ordinal: int | None
    kind: ResultKind
    score: float
    rank: int


@dataclass(frozen=True)
class AnalysisResult:
    participant_count: int
    statement_count: int
    points: tuple[AnalysisPoint, ...]
    groups: tuple[AnalysisGroup, ...]
    statement_results: tuple[StatementResult, ...]
