import path from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  runAddPack,
  runBootstrapNext,
  runInit,
  runVerify,
} from '../src/index.js';
import { writeFileChanges } from '../src/fs-utils.js';
import { copyFixture, read } from './helpers.js';

describe('skin-cli commands', () => {
  test('init generates registry for Next fixture', async () => {
    const cwd = await copyFixture('next-app');
    const result = await runInit({ cwd, dryRun: false });

    expect(result.command).toBe('init');
    expect(result.changedFiles.length).toBe(1);
    expect(result.changedFiles[0]?.path).toContain(path.join('skins', 'registry.ts'));
    expect(result.changedFiles[0]?.after).toContain('createSkinRegistry');
    expect(result.changedFiles[0]?.after).toContain('robcoTerminalSkin');
  });

  test('add-pack updates package and registry', async () => {
    const cwd = await copyFixture('next-app');
    const initResult = await runInit({ cwd, dryRun: false });
    await writeFileChanges(initResult.changedFiles);

    const result = await runAddPack({
      cwd,
      dryRun: false,
      npmName: '@bstockwelldev/skin-pack-jp-90s-park-system',
    });
    await writeFileChanges(result.changedFiles);

    const pkg = await read(path.join(cwd, 'package.json'));
    const registry = await read(path.join(cwd, 'skins', 'registry.ts'));
    expect(pkg).toContain('"@bstockwelldev/skin-pack-jp-90s-park-system": "latest"');
    expect(registry).toContain('jp90sParkSystemSkin');
  });

  test('bootstrap next patches layout with script helper', async () => {
    const cwd = await copyFixture('next-app');
    const initResult = await runInit({ cwd, dryRun: false });
    await writeFileChanges(initResult.changedFiles);

    const result = await runBootstrapNext({ cwd, dryRun: false });
    expect(result.changedFiles.length).toBe(1);
    await writeFileChanges(result.changedFiles);

    const layout = await read(path.join(cwd, 'app', 'layout.tsx'));
    expect(layout).toContain("import Script from 'next/script';");
    expect(layout).toContain('buildSkinBootstrapScript(registry)');
    expect(layout).toContain('id="skin-bootstrap"');
    expect(layout).toContain('strategy="beforeInteractive"');
  });

  test('verify reports success for generated Next integration', async () => {
    const cwd = await copyFixture('next-app');
    const initResult = await runInit({ cwd, dryRun: false });
    await writeFileChanges(initResult.changedFiles);
    const bootstrapResult = await runBootstrapNext({ cwd, dryRun: false });
    await writeFileChanges(bootstrapResult.changedFiles);

    const verification = await runVerify({ cwd, dryRun: false });
    expect(verification.ok).toBe(true);
    expect(verification.checks.some((line) => line.startsWith('PASS: storageKey found'))).toBe(true);
  });

  test('init supports Vite fixture detection', async () => {
    const cwd = await copyFixture('vite-app');
    const result = await runInit({ cwd, dryRun: false });
    expect(result.notes.some((line) => line.includes('vite'))).toBe(true);
    expect(result.changedFiles[0]?.after).toContain('createSkinRegistry');
  });
});
