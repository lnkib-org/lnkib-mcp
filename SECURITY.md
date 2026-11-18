# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Email **security@lnkib.com** (or the contact listed on https://lnkib.com) with a description and steps to reproduce. We aim to acknowledge reports within 3 business days.

## Scope and handling of secrets

- This server runs on your machine and sends your API key only to the configured `LNKIB_API_BASE` (default `https://api.lnkib.com`).
- It does not log API keys or API responses.
- If you believe a key leaked, revoke it in lnkib (Settings → API Keys) right away.
