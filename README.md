# @bstockwelldev/skin-cli

CLI for integrating `@bstockwelldev/react-skin-system` and skin packs into host applications.

## Install

```bash
pnpm add -D @bstockwelldev/skin-cli
```

Run via:

```bash
pnpm skin-cli <command>
```

or

```bash
npx skin-cli <command>
```

## Commands

### `skin-cli init`

- Detects host type (`next`, `vite`, or unknown) using common project files.
- Creates `skins/registry.ts` if missing.
- If `skins/registry.ts` matches the skin-cli template markers, updates pack imports and skin list from installed dependencies.

```bash
skin-cli init
skin-cli init --dry-run
```

### `skin-cli add-pack <npm-name>`

- Adds the pack dependency to `package.json` (defaults to `latest` if absent).
- Updates `skins/registry.ts` template markers when possible.
- Prints a CSS import hint (`@import '<pack>/style.css';`).

```bash
skin-cli add-pack @bstockwelldev/skin-pack-robco-terminal
skin-cli add-pack @bstockwelldev/skin-pack-robco-terminal --dry-run
```

### `skin-cli bootstrap next`

- Best-effort patch for Next.js App Router layout (`app/layout.tsx` or `src/app/layout.tsx`).
- Adds:
  - `Script` import from `next/script`
  - `buildSkinBootstrapScript` import
  - `registry` import
  - `SKIN_BOOTSTRAP_SCRIPT` constant
  - `<Script ... strategy="beforeInteractive" ... />` in `<head>`
- If patching is risky, writes `.skin-cli/bootstrap-next.patch-preview.md` with clear manual instructions.

```bash
skin-cli bootstrap next
skin-cli bootstrap next --dry-run
```

### `skin-cli verify`

Best-effort static checks:

- `skins/registry.ts` exists
- `storageKey` found
- `createSkinRegistry(...)` used
- Next layout uses `buildSkinBootstrapScript(registry)` and `beforeInteractive` strategy (when layout exists)

```bash
skin-cli verify
```

## Safety model

- Every write command supports `--dry-run`.
- File diffs are previewed in stdout before writes.
- Risky layout patching falls back to patch-preview instructions instead of forced mutation.
- Existing non-template `skins/registry.ts` files are not overwritten automatically.

## Integration flow

1. Install dependencies:
   - `@bstockwelldev/react-skin-system`
   - one or more `@bstockwelldev/skin-pack-*`
2. Run `skin-cli init`.
3. Run `skin-cli add-pack <npm-name>` for each pack.
4. Run `skin-cli bootstrap next` (Next apps only).
5. Run `skin-cli verify`.

## Development

```bash
pnpm install
pnpm run build
pnpm run typecheck
pnpm run test
```
