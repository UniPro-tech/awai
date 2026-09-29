import type { AnalysisRunResponse } from "@private-polis/contracts";
import { describe, expect, it } from "vitest";
import { estimateViewerPoint } from "./analysis-service.js";

const statement = {
  id: "00000000-0000-4000-8000-000000000101",
  topicId: "00000000-0000-4000-8000-000000000201",
  body: "Shared statement",
  author: { visibility: "ANONYMOUS" as const, displayName: null },
  createdAt: "2026-09-29T00:00:00.000Z",
  updatedAt: "2026-09-29T00:00:00.000Z",
};

const groups: AnalysisRunResponse["groups"] = [
  { ordinal: 0, participantCount: 4, centroid: { x: -1, y: 0 } },
  { ordinal: 1, participantCount: 4, centroid: { x: 1, y: 0 } },
];

describe("estimateViewerPoint", () => {
  it("places the viewer nearer the group whose representative votes match", () => {
    const results: AnalysisRunResponse["statementResults"] = [
      {
        statement,
        groupOrdinal: 0,
        kind: "REPRESENTATIVE_AGREE",
        score: 1,
        rank: 1,
      },
      {
        statement,
        groupOrdinal: 1,
        kind: "REPRESENTATIVE_DISAGREE",
        score: 1,
        rank: 1,
      },
    ];

    const point = estimateViewerPoint(groups, results, [
      { statementId: statement.id, value: "AGREE" },
    ]);

    expect(point?.groupOrdinal).toBe(0);
    expect(point?.x).toBeLessThan(-0.7);
    expect(point?.y).toBe(0);
  });

  it("returns no estimate until a directional vote overlaps a group result", () => {
    expect(estimateViewerPoint(groups, [], [])).toBeNull();
  });
});
