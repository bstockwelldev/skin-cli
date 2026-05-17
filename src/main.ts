import { Command } from 'commander';

import { runAddPack, runBootstrapNext, runInit, runVerify } from './commands.js';
import { renderPreviewDiff, writeFileChanges } from './fs-utils.js';
import type { CommandResult } from './types.js';

const program = new Command();

program
  .name('skin-cli')
  .description('Scaffold and verify skin system integration for Next.js and Vite apps.')
  .version('0.1.0');

program
  .command('init')
  .option('--dry-run', 'Print changes without writing files')
  .action(async (flags: { dryRun?: boolean }) => {
    const result = await runInit({
      cwd: process.cwd(),
      dryRun: Boolean(flags.dryRun),
    });
    await printAndMaybeApply(result, Boolean(flags.dryRun));
  });

program
  .command('add-pack')
  .argument('<npm-name>', 'NPM package name to add')
  .option('--dry-run', 'Print changes without writing files')
  .action(async (npmName: string, flags: { dryRun?: boolean }) => {
    const result = await runAddPack({
      cwd: process.cwd(),
      dryRun: Boolean(flags.dryRun),
      npmName,
    });
    await printAndMaybeApply(result, Boolean(flags.dryRun));
  });

const bootstrap = program.command('bootstrap').description('Bootstrap helpers for host framework.');
bootstrap
  .command('next')
  .option('--dry-run', 'Print changes without writing files')
  .action(async (flags: { dryRun?: boolean }) => {
    const result = await runBootstrapNext({
      cwd: process.cwd(),
      dryRun: Boolean(flags.dryRun),
    });
    await printAndMaybeApply(result, Boolean(flags.dryRun));
  });

program
  .command('verify')
  .description('Best-effort static checks for registry/bootstrap parity.')
  .action(async () => {
    const result = await runVerify({
      cwd: process.cwd(),
      dryRun: false,
    });

    for (const check of result.checks) console.log(check);
    for (const warning of result.warnings) console.warn(`WARN: ${warning}`);

    if (!result.ok) {
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`skin-cli error: ${message}`);
  process.exitCode = 1;
});

async function printAndMaybeApply(result: CommandResult, dryRun: boolean): Promise<void> {
  console.log(`Command: ${result.command}`);
  if (result.changedFiles.length === 0) {
    console.log('No file changes.');
  } else {
    for (const change of result.changedFiles) {
      console.log(renderPreviewDiff(change));
      console.log('');
    }
  }

  for (const warning of result.warnings) {
    console.warn(`WARN: ${warning}`);
  }
  for (const note of result.notes) {
    console.log(`NOTE: ${note}`);
  }

  if (dryRun) {
    console.log('Dry-run complete. No files were written.');
    return;
  }

  await writeFileChanges(result.changedFiles);
  console.log(`Applied ${result.changedFiles.length} change(s).`);
}
