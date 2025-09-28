import { Command } from 'commander';
import chalk from 'chalk';
import { Logger } from '../utils/Logger.js';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('gitvibe')
    .description('AI-powered CLI tool for generating commit messages and PR descriptions')
    .version('1.0.0')
    .configureOutput({
      writeErr: (str) => process.stderr.write(chalk.red(str)),
      writeOut: (str) => process.stdout.write(str),
    })
    .configureHelp({
      helpWidth: 100,
      sortSubcommands: true,
    });

  // Global options
  program
    .option('-v, --verbose', 'Enable verbose logging')
    .option('--config <path>', 'Path to configuration file')
    .hook('preAction', (thisCommand, actionCommand) => {
      if (thisCommand.opts().verbose) {
        Logger.setVerbose(true);
      }
    });

  return program;
}

export function addGlobalErrorHandler(program: Command): void {
  program.exitOverride((err) => {
    if (err.code === 'commander.help' || err.code === 'commander.helpDisplayed') {
      process.exit(0);
    }
    if (err.code === 'commander.version') {
      process.exit(0);
    }
    
    Logger.error(`Command failed: ${err.message}`);
    
    if (err.code === 'commander.unknownCommand') {
      console.log(chalk.yellow('\nDid you mean one of these?'));
      program.commands.forEach(cmd => {
        console.log(`  ${chalk.cyan(cmd.name())} - ${cmd.description()}`);
      });
    }
    
    process.exit(1);
  });

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    Logger.error(`Uncaught exception: ${error.message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    Logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
    process.exit(1);
  });
}

export async function setupCommands(program: Command): Promise<void> {
  // Import and register commands
  const { registerInitCommand } = await import('./commands/init.js');
  registerInitCommand(program);

  const { registerCommitCommand } = await import('./commands/commit.js');
  registerCommitCommand(program);

  const { registerPRCommand } = await import('./commands/pr.js');
  registerPRCommand(program);

  const { registerConfigCommand } = await import('./commands/config.js');
  registerConfigCommand(program);

  const { registerHooksCommand } = await import('./commands/hooks.js');
  registerHooksCommand(program);
}

export function displayWelcome(): void {
  console.log(chalk.cyan(`
  ╔═══════════════════════════════════════╗
  ║        🤖 PR Description CLI          ║
  ║                                       ║
  ║   AI-powered commit messages & PRs    ║
  ╚═══════════════════════════════════════╝
  `));
}

export function displayHelp(): void {
  console.log(chalk.green(`
Quick Start:
  ${chalk.cyan('gitvibe init')}           Set up the CLI with your API keys
  ${chalk.cyan('gitvibe commit')}         Generate commit message from staged changes
  ${chalk.cyan('gitvibe pr')}             Generate PR description

Examples:
  ${chalk.cyan('gitvibe commit --model gpt-4')}              Use specific model
  ${chalk.cyan('gitvibe commit --template conventional')}    Use conventional commits
  ${chalk.cyan('gitvibe pr --branch feature/auth')}          PR for specific branch
  ${chalk.cyan('gitvibe config set defaultProvider openai')} Set default provider

Need help? Run any command with --help for detailed information.
  `));
}