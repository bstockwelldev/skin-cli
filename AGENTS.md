# AGENTS.md — @bstockwelldev/skin-cli

## Purpose

Node **CLI** for wiring **`@bstockwelldev/react-skin-system`** and skin packs into Next.js / Vite apps (`init`, `add-pack`, `bootstrap next`, `verify`). Prefer **`--dry-run`** when exploring file mutations.

## Quick start

```bash
pnpm install
pnpm run build
pnpm run typecheck
pnpm run test
```

## Layout

- `src/` — command router, patching, verification scanners.
- `tests/` — Vitest + **fixtures under `tests/fixtures/`** (minimal Next/Vite shells). Preserve subprocess-style tests — no coupling to **`tabletop-studio`**.

## Safety contract

- No silent overwrite of hand-authored **`skins/registry.ts`** unless template markers match.
- Risky layout edits emit **`.skin-cli/bootstrap-next.patch-preview.md`** instead of partial corruption.

## Further reading

- Runtime API: [@bstockwelldev/react-skin-system](https://github.com/bstockwelldev/react-skin-system)
