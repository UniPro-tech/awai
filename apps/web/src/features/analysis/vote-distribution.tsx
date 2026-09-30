import type {
  AnalysisStatementVoteDistribution,
  AnalysisVoteCounts,
} from "@private-polis/contracts";
import { useTranslation } from "react-i18next";
import { groupColors } from "./palette";
import "./vote-distribution.css";

function percentage(count: number, total: number) {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

function VoteBar({
  counts,
  label,
  color,
}: {
  counts: AnalysisVoteCounts;
  label: string;
  color?: string;
}) {
  const { t } = useTranslation();
  const values = [
    { key: "agree", count: counts.agree, className: "vote-bar__agree" },
    { key: "disagree", count: counts.disagree, className: "vote-bar__disagree" },
    { key: "pass", count: counts.pass, className: "vote-bar__pass" },
  ] as const;

  return (
    <div className="vote-breakdown__row">
      <div className="vote-breakdown__label">
        {color ? <span aria-hidden="true" style={{ background: color }} /> : null}
        <strong>{label}</strong>
        <span>{t("analysis.responseCount", { count: counts.total })}</span>
      </div>
      {counts.total > 0 ? (
        <>
          <div
            className="vote-bar"
            role="img"
            aria-label={t("analysis.voteBarLabel", {
              label,
              agree: counts.agree,
              disagree: counts.disagree,
              pass: counts.pass,
            })}
          >
            {values.map((value) => (
              <span
                className={value.className}
                key={value.key}
                style={{ flexGrow: value.count }}
              />
            ))}
          </div>
          <ul className="vote-breakdown__counts" aria-hidden="true">
            {values.map((value) => (
              <li className={value.className} key={value.key}>
                <span />
                {t(`analysis.${value.key}`)} {value.count}（
                {percentage(value.count, counts.total)}%）
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="meta vote-breakdown__empty">{t("analysis.noVotes")}</p>
      )}
    </div>
  );
}

export function VoteDistribution({
  distribution,
}: {
  distribution: AnalysisStatementVoteDistribution;
}) {
  const { t } = useTranslation();

  return (
    <article className="panel vote-breakdown">
      <h3>{distribution.statement.body}</h3>
      <VoteBar counts={distribution.overall} label={t("analysis.everyone")} />
      <div className="vote-breakdown__groups">
        {distribution.groups.map((group) => (
          <VoteBar
            counts={group}
            label={t("analysis.groupShort", { number: group.groupOrdinal + 1 })}
            color={groupColors[group.groupOrdinal % groupColors.length]}
            key={group.groupOrdinal}
          />
        ))}
      </div>
    </article>
  );
}
