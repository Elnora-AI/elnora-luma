## Summary

<!-- What does this PR do? 1-3 bullet points. -->

## PR Title Convention

> **Important:** PR titles must use [Conventional Commits](https://www.conventionalcommits.org/) format.
> Release Please parses the **squash-merge commit message** (which defaults to the PR title) to determine version bumps and changelog entries. A PR merged without a conventional prefix will not trigger a release.

| Prefix | Version bump | Example |
|--------|-------------|---------|
| `fix:` | Patch (0.0.x) | `fix: JSON-parse array flags before dispatch` |
| `feat:` | Minor (0.x.0) | `feat: add admin get-blasts command` |
| `feat!:` or `BREAKING CHANGE:` | Major (x.0.0) | `feat!: rename LUMA_CONFIG_DIR env var` |
| `chore:` | No release | `chore: update dev dependencies` |
| `docs:` | No release | `docs: clarify key resolution order` |
| `style:` | No release | `style: fix formatting` |
| `refactor:` | No release | `refactor: extract output formatting` |
| `test:` | No release | `test: add array-flag coercion cases` |
| `ci:` | No release | `ci: pin actions to commit SHAs` |
| `build:` | No release | `build: drop unused dependency` |

Optional scope: `fix(guests): ...`, `feat(ticketing): ...`

## Testing

- [ ] `npm install` succeeds
- [ ] `npm run verify` passes (typecheck + build + test + committed-`dist/` freshness)
- [ ] `node bin/luma.js --version` and `--help` both work
- [ ] If touching command coverage: tested against a real Luma calendar

## Related Issues

<!-- Link related issues: Fixes #NN, Refs #NN -->
