import path from 'node:path';

import {
  buildRegistryTemplate,
  detectProjectKind,
  getSkinPackNames,
  isSkinPackName,
  readPackageJson,
  resolveLayoutPath,
  toRegistryVarName,
  updatePackageJsonDependency,
  updateRegistryTemplateWithPacks,
} from './core.js';
import { readTextFileSafe } from './fs-utils.js';
import type {
  AddPackOptions,
  CommandOptions,
  CommandResult,
  FileChange,
  ProjectKind,
} from './types.js';

const REGISTRY_PATH = path.join('skins', 'registry.ts');

export async function runInit(options: CommandOptions): Promise<CommandResult> {
  const packageJson = await readPackageJson(options.cwd);
  const projectKind = await detectProjectKind(options.cwd);
  const packs = getSkinPackNames(packageJson);
  const registryPath = path.join(options.cwd, REGISTRY_PATH);
  const existingRegistry = await readTextFileSafe(registryPath);
  const changedFiles: FileChange[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];

  notes.push(`Detected project kind: ${projectKind}.`);

  if (existingRegistry === null) {
    changedFiles.push({
      path: registryPath,
      before: null,
      after: buildRegistryTemplate({
        packageJson,
        packs,
      }),
    });
  } else {
    const updated = updateRegistryTemplateWithPacks(existingRegistry, packs);
    if (updated === null) {
      warnings.push(
        'Existing skins/registry.ts is not in skin-cli template format. Skipping registry rewrite.',
      );
    } else if (updated !== existingRegistry) {
      changedFiles.push({
        path: registryPath,
        before: existingRegistry,
        after: updated,
      });
    }
  }

  if (packs.length === 0) {
    notes.push('No installed skin packs found. Use `skin-cli add-pack <npm-name>` to continue.');
  }

  if (projectKind === 'unknown') {
    warnings.push(
      'Could not detect Next.js or Vite from common files. Generated generic registry only.',
    );
  }

  return {
    command: 'init',
    changedFiles,
    warnings,
    notes,
  };
}

export async function runAddPack(options: AddPackOptions): Promise<CommandResult> {
  if (!isSkinPackName(options.npmName)) {
    throw new Error(
      `Expected a scoped skin pack name like @bstockwelldev/skin-pack-*. Received "${options.npmName}".`,
    );
  }

  const packageJsonPath = path.join(options.cwd, 'package.json');
  const packageJsonRaw = await readTextFileSafe(packageJsonPath);
  if (packageJsonRaw === null) {
    throw new Error('Cannot find package.json in current directory.');
  }

  const changedFiles: FileChange[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];

  const updatedPackageJson = updatePackageJsonDependency(packageJsonRaw, options.npmName);
  if (updatedPackageJson !== packageJsonRaw) {
    changedFiles.push({
      path: packageJsonPath,
      before: packageJsonRaw,
      after: updatedPackageJson,
    });
  }

  const registryPath = path.join(options.cwd, REGISTRY_PATH);
  const registryExisting = await readTextFileSafe(registryPath);
  const packageJson = JSON.parse(updatedPackageJson) as { name?: string };
  const packs = getSkinPackNames(JSON.parse(updatedPackageJson));

  if (registryExisting === null) {
    changedFiles.push({
      path: registryPath,
      before: null,
      after: buildRegistryTemplate({
        packageJson,
        packs,
      }),
    });
    notes.push('Created skins/registry.ts because no registry file was present.');
  } else {
    const updatedRegistry = updateRegistryTemplateWithPacks(registryExisting, packs);
    if (updatedRegistry === null) {
      warnings.push(
        'Existing skins/registry.ts is not in skin-cli template format. Add this pack manually to registry definitions.',
      );
    } else if (updatedRegistry !== registryExisting) {
      changedFiles.push({
        path: registryPath,
        before: registryExisting,
        after: updatedRegistry,
      });
    }
  }

  notes.push(`Suggested CSS import: @import '${options.npmName}/style.css';`);
  notes.push(`Pack symbol heuristic: ${toRegistryVarName(options.npmName)}.`);

  return {
    command: 'add-pack',
    changedFiles,
    warnings,
    notes,
  };
}

