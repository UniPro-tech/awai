from typing import cast
from unittest.mock import Mock
from uuid import uuid4

from private_polis_analysis.engine import AnalysisEngine
from private_polis_analysis.models import AnalysisResult
from private_polis_analysis.repository import AnalysisJob, AnalysisRepository
from private_polis_analysis.worker import run_once


def empty_result() -> AnalysisResult:
    return AnalysisResult(
        participant_count=0,
        statement_count=0,
        points=(),
        groups=(),
        statement_results=(),
    )


def test_run_once_returns_false_when_queue_is_empty() -> None:
    repository = Mock(spec=AnalysisRepository)
    repository.claim_next_job.return_value = None

    assert run_once(repository, Mock(spec=AnalysisEngine)) is False


def test_run_once_completes_claimed_job() -> None:
    repository = Mock(spec=AnalysisRepository)
    engine = Mock(spec=AnalysisEngine)
    job = AnalysisJob(id=uuid4(), topic_id=uuid4())
    repository.claim_next_job.return_value = job
    repository.load_votes.return_value = []
    engine.analyze.return_value = empty_result()

    assert run_once(cast(AnalysisRepository, repository), cast(AnalysisEngine, engine)) is True
    repository.complete_job.assert_called_once_with(job, empty_result())


def test_run_once_records_failure_without_stopping_worker() -> None:
    repository = Mock(spec=AnalysisRepository)
    engine = Mock(spec=AnalysisEngine)
    job = AnalysisJob(id=uuid4(), topic_id=uuid4())
    repository.claim_next_job.return_value = job
    repository.load_votes.return_value = []
    engine.analyze.side_effect = RuntimeError("calculation failed")

    assert run_once(cast(AnalysisRepository, repository), cast(AnalysisEngine, engine)) is True
    repository.fail_job.assert_called_once_with(job, "calculation failed")
