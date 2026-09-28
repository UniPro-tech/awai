import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { AuthGate } from "../features/auth/auth-gate";
import { listTopics } from "../features/topics/api";
import { errorMessage } from "../lib/error-message";

function TopicsPage() {
  const { t } = useTranslation();
  const topics = useQuery({ queryKey: ["topics"], queryFn: listTopics });

  return (
    <AuthGate>
      <main className="shell">
        <header className="page-heading">
          <div>
            <p className="eyebrow">{t("topics.eyebrow")}</p>
            <h1>{t("topics.title")}</h1>
            <p>{t("topics.subtitle")}</p>
          </div>
          <Button asChild>
            <Link to="/topics/new">
              <Plus aria-hidden="true" size={18} /> {t("topics.start")}
            </Link>
          </Button>
        </header>
        <section aria-labelledby="topic-list-heading">
          <h2 id="topic-list-heading">{t("topics.listHeading")}</h2>
          {topics.isPending ? <p>{t("topics.loading")}</p> : null}
          {topics.error ? (
            <p role="alert">{errorMessage(topics.error, t)}</p>
          ) : null}
          {topics.data?.items.length === 0 ? (
            <div className="panel empty-state">
              <h2>{t("topics.emptyTitle")}</h2>
              <p>{t("topics.emptyBody")}</p>
            </div>
          ) : null}
          <ul className="topic-list">
            {topics.data?.items.map((topic) => (
              <li key={topic.id} className="panel">
                <h2>
                  <Link to="/topics/$topicId" params={{ topicId: topic.id }}>
                    {topic.title}
                  </Link>
                </h2>
                <p>{topic.description || t("common.noDescription")}</p>
                {topic.category ? (
                  <p className="meta">
                    {t("topics.category")}: {topic.category.name}
                  </p>
                ) : null}
                {topic.tags.length > 0 ? (
                  <div className="tag-list">
                    {topic.tags.map((tag) => (
                      <span key={tag.id}>{tag.name}</span>
                    ))}
                  </div>
                ) : null}
                <span>
                  {topic.author.visibility === "ANONYMOUS"
                    ? t("topics.anonymousAuthor")
                    : topic.author.displayName}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </AuthGate>
  );
}

export const Route = createFileRoute("/topics/")({ component: TopicsPage });
