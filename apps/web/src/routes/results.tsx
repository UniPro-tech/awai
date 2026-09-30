import type { AnalysisRunResponse } from "@private-polis/contracts";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { OpinionMap } from "../features/analysis/opinion-map";
import { groupColors } from "../features/analysis/palette";
import { VoteDistribution } from "../features/analysis/vote-distribution";
import { AuthGate } from "../features/auth/auth-gate";
import { getLatestAnalysis, listAnalysisRuns } from "../features/analysis/api";
import { downloadAnalysisPdf } from "../features/analysis/pdf";
import { getTopic } from "../features/topics/api";
import { errorMessage } from "../lib/error-message";
import "./results-analysis.css";

function FindingsList({
  results,
}: {
  results: AnalysisRunResponse["statementResults"];
}) {
  const { t } = useTranslation();
  if (results.length === 0) return <p>{t("analysis.noRanked")}</p>;
  return (
    <ol className="analysis-findings">
      {results.map((result) => (
        <li className="panel" key={`${result.kind}-${result.statement.id}`}>
          <p className="eyebrow">
            {result.kind.endsWith("_AGREE")
              ? t("analysis.agreeFinding")
              : t("analysis.disagreeFinding")}
          </p>
          <p>{result.statement.body}</p>
          <p className="meta">
            {t("analysis.rank", {
              rank: result.rank,
              score: result.score.toFixed(3),
            })}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function ResultsPage() {
  const { t, i18n } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
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

  async function downloadReport() {
    if (!analysis.data || !topic.data) return;
    setIsDownloading(true);
    setDownloadFailed(false);
    try {
      await downloadAnalysisPdf({
        topicTitle: topic.data.title,
        analysis: analysis.data,
        labels: {
          title: t("analysis.reportTitle"),
          generatedAt: t("analysis.generatedAt", {
            date: new Intl.DateTimeFormat(i18n.language, {
              dateStyle: "long",
              timeStyle: "short",
            }).format(new Date()),
          }),
          participants: t("analysis.participants"),
          statements: t("analysis.statements"),
          groups: t("analysis.groups"),
          map: t("analysis.map"),
          commonOpinions: t("analysis.commonOpinions"),
          groupOpinions: (number) => t("analysis.groupOpinions", { number }),
          agree: t("analysis.agreeFinding"),
          disagree: t("analysis.disagreeFinding"),
          score: (value) => t("analysis.pdfScore", { score: value }),
          noRanked: t("analysis.noRanked"),
          privacy: t("analysis.reportPrivacy"),
        },
      });
    } catch {
      setDownloadFailed(true);
    } finally {
      setIsDownloading(false);
    }
  }

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
          <button
            type="button"
            onClick={downloadReport}
            disabled={!analysis.data || !topic.data || isDownloading}
          >
            {isDownloading ? t("analysis.preparingPdf") : t("analysis.downloadPdf")}
          </button>
          {downloadFailed ? <p role="alert">{t("analysis.pdfFailed")}</p> : null}
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
              <OpinionMap
                points={analysis.data.points}
                groups={analysis.data.groups}
                viewerPoint={analysis.data.viewerPoint}
              />
            </section>
            <section
              className="analysis-section"
              aria-labelledby="vote-distributions-heading"
            >
              <p className="eyebrow">{t("analysis.voteDistributionsEyebrow")}</p>
              <h2 id="vote-distributions-heading">
                {t("analysis.voteDistributions")}
              </h2>
              <p>{t("analysis.voteDistributionsHelp")}</p>
              {analysis.data.voteDistributions.length > 0 ? (
                <div className="vote-distributions">
                  {analysis.data.voteDistributions.map((distribution) => (
                    <VoteDistribution
                      distribution={distribution}
                      key={distribution.statement.id}
                    />
                  ))}
                </div>
              ) : (
                <p className="panel empty-state">{t("analysis.noVoteDistributions")}</p>
              )}
            </section>
            <section className="analysis-section" aria-labelledby="common-opinions-heading">
              <p className="eyebrow">{t("analysis.findings")}</p>
              <h2 id="common-opinions-heading">{t("analysis.commonOpinions")}</h2>
              <p>{t("analysis.commonOpinionsHelp")}</p>
              <FindingsList
                results={analysis.data.statementResults.filter(
                  (result) => result.groupOrdinal === null,
                )}
              />
            </section>
            {analysis.data.groups.map((group) => (
              <section
                className="analysis-section"
                aria-labelledby={`group-${group.ordinal}-opinions-heading`}
                key={group.ordinal}
              >
                <div className="analysis-group-heading">
                  <span
                    aria-hidden="true"
                    style={{
                      background: groupColors[group.ordinal % groupColors.length],
                    }}
                  />
                  <div>
                    <p className="eyebrow">
                      {t("analysis.group", {
                        number: group.ordinal + 1,
                        count: group.participantCount,
                      })}
                    </p>
                    <h2 id={`group-${group.ordinal}-opinions-heading`}>
                      {t("analysis.groupOpinions", { number: group.ordinal + 1 })}
                    </h2>
                  </div>
                </div>
                <p>{t("analysis.groupOpinionsHelp")}</p>
                <FindingsList
                  results={analysis.data.statementResults.filter(
                    (result) => result.groupOrdinal === group.ordinal,
                  )}
                />
              </section>
            ))}
            <p className="meta">
              {t("analysis.runs", { count: runs.data?.items.length ?? 1, version: analysis.data.algorithmVersion })}
            </p>
          </>
        ) : null}
      </main>
    </AuthGate>
  );
}
