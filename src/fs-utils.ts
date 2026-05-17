import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { FileChange } from './types.js';

export async function readTextFileSafe(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

export async function writeFileChanges(changes: FileChange[]): Promise<void> {
  for (const change of changes) {
    await mkdir(path.dirname(change.path), { recursive: true });
    await writeFile(change.path, change.after, 'utf8');
  }
}

export function toPosixPath(value: string): string {
  return value.replace(/\\/g, '/');
}

export function renderPreviewDiff(change: FileChange): string {
  const beforeLines = (change.before ?? '').split('\n');
  const afterLines = change.after.split('\n');
  const max = Math.max(beforeLines.length, afterLines.length);
  const lines: string[] = [];
  lines.push(`--- ${toPosixPath(change.path)} (before)`);
  lines.push(`+++ ${toPosixPath(change.path)} (after)`);

  for (let index = 0; index < max; index += 1) {
    const before = beforeLines[index];
    const after = afterLines[index];
    if (before === after) continue;
    if (before !== undefined) lines.push(`- ${before}`);
    if (after !== undefined) lines.push(`+ ${after}`);
  }

  return lines.join('\n');
}
