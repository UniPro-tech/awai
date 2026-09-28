import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { CreatableMultiSelect, CreatableSelect, type SelectOption } from "../components/creatable-select";
import { AuthGate } from "../features/auth/auth-gate";
import { createCategory, createTag, listCategories, listTags } from "../features/taxonomy/api";
import { createTopic } from "../features/topics/api";
import { errorMessage } from "../lib/error-message";

function NewTopicPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [authorVisibility, setAuthorVisibility] = useState<"IDENTIFIED" | "ANONYMOUS">("IDENTIFIED");
  const [statementIdentityPolicy, setStatementIdentityPolicy] = useState<"OPTIONAL" | "ANONYMOUS_REQUIRED" | "IDENTIFIED_REQUIRED">("OPTIONAL");
  const [category, setCategory] = useState<SelectOption | null>(null);
  const [tags, setTags] = useState<SelectOption[]>([]);
  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const availableTags = useQuery({ queryKey: ["tags"], queryFn: listTags });
  const addCategory = useMutation({ mutationFn: createCategory, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["categories"] }) });
  const addTag = useMutation({ mutationFn: createTag, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["tags"] }) });
  const create = useMutation({
    mutationFn: createTopic,
    onSuccess: async (topic) => {
      await queryClient.invalidateQueries({ queryKey: ["topics"] });
      await navigate({ to: "/topics/$topicId", params: { topicId: topic.id } });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate({
      title,
      description,
      authorVisibility,
      statementIdentityPolicy,
      categoryId: category?.id ?? null,
      tags: tags.map((tag) => tag.name),
    });
  }

  return (
    <AuthGate>
      <main className="shell narrow-shell">
        <nav className="breadcrumb"><Link to="/topics">{t("common.topics")}</Link> / {t("common.newTopic")}</nav>
        <header><p className="eyebrow">{t("newTopic.eyebrow")}</p><h1>{t("newTopic.title")}</h1><p>{t("newTopic.subtitle")}</p></header>
        <section className="panel" aria-labelledby="create-topic-heading">
          <h2 id="create-topic-heading">{t("newTopic.details")}</h2>
          <form onSubmit={submit} className="stack">
            <label htmlFor="topic-title">{t("newTopic.titleLabel")}</label>
            <input id="topic-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required autoFocus />
            <label htmlFor="topic-description">{t("newTopic.description")}</label>
            <textarea id="topic-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10000} />
            <label>{t("newTopic.category")}</label>
            <CreatableSelect options={categories.data?.items ?? []} value={category} onChange={setCategory} emptyLabel={t("newTopic.noCategory")} placeholder={t("newTopic.categoryPlaceholder")} createLabel={(name) => t("newTopic.createCategory", { name })} onCreate={(name) => addCategory.mutateAsync(name)} disabled={addCategory.isPending} />
            <label>{t("newTopic.tags")}</label>
            <CreatableMultiSelect options={availableTags.data?.items ?? []} values={tags} onChange={setTags} selectedLabel={t("newTopic.selectedTags")} placeholder={t("newTopic.tagsPlaceholder")} createLabel={(name) => t("newTopic.createTag", { name })} onCreate={(name) => addTag.mutateAsync(name)} disabled={addTag.isPending} />
            <label htmlFor="topic-author-visibility">{t("newTopic.topicAuthor")}</label>
            <select id="topic-author-visibility" value={authorVisibility} onChange={(event) => setAuthorVisibility(event.target.value as typeof authorVisibility)}>
              <option value="IDENTIFIED">{t("common.identified")}</option><option value="ANONYMOUS">{t("common.anonymous")}</option>
            </select>
            <label htmlFor="statement-policy">{t("newTopic.statementPolicy")}</label>
            <select id="statement-policy" value={statementIdentityPolicy} onChange={(event) => setStatementIdentityPolicy(event.target.value as typeof statementIdentityPolicy)}>
              <option value="OPTIONAL">{t("newTopic.chooseIdentity")}</option><option value="ANONYMOUS_REQUIRED">{t("newTopic.anonymousRequired")}</option><option value="IDENTIFIED_REQUIRED">{t("newTopic.identifiedRequired")}</option>
            </select>
            <button type="submit" disabled={create.isPending}>{create.isPending ? t("common.creating") : t("newTopic.submit")}</button>
            {create.error ? <p role="alert">{errorMessage(create.error, t)}</p> : null}
            {addCategory.error ? <p role="alert">{errorMessage(addCategory.error, t)}</p> : null}
            {addTag.error ? <p role="alert">{errorMessage(addTag.error, t)}</p> : null}
          </form>
        </section>
      </main>
    </AuthGate>
  );
}

export const Route = createFileRoute("/topics/new")({ component: NewTopicPage });
