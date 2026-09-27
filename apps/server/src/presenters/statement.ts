import { StatementResponseSchema, type StatementResponse } from "@private-polis/contracts";

export interface StatementRecord {
  id: string;
  topicId: string;
  authorUserId: string;
  authorDisplayName: string;
  body: string;
  authorVisibility: "IDENTIFIED" | "ANONYMOUS";
  createdAt: Date;
  updatedAt: Date;
}

export function presentStatement(statement: StatementRecord): StatementResponse {
  return StatementResponseSchema.parse({
    id: statement.id,
    topicId: statement.topicId,
    body: statement.body,
    author: {
      visibility: statement.authorVisibility,
      displayName:
        statement.authorVisibility === "IDENTIFIED" ? statement.authorDisplayName : null,
    },
    createdAt: statement.createdAt.toISOString(),
    updatedAt: statement.updatedAt.toISOString(),
  });
}
