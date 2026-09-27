import type { AnalysisPoint } from "@private-polis/contracts";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { AuthGate } from "../features/auth/auth-gate";
import { getLatestAnalysis, listAnalysisRuns } from "../features/analysis/api";
import { getTopic } from "../features/topics/api";

const groupColors = ["#2a7f62", "#c2673d", "#5367a5", "#9a5a98", "#a17b24"];

function ScatterPlot({ points }: { points: AnalysisPoint[] }) {
  if (points.length === 0) return <p>No participant geometry was produced.</p>;
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
      <title>Anonymous participant opinion map</title>
      <desc>Each dot is an anonymous participant, colored by opinion group.</desc>
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

function resultLabel(kind: string, groupOrdinal: number | null) {
  if (kind === "CONSENSUS_AGREE") return "Consensus · agree";
  if (kind === "CONSENSUS_DISAGREE") return "Consensus · disagree";
  const direction = kind.endsWith("AGREE") ? "agree" : "disagree";
  return `Group ${(groupOrdinal ?? 0) + 1} · representative ${direction}`;
}

export function ResultsPage() {
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
          <Link to="/topics">Topics</Link> / <Link to="/topics/$topicId" params={{ topicId }}>Discussion</Link> / Results
        </nav>
        <header>
          <p className="eyebrow">Analysis results</p>
          <h1>{topic.data?.title ?? "Results"}</h1>
          <p>Participant positions are anonymous and cannot be traced back to accounts.</p>
        </header>

        {analysis.isPending ? <p>Waiting for the latest analysis…</p> : null}
        {analysis.error?.name === "ANALYSIS_NOT_FOUND" ? (
          <section className="panel empty-state">
            <h2>Not enough data yet</h2>
            <p>Results appear after at least two participants have voted on at least two statements.</p>
          </section>
        ) : null}
        {analysis.error && analysis.error.name !== "ANALYSIS_NOT_FOUND" ? (
          <p role="alert">{analysis.error.message}</p>
        ) : null}

        {analysis.data ? (
          <>
            <section className="analysis-summary">
              <div className="panel metric"><strong>{analysis.data.participantCount}</strong><span>Participants</span></div>
              <div className="panel metric"><strong>{analysis.data.statementCount}</strong><span>Statements</span></div>
              <div className="panel metric"><strong>{analysis.data.groups.length}</strong><span>Opinion groups</span></div>
            </section>
            <section className="panel" aria-labelledby="map-heading">
              <h2 id="map-heading">Opinion map</h2>
              <ScatterPlot points={analysis.data.points} />
              <ul className="group-legend">
                {analysis.data.groups.map((group) => (
                  <li key={group.ordinal}>
                    <span style={{ background: groupColors[group.ordinal % groupColors.length] }} />
                    Group {group.ordinal + 1}: {group.participantCount} participants
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="findings-heading">
              <h2 id="findings-heading">Key statements</h2>
              {analysis.data.statementResults.length === 0 ? <p>No ranked statements were produced.</p> : null}
              <ul className="topic-list">
                {analysis.data.statementResults.map((result) => (
                  <li className="panel" key={`${result.kind}-${result.groupOrdinal}-${result.statement.id}`}>
                    <p className="eyebrow">{resultLabel(result.kind, result.groupOrdinal)}</p>
                    <p>{result.statement.body}</p>
                    <p className="meta">Rank {result.rank} · score {result.score.toFixed(3)}</p>
                  </li>
                ))}
              </ul>
            </section>
            <p className="meta">
              {runs.data?.items.length ?? 1} analysis run{(runs.data?.items.length ?? 1) === 1 ? "" : "s"} recorded · {analysis.data.algorithmVersion}
            </p>
          </>
        ) : null}
      </main>
    </AuthGate>
  );
}
