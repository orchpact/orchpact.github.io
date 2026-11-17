# Security

Do not include credentials, sessions, user documents, production databases or provider receipts in public reports. Reproduce issues in a fresh isolated instance with synthetic data. Provide affected version, minimal steps and the authorization/data boundary involved.

Report suspected vulnerabilities privately to [nfangxu@gmail.com](mailto:nfangxu@gmail.com). Include the affected version, minimal reproduction and the authorization or data boundary involved. Do not send credentials, user documents or production databases. Please coordinate disclosure before publishing exploit details or sensitive operational evidence in a public issue.

Orchpact does not execute generated programs. Keep one process per PostgreSQL database and matching file directory, use a dedicated database owner and a private network/TLS, use explicit HTTPS origins and application keys, and preserve complete stopped-instance backups before upgrades. See docs/ARCHITECTURE.md for current boundaries and limitations.
