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
RUN groupadd --gid 10001 privatepolis \
    && useradd --uid 10001 --gid privatepolis --no-create-home --shell /usr/sbin/nologin privatepolis
WORKDIR /app
COPY --from=build --chown=10001:10001 /app/.venv /app/.venv

ENV PATH=/app/.venv/bin:$PATH \
    PYTHONUNBUFFERED=1

USER 10001:10001
CMD ["python", "-m", "private_polis_analysis.worker"]
