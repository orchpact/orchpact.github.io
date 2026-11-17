# Orchpact website instructions

This independent repository contains the official project and documentation site for https://orchpact.github.io/. It is static HTML/CSS/JavaScript, built with Python-Markdown; no npm, database, runtime API or model credentials are required.

- Keep the existing paper/forest-green design and native JavaScript. Keep pages responsive, accessible, and useful without JavaScript.
- The main source repo is orchpact/orchpact. Technical Markdown snapshots live in content/reference and are managed by scripts/sync_docs.py. Change technical behavior/docs upstream first; do not hand-edit managed snapshots.
- Sync only an explicit clean source checkout. source-docs.json records its commit and file hashes. Never fetch a moving main branch during the build.
- Run uv sync --frozen, uv run python scripts/build.py, uv run python scripts/check.py, uv run python -m unittest discover -s tests and node --check src/assets/docs.js after relevant changes.
- dist is generated and ignored. GitHub Pages builds this repository alone; do not add adjacent checkout dependencies to build or CI.
- Never commit .env, tokens, private keys, user content, runtime data or deployment identities from other hosting providers. Do not connect this website to a user's admin API.
- Use Conventional Commits as described in CONTRIBUTING.md. Keep source links and documentation provenance accurate. Synthetic demos illustrate mechanisms, not real model quality.
