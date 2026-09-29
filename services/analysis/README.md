# Awai analysis worker

The worker claims due jobs from PostgreSQL with `FOR UPDATE SKIP LOCKED`, loads raw votes inside the worker boundary, runs the Red Dwarf PCA/K-means pipeline, and persists privacy-safe snapshots.

Participant identifiers exist only while a job is running. Persisted `analysis.points` rows contain coordinates and an optional group identifier, never a user identifier or a reversible participant mapping.

## Development

```sh
uv sync --dev
uv run ruff check .
uv run mypy
uv run pytest
```

Run the worker with `DATABASE_URL` set:

```sh
uv run python -m private_polis_analysis.worker
```

Red Dwarf `0.4.0` is pinned to keep statistical outputs reproducible. Its released API currently provides the classic Polis pipeline behind the local `AnalysisEngine` adapter. The adapter is the only module that may depend on Red Dwarf internals, allowing a future Agora pipeline release to be adopted without changing job persistence or public APIs.

Automatic clustering requires at least three participants, two statements, and two distinct participant vote patterns. The worker limits the candidate group count to the smallest of five, the participant count minus one, and the number of distinct vote patterns. This keeps silhouette scoring valid for small datasets instead of attempting impossible cluster counts.
