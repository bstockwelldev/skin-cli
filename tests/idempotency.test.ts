import path from 'node:path';
import { readdir } from 'node:fs/promises';

import { describe, expect, test } from 'vitest';

import { runBootstrapNext, runInit } from '../src/index.js';
import { writeFileChanges } from '../src/fs-utils.js';
import { copyFixture } from './helpers.js';

describe('idempotent dry-run', () => {
  test('bootstrap next --dry-run produces identical previews on repeat', async () => {
    const cwd = await copyFixture('next-app');
    const initResult = await runInit({ cwd, dryRun: false });
    await writeFileChanges(initResult.changedFiles);

    const first = await runBootstrapNext({ cwd, dryRun: true });
    const second = await runBootstrapNext({ cwd, dryRun: true });

    expect(first.changedFiles).toEqual(second.changedFiles);

    const rootEntries = await readdir(cwd);
    const patchArtifacts = rootEntries.filter((name) => name.includes('.patch-preview'));
    expect(patchArtifacts).toHaveLength(0);
  });
});
