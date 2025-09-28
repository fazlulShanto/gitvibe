import { Command } from 'commander';
import { Logger } from '@gitvibe/core';
import { registerCommitCommand } from './commands/commit.js';
import { registerConfigCommand } from './commands/config.js';
import { registerHooksCommand } from './commands/hooks.js';
import { registerInitCommand } from './commands/init.js';
import { registerPRCommand } from './commands/pr.js';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('gitvibe')
    .description('AI-powered CLI tool for generating commit messages and PR descriptions')
    .version('1.0.0')
    .option('-v, --verbose', 'enable verbose logging')
    .option('--no-color', 'disable colored output')
    .hook('preAction', (thisCommand) => {
      const options = thisCommand.opts();
      if (options.verbose) {
        Logger.setVerbose(true);
      }
    });

  return program;
}

export async function setupCommands(program: Command): Promise<void> {
  registerInitCommand(program);
  registerCommitCommand(program);
  registerPRCommand(program);
  registerConfigCommand(program);
  registerHooksCommand(program);
}

export function displayWelcome(): void {
  console.log('Welcome to GitVibe!');
  console.log('AI-powered CLI tool for generating commit messages and PR descriptions');
  console.log('');
}

export function displayHelp(): void {
  console.log('Usage: gitvibe [command] [options]');
  console.log('');
  console.log('Commands:');
  console.log('  init      Initialize GitVibe with interactive setup');
  console.log('  commit    Generate and commit with AI-powered message');
  console.log('  pr        Generate PR description');
  console.log('  config    Manage configuration');
  console.log('  hooks     Manage git hooks');
  console.log('');
  console.log('Options:');
  console.log('  -v, --verbose    Enable verbose logging');
  console.log('  --no-color       Disable colored output');
  console.log('  -h, --help       Display help');
  console.log('  -V, --version    Display version');
  console.log('');
}

export function addGlobalErrorHandler(program: Command): void {
  program.exitOverride();

  process.on('uncaughtException', (error) => {
    Logger.error(`Uncaught Exception: ${error.message}`);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    Logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    process.exit(1);
  });

  program.on('command:*', (unknownCommand) => {
    const availableCommands = program.commands.map(cmd => cmd.name());
    const suggestions = availableCommands.filter(cmd =>
      cmd.includes(unknownCommand[0]) || unknownCommand[0].includes(cmd)
    );

    Logger.error(`Unknown command '${unknownCommand[0]}'.`);

    if (suggestions.length > 0) {
      Logger.info(`Did you mean one of these? ${suggestions.join(', ')}`);
    } else {
      Logger.info('Run gitvibe --help to see available commands.');
    }

    process.exit(1);
  });
}