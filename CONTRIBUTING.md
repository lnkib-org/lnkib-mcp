# Contributing

Thanks for helping. This repository is the home of the `@lnkib/mcp` server. The lnkib application itself is in a separate private repository.

## Develop

```bash
npm install
npm test            # builds, then runs the unit tests and the tool contract test
```

## The API contract

The server is generated against the public OpenAPI spec in `openapi/openapi.json`.

- API changed? `npm run openapi:sync && npm run openapi:types`, review the diff, update tools if needed.
- `npm run openapi:check` compares the committed spec with the live API (a weekly workflow runs it).

## The tool contract

`src/tools.contract.json` records every tool's name, read/write hints and input fields. `npm test` fails when it changes. If the change is intended:

1. Decide the version bump: removing or renaming a tool/field or making a field required is **major**; adding tools or optional fields is **minor**; fixes are **patch**.
2. Bump `version` in `package.json` and add an entry to `CHANGELOG.md`.
3. Run `npm run test:update-contract` and include the diff.

Rules that must not regress: read tools stay read-only; `create_bio_page` has no publish option; publishing needs the separate `bio:publish` scope; nothing here sends messages to customers.

## Releasing

Maintainers tag `v<version>` (e.g. `v0.2.0`). The publish workflow checks that the tag matches `package.json`, runs the tests and publishes to npm with [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC): no long-lived npm token is stored, and provenance is attached automatically. The trusted publisher (repository `lnkib-org/lnkib-mcp`, workflow `publish.yml`) is configured in the package settings on npmjs.com.
