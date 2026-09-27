import type { Database } from "../db/client.js";
import {
  createMemoryAnalysisQueue,
  createPostgresAnalysisQueue,
} from "./analysis-queue.js";
import {
  createMemoryStatementService,
  createPostgresStatementService,
  type StatementService,
} from "./statement-service.js";
import {
  createMemoryTopicService,
  createPostgresTopicService,
  type TopicService,
} from "./topic-service.js";
import {
  createMemoryVoteService,
  createPostgresVoteService,
  type VoteService,
} from "./vote-service.js";

export interface ApplicationServices {
  topics: TopicService;
  statements: StatementService;
  votes: VoteService;
}

export function createPostgresServices(database: Database): ApplicationServices {
  const analysisQueue = createPostgresAnalysisQueue(database);
  const topicService = createPostgresTopicService(database);
  return {
    topics: topicService,
    statements: createPostgresStatementService(database, topicService, analysisQueue),
    votes: createPostgresVoteService(database, analysisQueue),
  };
}

export function createMemoryServices(): ApplicationServices {
  const analysisQueue = createMemoryAnalysisQueue();
  const topicService = createMemoryTopicService();
  return {
    topics: topicService,
    statements: createMemoryStatementService(topicService, analysisQueue),
    votes: createMemoryVoteService(analysisQueue),
  };
}
