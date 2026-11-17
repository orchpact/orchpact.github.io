# Contributing

Use Python 3.11–3.13, uv and native HTML/CSS/JavaScript. Run the build, link checker, Python tests and Node tests described in README.md. Technical reference docs originate in the main repository and are imported from an explicit clean commit; do not edit managed snapshots.

Use Conventional Commits: `type(scope): description`, at most 72 characters, with optional scope. Allowed types: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test.

Examples: `docs: clarify workflow installation`, `fix(search): preserve keyboard focus`, `ci: validate documentation links`. Keep each commit focused on one coherent change. PR titles follow the same format for squash merges. Enable the hook with `git config core.hooksPath .githooks`; validate a range using `python3 scripts/check_commits.py --base BASE_SHA --head HEAD`.

Preserve the paper and forest-green design, accessibility and mobile navigation. Never connect this static website to a user instance or commit secrets and runtime data. The project uses MIT; preserve third-party notices.
