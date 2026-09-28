import { createFileRoute } from "@tanstack/react-router";
import { ResultsPage } from "./results";

export const Route = createFileRoute("/topics/$topicId/results")({ component: ResultsPage });