export async function runBootstrapNext(options: CommandOptions): Promise<CommandResult> {
  const changedFiles: FileChange[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];

  const projectKind: ProjectKind = await detectProjectKind(options.cwd);
  if (projectKind !== 'next') {
    warnings.push('Project does not look like Next.js. Continuing with best-effort patch preview.');
  }

  const layoutPath = resolveLayoutPath(options.cwd);
  const registryPath = path.join(options.cwd, REGISTRY_PATH);
  const layoutPreviewPath = path.join(options.cwd, '.skin-cli', 'bootstrap-next.patch-preview.md');

  if (!layoutPath) {
    changedFiles.push({
      path: layoutPreviewPath,
      before: await readTextFileSafe(layoutPreviewPath),
      after: buildPatchPreview({
        reason: 'No app/layout.tsx or src/app/layout.tsx found.',
      }),
    });
    warnings.push('Could not locate a Next.js layout file. Wrote patch preview instructions instead.');
    return {
      command: 'bootstrap-next',
      changedFiles,
      warnings,
      notes,
    };
  }

  const layoutBefore = await readTextFileSafe(layoutPath);
  if (!layoutBefore) {
    throw new Error(`Unable to read layout file at ${layoutPath}.`);
  }

  if (layoutBefore.includes('id="skin-bootstrap"') || layoutBefore.includes('buildSkinBootstrapScript(')) {
    notes.push('Bootstrap script already appears present. No changes made.');
    return {
      command: 'bootstrap-next',
      changedFiles,
      warnings,
      notes,
    };
  }

  const relativeRegistryImport = toModuleImport(layoutPath, registryPath);
  const patched = patchNextLayout(layoutBefore, relativeRegistryImport);
  if (!patched) {
    changedFiles.push({
      path: layoutPreviewPath,
      before: await readTextFileSafe(layoutPreviewPath),
      after: buildPatchPreview({
        reason: 'Layout shape did not match safe patch heuristics.',
      }),
    });
    warnings.push('Layout patch looked risky. Wrote a patch-preview file instead.');
    return {
      command: 'bootstrap-next',
      changedFiles,
      warnings,
      notes,
    };
  }

  changedFiles.push({
    path: layoutPath,
    before: layoutBefore,
    after: patched,
  });
  notes.push('Added beforeInteractive skin bootstrap script to layout head.');
  notes.push('Confirm that your layout has <head> and suppressHydrationWarning where needed.');

  return {
    command: 'bootstrap-next',
    changedFiles,
    warnings,
    notes,
  };
}

function toModuleImport(fromFile: string, toFile: string): string {
  const raw = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
  const withoutExt = raw.replace(/\.tsx?$/, '').replace(/\.jsx?$/, '');
  if (withoutExt.startsWith('.')) return withoutExt;
  return `./${withoutExt}`;
}

function patchNextLayout(before: string, registryImport: string): string | null {
  if (!before.includes('<head>') || !before.includes('</head>')) {
    return null;
  }

  const importsToInsert = [
    "import Script from 'next/script';",
    "import { buildSkinBootstrapScript } from '@bstockwelldev/react-skin-system/next';",
    `import { registry } from '${registryImport}';`,
  ];

  let after = before;
  for (const statement of importsToInsert) {
    if (after.includes(statement)) continue;
    const importMatches = [...after.matchAll(/^import .*;$/gm)];
    if (importMatches.length === 0) return null;
    const last = importMatches[importMatches.length - 1]!;
    const insertAt = last.index! + last[0].length;
    after = `${after.slice(0, insertAt)}\n${statement}${after.slice(insertAt)}`;
  }

  if (!after.includes('const SKIN_BOOTSTRAP_SCRIPT = buildSkinBootstrapScript(registry);')) {
    const exportMatch = after.match(/\nexport default function /);
    if (!exportMatch || exportMatch.index === undefined) return null;
    const insertAt = exportMatch.index;
    after =
      `${after.slice(0, insertAt)}\nconst SKIN_BOOTSTRAP_SCRIPT = buildSkinBootstrapScript(registry);\n` +
      `${after.slice(insertAt)}`;
  }

  const headOpen = '<head>';
  const injection =
    '\n        <Script id="skin-bootstrap" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: SKIN_BOOTSTRAP_SCRIPT }} />';
  after = after.replace(headOpen, `${headOpen}${injection}`);
  return after;
}

