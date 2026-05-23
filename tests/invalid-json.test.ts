import path from 'node:path';
import { access, writeFile } from 'node:fs/promises';

import { describe, expect, test } from 'vitest';

import { runInit } from '../src/index.js';
import { copyFixture } from './helpers.js';

describe('invalid project JSON', () => {
  test('fails fast without creating registry on malformed package.json', async () => {
    const cwd = await copyFixture('next-app');
    await writeFile(path.join(cwd, 'package.json'), '{ not valid json', 'utf8');

    await expect(runInit({ cwd, dryRun: false })).rejects.toThrow(/Invalid JSON in package\.json/i);

    const registryPath = path.join(cwd, 'skins', 'registry.ts');
    await expect(access(registryPath)).rejects.toThrow();
  });
});
