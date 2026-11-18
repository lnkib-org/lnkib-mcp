# Changelog

Semantic versioning: removing or renaming a tool/field, or making a field required → **major**; adding tools or optional fields → **minor**; fixes → **patch**.

## 0.2.1
- No functional change. First release published from CI with npm trusted publishing (OIDC) and provenance.

## 0.2.0
- First public version of `@lnkib/mcp` (binary `lnkib-mcp`, server name `lnkib`).
- Configuration: `LNKIB_API_KEY` (required) and `LNKIB_API_BASE` (default `https://api.lnkib.com`).
- Tools for Link-in-Bio (`list_bio_pages`, `create_bio_page` as a private draft only, `update_bio_page`, `append_bio_link`, `set_bio_published`), bookings (`list_booking_profiles`, `list_bookings`, `create_manual_booking`) and Instagram automation (`list_accounts`, `list_media`, `list_rules`, `upsert_rule`, `toggle_rule`, `get_comments`, `draw_comment_raffle`, `get_logs`).
- Requests send an `X-Lnkib-Client: mcp/<version>` header for diagnostics.
- Types are generated from the public OpenAPI spec (`openapi/openapi.json`); the package has no lnkib-internal dependencies.
- Tool contract snapshot test (`src/tools.contract.json`).
- Built on `@modelcontextprotocol/sdk` 1.32.x and `zod` 4.x.