function buildPatchPreview(options: { reason: string }): string {
  return `# skin-cli bootstrap next patch preview

Reason: ${options.reason}

## Add these imports

\`\`\`ts
import Script from 'next/script';
import { buildSkinBootstrapScript } from '@bstockwelldev/react-skin-system/next';
import { registry } from '../skins/registry';
\`\`\`

## Add this constant near top-level module scope

\`\`\`ts
const SKIN_BOOTSTRAP_SCRIPT = buildSkinBootstrapScript(registry);
\`\`\`

## Add this to <head>

\`\`\`tsx
<Script id="skin-bootstrap" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: SKIN_BOOTSTRAP_SCRIPT }} />
\`\`\`
`;
}

export async function runVerify(options: CommandOptions): Promise<{
  ok: boolean;
  checks: string[];
  warnings: string[];
}> {
  const checks: string[] = [];
  const warnings: string[] = [];
  const registryPath = path.join(options.cwd, REGISTRY_PATH);
  const layoutPath = resolveLayoutPath(options.cwd);

  const registry = await readTextFileSafe(registryPath);
  if (!registry) {
    checks.push('FAIL: Missing skins/registry.ts');
    return { ok: false, checks, warnings };
  }

  const storageKeyMatch = registry.match(/storageKey:\s*['"`]([^'"`]+)['"`]/);
  if (!storageKeyMatch) {
    checks.push('FAIL: Could not parse storageKey from registry.');
  } else {
    checks.push(`PASS: storageKey found (${storageKeyMatch[1]}).`);
  }

  if (!registry.includes('createSkinRegistry(')) {
    checks.push('FAIL: registry.ts does not call createSkinRegistry.');
  } else {
    checks.push('PASS: registry.ts calls createSkinRegistry.');
  }

  if (!layoutPath) {
    checks.push('WARN: No Next layout found; bootstrap script parity skipped.');
    warnings.push('No Next layout file found; run `skin-cli bootstrap next` in Next apps.');
    return { ok: checks.every((line) => !line.startsWith('FAIL:')), checks, warnings };
  }

  const layout = await readTextFileSafe(layoutPath);
  if (!layout) {
    checks.push('FAIL: Next layout exists but could not be read.');
    return { ok: false, checks, warnings };
  }

  if (layout.includes('buildSkinBootstrapScript(registry)')) {
    checks.push('PASS: Layout uses buildSkinBootstrapScript(registry), parity guaranteed by runtime helper.');
  } else if (layout.includes('buildSkinBootstrapScript(')) {
    checks.push('WARN: Layout calls buildSkinBootstrapScript with a non-registry expression.');
    warnings.push('Verify layout passes the same registry exported from skins/registry.ts.');
  } else {
    checks.push('FAIL: Layout is missing buildSkinBootstrapScript call.');
  }

  if (layout.includes('strategy="beforeInteractive"')) {
    checks.push('PASS: beforeInteractive script strategy found.');
  } else {
    checks.push('FAIL: Missing beforeInteractive strategy on skin bootstrap script.');
  }

  return { ok: checks.every((line) => !line.startsWith('FAIL:')), checks, warnings };
}
