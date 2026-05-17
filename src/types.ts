export type ProjectKind = 'next' | 'vite' | 'unknown';

export type CommandName = 'init' | 'add-pack' | 'bootstrap-next';

export interface FileChange {
  path: string;
  before: string | null;
  after: string;
}

export interface CommandResult {
  command: CommandName;
  changedFiles: FileChange[];
  warnings: string[];
  notes: string[];
}

export interface CommandOptions {
  cwd: string;
  dryRun: boolean;
}

export interface AddPackOptions extends CommandOptions {
  npmName: string;
}
