import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { ProjectKind } from './types.js';

const SKIN_PACK_PREFIX = '@bstockwelldev/skin-pack-';
const IMPORTS_START = '// skin-cli:imports:start';
const IMPORTS_END = '// skin-cli:imports:end';
const SKINS_START = '// skin-cli:skins:start';
const SKINS_END = '// skin-cli:skins:end';

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

export async function detectProjectKind(cwd: string): Promise<ProjectKind> {
  const nextSignals = [
    'next.config.ts',
    'next.config.js',
    'next.config.mjs',
    path.join('app', 'layout.tsx'),
    path.join('src', 'app', 'layout.tsx'),
  ];
  const viteSignals = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];

  if (await hasAnyFile(cwd, nextSignals)) return 'next';
  if (await hasAnyFile(cwd, viteSignals)) return 'vite';
  return 'unknown';
}

async function hasAnyFile(cwd: string, files: string[]): Promise<boolean> {
  for (const file of files) {
    try {
      await readFile(path.join(cwd, file), 'utf8');
      return true;
    } catch {
      // keep scanning
    }
  }
  return false;
}

export async function readPackageJson(cwd: string): Promise<PackageJson> {
  const packageJsonPath = path.join(cwd, 'package.json');
  const contents = await readFile(packageJsonPath, 'utf8');
  return JSON.parse(contents) as PackageJson;
}

export function toRegistryVarName(npmName: string): string {
  const scoped = npmName.includes('/') ? npmName.split('/')[1]! : npmName;
  const suffix = scoped.startsWith('skin-pack-')
    ? scoped.slice('skin-pack-'.length)
    : scoped;
  const words = suffix
    .split('-')
    .filter(Boolean)
    .map((part, index) =>
      index === 0 ? part.toLowerCase() : `${part[0]!.toUpperCase()}${part.slice(1)}`,
    );
  return `${words.join('')}Skin`;
}

export function getSkinPackNames(pkg: PackageJson): string[] {
  const all = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.optionalDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
  };

  return Object.keys(all)
    .filter((name) => name.startsWith(SKIN_PACK_PREFIX))
    .sort((a, b) => a.localeCompare(b));
}

function getStorageKey(pkg: PackageJson): string {
  const name = pkg.name?.trim();
  if (!name) return 'app/skin';
  return `${name}/skin`;
}

function buildImports(packages: string[]): string {
  if (!packages.length) return '// Add skin pack imports here.';
  return packages
    .map((pkgName) => `import { ${toRegistryVarName(pkgName)} } from '${pkgName}';`)
    .join('\n');
}

function buildDefinitions(packages: string[]): string {
  if (!packages.length) return '// Add skin definitions here.';
  return packages.map((pkgName) => `  ${toRegistryVarName(pkgName)},`).join('\n');
}

export function buildRegistryTemplate(options: {
  packageJson: PackageJson;
  packs: string[];
}): string {
  const { packageJson, packs } = options;
  return `import { createSkinRegistry, type SkinDefinition } from '@bstockwelldev/react-skin-system';

${IMPORTS_START}
${buildImports(packs)}
${IMPORTS_END}

const skinDefinitions = [
${SKINS_START}
${buildDefinitions(packs)}
${SKINS_END}
] satisfies SkinDefinition<string>[];

if (skinDefinitions.length === 0) {
  throw new Error('No skins configured yet. Run "skin-cli add-pack <npm-name>" first.');
}

export const registry = createSkinRegistry(skinDefinitions, {
  storageKey: '${getStorageKey(packageJson)}',
  defaultSkin: skinDefinitions[0]!.id,
});
`;
}

export function updateRegistryTemplateWithPacks(
  existing: string,
  packs: string[],
): string | null {
  if (
    !existing.includes(IMPORTS_START) ||
    !existing.includes(IMPORTS_END) ||
    !existing.includes(SKINS_START) ||
    !existing.includes(SKINS_END)
  ) {
    return null;
  }

  const importSegment = `${IMPORTS_START}\n${buildImports(packs)}\n${IMPORTS_END}`;
  const skinSegment = `${SKINS_START}\n${buildDefinitions(packs)}\n${SKINS_END}`;

  const importRegex = new RegExp(
    `${escapeRegex(IMPORTS_START)}[\\s\\S]*?${escapeRegex(IMPORTS_END)}`,
    'm',
  );
  const skinRegex = new RegExp(
    `${escapeRegex(SKINS_START)}[\\s\\S]*?${escapeRegex(SKINS_END)}`,
    'm',
  );

  return existing.replace(importRegex, importSegment).replace(skinRegex, skinSegment);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function updatePackageJsonDependency(
  packageJsonRaw: string,
  npmName: string,
  version = 'latest',
): string {
  const pkg = JSON.parse(packageJsonRaw) as PackageJson;
  const dependencies = { ...(pkg.dependencies ?? {}) };
  dependencies[npmName] = dependencies[npmName] ?? version;
  pkg.dependencies = sortObject(dependencies);
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function sortObject(object: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));
}

export function resolveLayoutPath(cwd: string): string | null {
  const candidates = [
    path.join(cwd, 'app', 'layout.tsx'),
    path.join(cwd, 'app', 'layout.jsx'),
    path.join(cwd, 'src', 'app', 'layout.tsx'),
    path.join(cwd, 'src', 'app', 'layout.jsx'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function isSkinPackName(value: string): boolean {
  return value.startsWith(SKIN_PACK_PREFIX);
}

export function getMarkers() {
  return { IMPORTS_START, IMPORTS_END, SKINS_START, SKINS_END };
}
