# Changelog

All notable changes to Awai are documented in this file. The project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0](https://github.com/UniPro-tech/awai/compare/v0.8.1...v0.9.0) (2026-09-30)


### Features

* 分析ページに賛否割合グラフを追加 ([09ba376](https://github.com/UniPro-tech/awai/commit/09ba3767e828dc55337ecb70d407ee7682655b0a))
* 分析ページに賛否割合グラフを追加 ([2f92824](https://github.com/UniPro-tech/awai/commit/2f92824e84e88b4ed3af66455751c7d46ef4c7da))
* 動画バーのアニメーションを減速モーション設定に対応 ([fd59304](https://github.com/UniPro-tech/awai/commit/fd59304d4f1218e0d750dd12cd47971899b4b8f3))
* 賛否割合の分析スナップショットを追加 ([a8eb67a](https://github.com/UniPro-tech/awai/commit/a8eb67ab913e6e7984bd7fc8ceb8be94aa08f6fc))

## [0.8.1](https://github.com/UniPro-tech/awai/compare/v0.8.0...v0.8.1) (2026-09-30)


### Bug Fixes

* **styles:** improve combobox-option UX ([0ebce00](https://github.com/UniPro-tech/awai/commit/0ebce0007b5c896987060ce314ccffbf6d9cc720))

## [0.8.0](https://github.com/UniPro-tech/awai/compare/v0.7.0...v0.8.0) (2026-09-30)


### Features

* モデレーターによる意見削除を追加 ([99f9b2c](https://github.com/UniPro-tech/awai/commit/99f9b2c966da84c5994b93c5ee5d781cd63f01a6))
* 監査ログ閲覧APIを追加 ([b97e686](https://github.com/UniPro-tech/awai/commit/b97e686693598a6f71251263a0399b6c9024c39e))
* 管理画面に監査ログ一覧を追加 ([6adf866](https://github.com/UniPro-tech/awai/commit/6adf8662d98cbfa45bc538ba9a9f6c28317347d3))

## [0.7.0](https://github.com/UniPro-tech/awai/compare/v0.6.0...v0.7.0) (2026-09-30)


### Features

* 意見入力形式のガイドを追加 ([9b240ad](https://github.com/UniPro-tech/awai/commit/9b240adeaaacf0f6efcc34067d5555be3eec470f))

## [0.6.0](https://github.com/UniPro-tech/awai/compare/v0.5.0...v0.6.0) (2026-09-30)


### Features

* ヘッダーにベータ版告知を追加 ([78931f2](https://github.com/UniPro-tech/awai/commit/78931f2ea064b0a777d901cece52f8a2c6d7aa3f))
* 固定された投稿者表示ポリシーを明示 ([8714543](https://github.com/UniPro-tech/awai/commit/8714543e23a3f722e575e1a136fac3d5b08d7323))

## [0.5.0](https://github.com/UniPro-tech/awai/compare/v0.4.0...v0.5.0) (2026-09-30)


### Features

* サイドバーにフィードバック導線を追加 ([fca54ac](https://github.com/UniPro-tech/awai/commit/fca54ac455255acf9fbe10518e2f2a3756e1cd26))


### Bug Fixes

* 「パス」に関する説明と語順の最適化 ([f13aafc](https://github.com/UniPro-tech/awai/commit/f13aafcbf82d1716b9300d11e0d30d1113af3aae))

## [0.4.0](https://github.com/UniPro-tech/awai/compare/v0.3.0...v0.4.0) (2026-09-30)


### Features

* 初回オンボーディングを追加 ([215b613](https://github.com/UniPro-tech/awai/commit/215b613761dd756b961ed10b7601aa64c54e127e))

## [0.3.0](https://github.com/UniPro-tech/awai/compare/v0.2.7...v0.3.0) (2026-09-30)


### Features

* カテゴリ作成を管理者に制限可能にする ([e45eb9f](https://github.com/UniPro-tech/awai/commit/e45eb9f3f613a3a8193e5f1de2db60ab1a59a61a))
* カテゴリ別のトピック検索を追加 ([e8ab5ae](https://github.com/UniPro-tech/awai/commit/e8ab5ae118e63d6ff56a8f3930af795da8592ed1))
* タグ別のトピック検索を追加 ([3de407b](https://github.com/UniPro-tech/awai/commit/3de407bc8e51539a50372029f5b50aaa75516102))

## 0.1.0 - 2026-09-28

### Added

- Private authenticated communities with local username/password, OIDC, and SAML authentication through Better Auth.
- Topic, anonymous or identified statement, and agree/disagree/pass vote workflows with Zod contracts and a typed Hono RPC client.
- PostgreSQL persistence, explicit Drizzle migrations, logical deletion, audit logs, global administrator management, topic ownership, categories, and tags.
- PostgreSQL-backed debounced analysis jobs and a Python Red Dwarf worker producing PCA coordinates, opinion groups, representative statements, and consensus statements without an LLM.
- Privacy-safe analysis and aggregate vote APIs plus React/TanStack Query result visualization.
- File-based TanStack Router screens, Tailwind CSS, source-owned shadcn/ui components, profile and role-aware administration screens.
- Docker Compose deployment with Caddy and an official Helm chart supporting external or optional bundled PostgreSQL, Ingress, Gateway API, network policies, autoscaling, and disruption budgets.
- Fixed-window API limits, exact-Origin checks for cookie-authenticated mutations, security headers, shared API errors, health checks, and documented security/privacy models.
- TypeScript, Python, PostgreSQL integration, browser, container, and Helm CI coverage.

### Security

- Raw votes are never returned through member, topic-owner, or administrator APIs.
- Anonymous topic and statement presenters strip internal author identity for every caller.
- Persisted analysis points have no participant or user mapping.
