import type { AnalysisGroup, AnalysisPoint } from "@private-polis/contracts";
import { useTranslation } from "react-i18next";
import { groupColors } from "./palette";
import "./opinion-map.css";

type OpinionMapProps = {
  points: AnalysisPoint[];
  groups: AnalysisGroup[];
  viewerPoint?: AnalysisPoint | null;
  compact?: boolean;
};

export function OpinionMap({
  points,
  groups,
  viewerPoint = null,
  compact = false,
}: OpinionMapProps) {
  const { t } = useTranslation();
  if (points.length === 0) return <p>{t("analysis.noGeometry")}</p>;

  const plottedPoints = viewerPoint ? [...points, viewerPoint] : points;
  const valuesX = plottedPoints.map((point) => point.x);
  const valuesY = plottedPoints.map((point) => point.y);
  const minX = Math.min(...valuesX);
  const maxX = Math.max(...valuesX);
  const minY = Math.min(...valuesY);
  const maxY = Math.max(...valuesY);
  const scale = (value: number, min: number, max: number) =>
    max === min ? 150 : 24 + ((value - min) / (max - min)) * 252;

  return (
    <div className={compact ? "opinion-map opinion-map--compact" : "opinion-map"}>
      <svg className="analysis-plot" viewBox="0 0 300 300" role="img">
        <title>{t("analysis.mapTitle")}</title>
        <desc>{t("analysis.mapDescription")}</desc>
        <line x1="24" y1="150" x2="276" y2="150" />
        <line x1="150" y1="24" x2="150" y2="276" />
        {points.map((point, index) => (
          <circle
            className="opinion-map__participant"
            key={`${point.x}-${point.y}-${index}`}
            cx={scale(point.x, minX, maxX)}
            cy={300 - scale(point.y, minY, maxY)}
            r="6"
            fill={
              point.groupOrdinal === null
                ? "#8b968e"
                : groupColors[point.groupOrdinal % groupColors.length]
            }
          />
        ))}
        {viewerPoint ? (
          <g
            className="opinion-map__viewer"
            transform={`translate(${scale(viewerPoint.x, minX, maxX)} ${300 - scale(viewerPoint.y, minY, maxY)})`}
          >
            <circle r="12" />
            <circle r="5" />
          </g>
        ) : null}
      </svg>
      <ul className="group-legend">
        {groups.map((group) => (
          <li key={group.ordinal}>
            <span
              style={{ background: groupColors[group.ordinal % groupColors.length] }}
            />
            {t("analysis.group", {
              number: group.ordinal + 1,
              count: group.participantCount,
            })}
          </li>
        ))}
        {viewerPoint ? (
          <li className="opinion-map__viewer-key">
            <span />
            {t("analysis.youAreHere")}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
