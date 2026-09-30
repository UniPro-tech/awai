# Releases

Awai uses Release Please to prepare releases from Conventional Commits. A push to `main` creates or updates one release pull request containing:

- the next semantic version in `package.json` and `.release-please-manifest.json`;
- matching `version` and `appVersion` values in `deploy/helm/private-polis/Chart.yaml`;
- generated release notes in `CHANGELOG.md`.

Merging that pull request creates the corresponding GitHub Release and `vX.Y.Z` tag. The existing tag-triggered CI workflow then publishes the versioned application, migration, and analysis images and the OCI Helm chart. Do not create release tags manually.

## Repository setup

Create a fine-grained personal access token for a release automation account with access to this repository and these repository permissions:

- Contents: read and write
- Issues: read and write
- Pull requests: read and write
- Metadata: read

Store it as the Actions repository secret `RELEASE_PLEASE_TOKEN`. A dedicated token is required because pull requests and tags created with the built-in `GITHUB_TOKEN` do not trigger subsequent GitHub Actions workflows. If organization policy requires it, also allow GitHub Actions to create pull requests under **Settings → Actions → General**.

Branch protection should require the normal CI checks on the release pull request. Merge the release pull request only after those checks pass.

## Version selection

Release Please derives the next version from commit messages:

- `fix:` produces a patch release.
- `feat:` produces a minor release.
- `feat!:`, `fix!:`, or a `BREAKING CHANGE:` footer produces a major release.
- Other Conventional Commit types can appear in release notes but do not normally raise the version by themselves.

The release pull request remains open and is updated as additional releasable commits reach `main`. Merging it is the explicit approval to publish; version files and release notes should not be edited manually during normal releases.
