import type { AnalysisPoint } from "@private-polis/contracts";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AuthGate } from "../features/auth/auth-gate";
import { getLatestAnalysis, listAnalysisRuns } from "../features/analysis/api";
import { getTopic } from "../features/topics/api";
import { errorMessage } from "../lib/error-message";

const groupColors = ["#2a7f62", "#c2673d", "#5367a5", "#9a5a98", "#a17b24"];

function ScatterPlot({ points }: { points: AnalysisPoint[] }) {
  const { t } = useTranslation();
  if (points.length === 0) return <p>{t("analysis.noGeometry")}</p>;
  const valuesX = points.map((point) => point.x);
  const valuesY = points.map((point) => point.y);
  const minX = Math.min(...valuesX);
  const maxX = Math.max(...valuesX);
  const minY = Math.min(...valuesY);
  const maxY = Math.max(...valuesY);
  const scale = (value: number, min: number, max: number) =>
    max === min ? 150 : 24 + ((value - min) / (max - min)) * 252;

  return (
    <svg className="analysis-plot" viewBox="0 0 300 300" role="img">
      <title>{t("analysis.mapTitle")}</title>
      <desc>{t("analysis.mapDescription")}</desc>
      <line x1="24" y1="150" x2="276" y2="150" />
      <line x1="150" y1="24" x2="150" y2="276" />
      {points.map((point, index) => (
        <circle
          key={`${point.x}-${point.y}-${index}`}
          cx={scale(point.x, minX, maxX)}
          cy={300 - scale(point.y, minY, maxY)}
          r="7"
          fill={point.groupOrdinal === null ? "#8b968e" : groupColors[point.groupOrdinal % groupColors.length]}
        />
      ))}
    </svg>
  );
}

function resultLabel(kind: string, groupOrdinal: number | null, t: ReturnType<typeof useTranslation>["t"]) {
  if (kind === "CONSENSUS_AGREE") return t("analysis.consensusAgree");
  if (kind === "CONSENSUS_DISAGREE") return t("analysis.consensusDisagree");
  return t(kind.endsWith("AGREE") ? "analysis.representativeAgree" : "analysis.representativeDisagree", { number: (groupOrdinal ?? 0) + 1 });
}

export function ResultsPage() {
  const { t } = useTranslation();
  const { topicId } = useParams({ from: "/topics/$topicId/results" });
  const topic = useQuery({ queryKey: ["topic", topicId], queryFn: () => getTopic(topicId) });
  const analysis = useQuery({
    queryKey: ["analysis", topicId, "latest"],
    queryFn: () => getLatestAnalysis(topicId),
    retry: false,
  });
  const runs = useQuery({
    queryKey: ["analysis", topicId, "runs"],
    queryFn: () => listAnalysisRuns(topicId),
  });

  return (
    <AuthGate>
      <main className="shell">
        <nav className="breadcrumb">
          <Link to="/topics">{t("common.topics")}</Link> / <Link to="/topics/$topicId" params={{ topicId }}>{t("common.discussion")}</Link> / {t("common.results")}
        </nav>
        <header>
          <p className="eyebrow">{t("analysis.eyebrow")}</p>
          <h1>{topic.data?.title ?? t("common.results")}</h1>
          <p>{t("analysis.privacy")}</p>
        </header>

        {analysis.isPending ? <p>{t("analysis.waiting")}</p> : null}
        {analysis.error?.name === "ANALYSIS_NOT_FOUND" ? (
          <section className="panel empty-state">
            <h2>{t("analysis.insufficientTitle")}</h2>
            <p>{t("analysis.insufficientBody")}</p>
          </section>
        ) : null}
        {analysis.error && analysis.error.name !== "ANALYSIS_NOT_FOUND" ? (
          <p role="alert">{errorMessage(analysis.error, t)}</p>
        ) : null}

        {analysis.data ? (
          <>
            <section className="analysis-summary">
              <div className="panel metric"><strong>{analysis.data.participantCount}</strong><span>{t("analysis.participants")}</span></div>
              <div className="panel metric"><strong>{analysis.data.statementCount}</strong><span>{t("analysis.statements")}</span></div>
              <div className="panel metric"><strong>{analysis.data.groups.length}</strong><span>{t("analysis.groups")}</span></div>
            </section>
            <section className="panel" aria-labelledby="map-heading">
              <h2 id="map-heading">{t("analysis.map")}</h2>
              <ScatterPlot points={analysis.data.points} />
              <ul className="group-legend">
                {analysis.data.groups.map((group) => (
                  <li key={group.ordinal}>
                    <span style={{ background: groupColors[group.ordinal % groupColors.length] }} />
                    {t("analysis.group", { number: group.ordinal + 1, count: group.participantCount })}
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="findings-heading">
              <h2 id="findings-heading">{t("analysis.findings")}</h2>
              {analysis.data.statementResults.length === 0 ? <p>{t("analysis.noRanked")}</p> : null}
              <ul className="topic-list">
                {analysis.data.statementResults.map((result) => (
                  <li className="panel" key={`${result.kind}-${result.groupOrdinal}-${result.statement.id}`}>
                    <p className="eyebrow">{resultLabel(result.kind, result.groupOrdinal, t)}</p>
                    <p>{result.statement.body}</p>
                    <p className="meta">{t("analysis.rank", { rank: result.rank, score: result.score.toFixed(3) })}</p>
                  </li>
                ))}
              </ul>
            </section>
            <p className="meta">
              {t("analysis.runs", { count: runs.data?.items.length ?? 1, version: analysis.data.algorithmVersion })}
            </p>
          </>
        ) : null}
      </main>
    </AuthGate>
  );
}
