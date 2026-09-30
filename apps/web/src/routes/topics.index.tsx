import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { AuthGate } from "../features/auth/auth-gate";
import { listCategories, listTags } from "../features/taxonomy/api";
import { listTopics } from "../features/topics/api";
import { errorMessage } from "../lib/error-message";

function TopicsPage() {
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState("");
  const [tagId, setTagId] = useState("");
  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const tags = useQuery({ queryKey: ["tags"], queryFn: listTags });
  const topics = useQuery({
    queryKey: ["topics", { categoryId: categoryId || null, tagId: tagId || null }],
    queryFn: () => listTopics({
      ...(categoryId ? { categoryId } : {}),
      ...(tagId ? { tagId } : {}),
    }),
  });
  const hasTaxonomyFilter = categoryId.length > 0 || tagId.length > 0;
  const taxonomyError = categories.error ?? tags.error;

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
          <div className="topic-list-header">
            <h2 id="topic-list-heading">{t("topics.listHeading")}</h2>
            <div className="topic-filters" aria-label={t("topics.filters")}>
              <label className="topic-filter">
                <span>
                  <Search aria-hidden="true" size={16} /> {t("topics.categoryFilter")}
                </span>
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  disabled={categories.isPending || Boolean(categories.error)}
                >
                  <option value="">{t("topics.allCategories")}</option>
                  {categories.data?.items.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label className="topic-filter">
                <span>{t("topics.tagFilter")}</span>
                <select
                  value={tagId}
                  onChange={(event) => setTagId(event.target.value)}
                  disabled={tags.isPending || Boolean(tags.error)}
                >
                  <option value="">{t("topics.allTags")}</option>
                  {tags.data?.items.map((tag) => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          {taxonomyError ? (
            <p role="alert">{errorMessage(taxonomyError, t)}</p>
          ) : null}
          {topics.isPending ? <p>{t("topics.loading")}</p> : null}
          {topics.error ? (
            <p role="alert">{errorMessage(topics.error, t)}</p>
          ) : null}
          {topics.data?.items.length === 0 ? (
            <div className="panel empty-state">
              <h2>{t(hasTaxonomyFilter ? "topics.noFilterResults" : "topics.emptyTitle")}</h2>
              <p>{t(hasTaxonomyFilter ? "topics.noFilterResultsBody" : "topics.emptyBody")}</p>
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
