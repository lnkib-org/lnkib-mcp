# @lnkib/mcp

[MCP](https://modelcontextprotocol.io) server for [lnkib](https://lnkib.com). Let your own AI assistant (Claude, Cursor, …) build your Link-in-Bio, read your bookings and add manual bookings.

- Link-in-Bio and bookings do **not** need an Instagram connection.
- You pay your AI provider for model usage. lnkib only provides the connection.
- This server only calls the public lnkib REST API ([OpenAPI spec](https://api.lnkib.com/api/v1/openapi.json)) with the API key you give it.

> **Status:** published on npm as `@lnkib/mcp`.

## Quick start

1. In lnkib, open **Settings → API Keys** and issue a key. Start with the **Read-only** preset. Choose **Read + draft writes** only if you want the AI to create bio drafts and manual bookings. Keep `bio:publish` off until you need it.
2. Add the server to your MCP client:

```json
{
  "mcpServers": {
    "lnkib": {
      "command": "npx",
      "args": ["-y", "@lnkib/mcp"],
      "env": {
        "LNKIB_API_KEY": "iflow_live_...",
        "LNKIB_API_BASE": "https://api.lnkib.com"
      }
    }
  }
}
```

`LNKIB_API_BASE` is optional (default `https://api.lnkib.com`).

### Run from source

```bash
git clone https://github.com/lnkib-org/lnkib-mcp.git
cd lnkib-mcp
npm install
npm run build
LNKIB_API_KEY=iflow_live_... node dist/index.js
```

Point your MCP client's `command` at `node` with `args: ["/path/to/lnkib-mcp/dist/index.js"]`.

## Tools

| Area | Tools | Needs scope |
|---|---|---|
| Bio | `list_bio_pages` | `bio:read` |
| | `create_bio_page` (always a **private draft**), `update_bio_page`, `append_bio_link` | `bio:write` |
| | `set_bio_published` | `bio:publish` |
| Bookings | `list_booking_profiles`, `list_bookings` (contains customer data) | `bookings:read` |
| | `create_manual_booking` (no message is sent to the customer) | `bookings:write` |
| Instagram automation | `list_accounts`, `list_media`, `list_rules`, `upsert_rule`, `toggle_rule`, `get_comments`, `draw_comment_raffle`, `get_logs` | see OpenAPI |

Permissions come from the API key's scopes, not from this server.

## Safety

- Give each AI its own key and revoke it when you stop using it.
- Bookings contain personal data. Your AI provider sees what it reads. Do not enable `bookings:read` for tools you do not trust.
- AI-created bio pages are always private drafts. Review them before publishing.
- `update_bio_page` replaces the whole `links` / `socials` list when you send it. Read the page first.

## Versioning

[Semantic versioning](https://semver.org). Tool names and input fields are a public contract, guarded by `src/tools.contract.json` and a test. See [CHANGELOG.md](./CHANGELOG.md) and [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
