import { TopicResponseSchema, type TopicResponse } from "@private-polis/contracts";

export interface TaxonomyRecord {
  id: string;
  name: string;
}

export interface TopicRecord {
  id: string;
  createdByUserId: string;
  ownerUserId: string;
  title: string;
  description: string;
  authorVisibility: "IDENTIFIED" | "ANONYMOUS";
  authorDisplayName: string;
  statementIdentityPolicy: "OPTIONAL" | "ANONYMOUS_REQUIRED" | "IDENTIFIED_REQUIRED";
  status: "DRAFT" | "OPEN" | "CLOSED" | "ARCHIVED";
  category: TaxonomyRecord | null;
  tags: TaxonomyRecord[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export function presentTopic(topic: TopicRecord): TopicResponse {
  return TopicResponseSchema.parse({
    id: topic.id,
    title: topic.title,
    description: topic.description,
    author: {
      visibility: topic.authorVisibility,
      displayName: topic.authorVisibility === "IDENTIFIED" ? topic.authorDisplayName : null,
    },
    statementIdentityPolicy: topic.statementIdentityPolicy,
    status: topic.status,
    category: topic.category,
    tags: topic.tags,
    createdAt: topic.createdAt.toISOString(),
    updatedAt: topic.updatedAt.toISOString(),
  });
}
