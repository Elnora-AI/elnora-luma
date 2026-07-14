# Contributing to `elnora-luma`

Thanks for your interest. This project is open to community contributions.

## Bug Reports and Feature Requests

Open an issue using the appropriate template:

- **Bug report** — something doesn't work, or works differently than documented
- **Feature request** — a new command, skill, or capability you'd find useful

Please search existing issues first so we can avoid duplicates.

## Pull Requests

PRs are welcome from anyone. The Elnora engineering team reviews and merges.

Before opening a PR:

1. Open an issue first if the change is non-trivial — saves you time if we'd prefer a different approach.
2. Fork the repo, create a feature branch off `main`.
3. Match the existing style.
4. Add tests (Vitest) for new behavior.
5. Use [Conventional Commits](https://www.conventionalcommits.org/) in your PR title — Release Please uses these to generate version bumps and changelog entries.
6. Run the full local check before pushing:
   ```bash
   npm install
   npm run verify   # typecheck + build + test + committed-bundle freshness
   ```
7. Open the PR against `main`. CI runs automatically; an Elnora maintainer will review.

## A note on the committed bundle and spec

There is no hand-written command list. The command tree is built at runtime from
Luma's OpenAPI spec (`src/spec/openapi.json`) by `src/spec.ts` + `src/main.ts`;
refresh the spec with `luma spec refresh`. `dist/` is **committed** so the plugin
works with zero install steps — any change to `src/` or the spec must be
accompanied by a rebuild (`npm run build`), and CI fails if `dist/` drifts.

## Conventional Commit Types

| Prefix | Version bump | When to use |
|--------|--------------|-------------|
| `fix:` | Patch | Bug fixes |
| `feat:` | Minor | New features |
| `feat!:` or `BREAKING CHANGE:` | Major | Breaking changes |
| `chore:`, `docs:`, `style:`, `refactor:`, `test:`, `ci:`, `build:`, `perf:`, `revert:` | None | Maintenance, no release |

## Security Issues

**Do not open a public issue for security vulnerabilities.** Use one of the private channels listed in [SECURITY.md](SECURITY.md).

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to uphold it.
