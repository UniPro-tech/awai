# syntax=docker/dockerfile:1.7

FROM ghcr.io/astral-sh/uv:0.11.22-python3.14-trixie-slim AS build
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
WORKDIR /app

COPY pyproject.toml uv.lock README.md ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project

COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-editable

FROM python:3.14-slim-trixie AS analysis
RUN addgroup --system privatepolis && adduser --system --ingroup privatepolis privatepolis
WORKDIR /app
COPY --from=build --chown=privatepolis:privatepolis /app/.venv /app/.venv

ENV PATH=/app/.venv/bin:$PATH \
    PYTHONUNBUFFERED=1

USER privatepolis
CMD ["python", "-m", "private_polis_analysis.worker"]
