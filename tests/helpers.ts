import { cp, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export async function copyFixture(name: string): Promise<string> {
  const workspace = await mkdtemp(path.join(tmpdir(), 'skin-cli-'));
  const fixtureRoot = path.join(process.cwd(), 'tests', 'fixtures', name);
  await cp(fixtureRoot, workspace, { recursive: true });
  return workspace;
}

export async function read(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}
