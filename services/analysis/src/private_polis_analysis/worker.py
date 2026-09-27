import logging
import os
import time

from .engine import AnalysisEngine, RedDwarfAnalysisEngine
from .repository import AnalysisRepository

LOGGER = logging.getLogger(__name__)


def run_once(repository: AnalysisRepository, engine: AnalysisEngine) -> bool:
    job = repository.claim_next_job()
    if job is None:
        return False
    try:
        result = engine.analyze(repository.load_votes(job.topic_id))
        repository.complete_job(job, result)
    except Exception as error:
        LOGGER.exception("Analysis job %s failed", job.id)
        repository.fail_job(job, str(error))
    return True


def main() -> None:
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required.")
    repository = AnalysisRepository(database_url)
    engine = RedDwarfAnalysisEngine()
    poll_interval = float(os.environ.get("ANALYSIS_POLL_INTERVAL_SECONDS", "2"))
    while True:
        if not run_once(repository, engine):
            time.sleep(poll_interval)


if __name__ == "__main__":
    main()
