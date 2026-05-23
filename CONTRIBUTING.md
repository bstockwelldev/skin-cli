# Contributing

## Setup

**Node.js 20+**, **pnpm**.

```bash
pnpm install
pnpm run build
pnpm run typecheck
pnpm run test
```

## Tests

Fixtures live in **`tests/fixtures/`**. Prefer extending fixtures over live network or real monorepo paths.

## Releases

**Changesets** drive versioning. The CLI may be published **after** `@bstockwelldev/react-skin-system` is on npm (templates reference it).

## Security

[`SECURITY.md`](SECURITY.md)
