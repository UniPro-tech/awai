from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, cast
from uuid import UUID

import psycopg
from psycopg.rows import dict_row

from .models import AnalysisResult, VoteInput, VoteValue


@dataclass(frozen=True)
class AnalysisJob:
    id: UUID
    topic_id: UUID


class AnalysisRepository:
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url

    @contextmanager
    def _connection(self) -> Iterator[psycopg.Connection[dict[str, Any]]]:
        with psycopg.connect(self._database_url, row_factory=dict_row) as connection:
            yield connection

    def claim_next_job(self) -> AnalysisJob | None:
        with self._connection() as connection, connection.transaction():
            row = connection.execute(
                """
                SELECT id, topic_id
                FROM analysis.jobs
                WHERE status = 'PENDING' AND available_at <= now()
                ORDER BY available_at, created_at
                FOR UPDATE SKIP LOCKED
                LIMIT 1
                """
            ).fetchone()
            if row is None:
                return None
            connection.execute(
                """
                UPDATE analysis.jobs
                SET status = 'RUNNING', locked_at = now(), attempts = attempts + 1,
                    updated_at = now()
                WHERE id = %s
                """,
                (row["id"],),
            )
            return AnalysisJob(id=row["id"], topic_id=row["topic_id"])

    def load_votes(self, topic_id: UUID) -> list[VoteInput]:
        with self._connection() as connection:
            rows = connection.execute(
                """
                SELECT v.user_id, v.statement_id, v.value
                FROM core.votes v
                JOIN core.statements s ON s.id = v.statement_id
                WHERE s.topic_id = %s AND s.deleted_at IS NULL
                """,
                (topic_id,),
            ).fetchall()
        return [
            VoteInput(
                participant_id=str(row["user_id"]),
                statement_id=str(row["statement_id"]),
                value=cast(VoteValue, row["value"]),
            )
            for row in rows
        ]

    def complete_job(self, job: AnalysisJob, result: AnalysisResult) -> UUID:
        with self._connection() as connection, connection.transaction():
            run = connection.execute(
                """
                INSERT INTO analysis.runs (
                    topic_id, job_id, status, algorithm_version,
                    participant_count, statement_count, completed_at
                ) VALUES (%s, %s, 'COMPLETED', %s, %s, %s, now())
                RETURNING id
                """,
                (
                    job.topic_id,
                    job.id,
                    "red-dwarf-0.4.0",
                    result.participant_count,
                    result.statement_count,
                ),
            ).fetchone()
            if run is None:
                raise RuntimeError("Analysis run insert did not return an id.")
            run_id = cast(UUID, run["id"])

            group_ids: dict[int, UUID] = {}
            for group in result.groups:
                row = connection.execute(
                    """
                    INSERT INTO analysis.groups (
                        analysis_run_id, ordinal, participant_count, centroid_x, centroid_y
                    ) VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        run_id,
                        group.ordinal,
                        group.participant_count,
                        group.centroid_x,
                        group.centroid_y,
                    ),
                ).fetchone()
                if row is None:
                    raise RuntimeError("Analysis group insert did not return an id.")
                group_ids[group.ordinal] = cast(UUID, row["id"])

            with connection.cursor() as cursor:
                cursor.executemany(
                    """
                    INSERT INTO analysis.points (analysis_run_id, group_id, x, y)
                    VALUES (%s, %s, %s, %s)
                    """,
                    [
                        (
                            run_id,
                            None
                            if point.group_ordinal is None
                            else group_ids[point.group_ordinal],
                            point.x,
                            point.y,
                        )
                        for point in result.points
                    ],
                )
                cursor.executemany(
                    """
                    INSERT INTO analysis.statement_results (
                        analysis_run_id, statement_id, group_id, kind, score, rank
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    [
                        (
                            run_id,
                            statement.statement_id,
                            None
                            if statement.group_ordinal is None
                            else group_ids[statement.group_ordinal],
                            statement.kind,
                            statement.score,
                            statement.rank,
                        )
                        for statement in result.statement_results
                    ],
                )
            connection.execute(
                """
                UPDATE analysis.jobs
                SET status = 'COMPLETED', locked_at = NULL, last_error = NULL, updated_at = now()
                WHERE id = %s
                """,
                (job.id,),
            )
            return run_id

    def fail_job(self, job: AnalysisJob, message: str) -> None:
        with self._connection() as connection:
            connection.execute(
                """
                UPDATE analysis.jobs
                SET status = CASE WHEN attempts >= 3 THEN 'FAILED'::analysis.job_status
                                  ELSE 'PENDING'::analysis.job_status END,
                    available_at = now() + interval '30 seconds',
                    locked_at = NULL,
                    last_error = %s,
                    updated_at = now()
                WHERE id = %s
                """,
                (message[:2_000], job.id),
            )
