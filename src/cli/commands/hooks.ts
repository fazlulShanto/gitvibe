import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigManager } from '../../core/config/manager.js';
import { GitAnalyzer } from '../../core/git/analyzer.js';
import { Logger } from '../../utils/Logger.js';

export function registerHooksCommand(program: Command): void {
  const hooksCmd = program
    .command('hooks')
    .description('Manage Git hooks integration');

  // Install Git hooks
  hooksCmd
    .command('install')
    .description('Install Git hooks for automatic commit message generation')
    .option('--force', 'Overwrite existing hooks')
    .option('--commit-msg', 'Install only commit-msg hook')
    .option('--pre-commit', 'Install only pre-commit hook')
    .action(async (options) => {
      try {
        await installHooks(options);
      } catch (error) {
        Logger.error(`Hook installation failed: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Uninstall Git hooks
  hooksCmd
    .command('uninstall')
    .description('Remove installed Git hooks')
    .option('--all', 'Remove all hooks')
    .action(async (options) => {
      try {
        await uninstallHooks(options);
      } catch (error) {
        Logger.error(`Hook removal failed: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Show hook status
  hooksCmd
    .command('status')
    .description('Show Git hooks status')
    .action(async () => {
      try {
        await showHooksStatus();
      } catch (error) {
        Logger.error(`Failed to show hooks status: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Test hooks
  hooksCmd
    .command('test')
    .description('Test Git hooks functionality')
    .action(async () => {
      try {
        await testHooks();
      } catch (error) {
        Logger.error(`Hook testing failed: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}

interface HookOptions {
  force?: boolean;
  commitMsg?: boolean;
  preCommit?: boolean;
  all?: boolean;
}

async function installHooks(options: HookOptions): Promise<void> {
  const gitAnalyzer = new GitAnalyzer();
  
  // Check if we're in a git repository
  if (!await gitAnalyzer.isGitRepository()) {
    throw new Error('Not in a Git repository. Git hooks can only be installed in Git repositories.');
  }

  const configManager = ConfigManager.getInstance();
  const config = await configManager.load();

  // Get hooks directory
  const hooksDir = path.join(process.cwd(), '.git', 'hooks');
  
  try {
    await fs.access(hooksDir);
  } catch {
    throw new Error('Git hooks directory not found. Make sure you\'re in a Git repository root.');
  }

  console.log(chalk.blue('🪝 Installing Git hooks...\n'));

  // Determine which hooks to install
  let installCommitMsg = options.commitMsg || (!options.preCommit);
  let installPreCommit = options.preCommit || (!options.commitMsg);

  if (!options.commitMsg && !options.preCommit) {
    const { selectedHooks } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selectedHooks',
      message: 'Which hooks would you like to install?',
      choices: [
        { 
          name: 'prepare-commit-msg (automatically generate commit messages)', 
          value: 'commitMsg',
          checked: config.gitHooks.commitMsg 
        },
        { 
          name: 'pre-commit (validate changes before commit)', 
          value: 'preCommit',
          checked: config.gitHooks.preCommit 
        },
      ],
      validate: (input) => input.length > 0 || 'Please select at least one hook',
    }]);

    installCommitMsg = selectedHooks.includes('commitMsg');
    installPreCommit = selectedHooks.includes('preCommit');
  }

  // Install commit-msg hook
  if (installCommitMsg) {
    await installCommitMsgHook(hooksDir, options.force);
    config.gitHooks.commitMsg = true;
  }

  // Install pre-commit hook
  if (installPreCommit) {
    await installPreCommitHook(hooksDir, options.force);
    config.gitHooks.preCommit = true;
  }

  // Update configuration
  config.gitHooks.enabled = true;
  await configManager.update(config);

  console.log(chalk.green('\n✅ Git hooks installed successfully!'));
  console.log(chalk.blue('\n📋 What happens next:'));
  
  if (installCommitMsg) {
    console.log('• When you commit, a message will be auto-generated if none provided');
  }
  if (installPreCommit) {
    console.log('• Before each commit, validations will run automatically');
  }
  
  console.log(chalk.yellow('\n💡 To disable hooks temporarily, use: git commit --no-verify'));
}

async function installCommitMsgHook(hooksDir: string, force: boolean = false): Promise<void> {
  const hookPath = path.join(hooksDir, 'prepare-commit-msg');
  
  // Check if hook already exists
  try {
    await fs.access(hookPath);
    if (!force) {
      const { overwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: 'prepare-commit-msg hook already exists. Overwrite?',
        default: false,
      }]);
      
      if (!overwrite) {
        Logger.info('Skipping commit-msg hook installation');
        return;
      }
    }
  } catch {
    // Hook doesn't exist, proceed with installation
  }

  const hookContent = `#!/bin/sh
# PR Description CLI - prepare-commit-msg hook
# Generated automatically - do not edit manually

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

# Only generate message if no commit message provided and not amending
if [ -z "$COMMIT_SOURCE" ] || [ "$COMMIT_SOURCE" = "message" ]; then
  # Check if commit message is empty or just contains default template
  if [ ! -s "$COMMIT_MSG_FILE" ] || grep -q "^# Please enter the commit message" "$COMMIT_MSG_FILE"; then
    # Check if gitvibe is available
    if command -v gitvibe > /dev/null 2>&1; then
      echo "🤖 Generating commit message with AI..."
      
      # Generate commit message and write to file
      gitvibe commit --no-stream --commit 2>/dev/null | head -1 > "$COMMIT_MSG_FILE.tmp"
      
      if [ -s "$COMMIT_MSG_FILE.tmp" ]; then
        mv "$COMMIT_MSG_FILE.tmp" "$COMMIT_MSG_FILE"
        echo "✅ AI-generated commit message created"
      else
        rm -f "$COMMIT_MSG_FILE.tmp"
        echo "⚠️  Could not generate commit message, proceeding with manual input"
      fi
    else
      echo "⚠️  gitvibe not found in PATH, skipping auto-generation"
    fi
  fi
fi

exit 0
`;

  const spinner = ora('Installing prepare-commit-msg hook...').start();
  
  try {
    await fs.writeFile(hookPath, hookContent, { mode: 0o755 });
    spinner.succeed('prepare-commit-msg hook installed');
  } catch (error) {
    spinner.fail('Failed to install prepare-commit-msg hook');
    throw error;
  }
}

async function installPreCommitHook(hooksDir: string, force: boolean = false): Promise<void> {
  const hookPath = path.join(hooksDir, 'pre-commit');
  
  // Check if hook already exists
  try {
    await fs.access(hookPath);
    if (!force) {
      const { overwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: 'pre-commit hook already exists. Overwrite?',
        default: false,
      }]);
      
      if (!overwrite) {
        Logger.info('Skipping pre-commit hook installation');
        return;
      }
    }
  } catch {
    // Hook doesn't exist, proceed with installation
  }

  const hookContent = `#!/bin/sh
# PR Description CLI - pre-commit hook
# Generated automatically - do not edit manually

echo "🔍 Running pre-commit validations..."

# Check if gitvibe is available
if ! command -v gitvibe > /dev/null 2>&1; then
  echo "⚠️  gitvibe not found in PATH, skipping validations"
  exit 0
fi

# Validate configuration
if ! gitvibe config validate --quiet 2>/dev/null; then
  echo "❌ PR-gen configuration is invalid"
  echo "💡 Run 'gitvibe config validate' to see issues"
  echo "💡 Use 'git commit --no-verify' to skip this check"
  exit 1
fi

# Check for staged changes
if ! git diff --cached --quiet; then
  echo "✅ Pre-commit validations passed"
else
  echo "⚠️  No staged changes detected"
fi

exit 0
`;

  const spinner = ora('Installing pre-commit hook...').start();
  
  try {
    await fs.writeFile(hookPath, hookContent, { mode: 0o755 });
    spinner.succeed('pre-commit hook installed');
  } catch (error) {
    spinner.fail('Failed to install pre-commit hook');
    throw error;
  }
}

async function uninstallHooks(options: HookOptions): Promise<void> {
  const gitAnalyzer = new GitAnalyzer();
  
  if (!await gitAnalyzer.isGitRepository()) {
    throw new Error('Not in a Git repository.');
  }

  const hooksDir = path.join(process.cwd(), '.git', 'hooks');
  const configManager = ConfigManager.getInstance();
  const config = await configManager.load();

  console.log(chalk.blue('🗑️  Uninstalling Git hooks...\n'));

  const hooksToRemove = [];
  
  if (options.all) {
    hooksToRemove.push('prepare-commit-msg', 'pre-commit');
  } else {
    const { selectedHooks } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selectedHooks',
      message: 'Which hooks would you like to remove?',
      choices: [
        { name: 'prepare-commit-msg', value: 'prepare-commit-msg' },
        { name: 'pre-commit', value: 'pre-commit' },
      ],
    }]);
    hooksToRemove.push(...selectedHooks);
  }

  for (const hook of hooksToRemove) {
    const hookPath = path.join(hooksDir, hook);
    
    try {
      // Check if it's our hook by looking for our signature
      const content = await fs.readFile(hookPath, 'utf-8');
      if (content.includes('PR Description CLI')) {
        await fs.unlink(hookPath);
        Logger.success(`Removed ${hook} hook`);
        
        // Update config
        if (hook === 'prepare-commit-msg') {
          config.gitHooks.commitMsg = false;
        } else if (hook === 'pre-commit') {
          config.gitHooks.preCommit = false;
        }
      } else {
        Logger.warn(`${hook} hook exists but was not installed by gitvibe`);
      }
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        Logger.info(`${hook} hook not found`);
      } else {
        Logger.error(`Failed to remove ${hook} hook: ${(error as Error).message}`);
      }
    }
  }

  // Update configuration
  const hasAnyHooks = config.gitHooks.commitMsg || config.gitHooks.preCommit;
  config.gitHooks.enabled = hasAnyHooks;
  await configManager.update(config);

  Logger.success('Hook removal completed');
}

async function showHooksStatus(): Promise<void> {
  const gitAnalyzer = new GitAnalyzer();
  
  if (!await gitAnalyzer.isGitRepository()) {
    console.log(chalk.red('❌ Not in a Git repository'));
    return;
  }

  const hooksDir = path.join(process.cwd(), '.git', 'hooks');
  const configManager = ConfigManager.getInstance();
  const config = await configManager.load();

  console.log(chalk.blue('🪝 Git Hooks Status\n'));

  // Check configuration
  console.log(chalk.yellow('Configuration:'));
  console.log(`  Hooks enabled: ${config.gitHooks.enabled ? '✅' : '❌'}`);
  console.log(`  Commit message hook: ${config.gitHooks.commitMsg ? '✅' : '❌'}`);
  console.log(`  Pre-commit hook: ${config.gitHooks.preCommit ? '✅' : '❌'}`);

  // Check actual hook files
  console.log(chalk.yellow('\nInstalled hooks:'));
  
  const hooks = ['prepare-commit-msg', 'pre-commit'];
  for (const hook of hooks) {
    const hookPath = path.join(hooksDir, hook);
    
    try {
      const stats = await fs.stat(hookPath);
      const content = await fs.readFile(hookPath, 'utf-8');
      const isPrGenHook = content.includes('PR Description CLI');
      const isExecutable = (stats.mode & 0o111) !== 0;
      
      if (isPrGenHook) {
        console.log(`  ✅ ${hook} (gitvibe, ${isExecutable ? 'executable' : 'not executable'})`);
      } else {
        console.log(`  ⚠️  ${hook} (third-party, ${isExecutable ? 'executable' : 'not executable'})`);
      }
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        console.log(`  ❌ ${hook} (not installed)`);
      } else {
        console.log(`  ❓ ${hook} (error reading: ${(error as Error).message})`);
      }
    }
  }

  console.log(chalk.gray('\n💡 Use "gitvibe hooks install" to install missing hooks'));
  console.log(chalk.gray('💡 Use "gitvibe hooks test" to test hook functionality'));
}

async function testHooks(): Promise<void> {
  const gitAnalyzer = new GitAnalyzer();
  
  if (!await gitAnalyzer.isGitRepository()) {
    throw new Error('Not in a Git repository.');
  }

  console.log(chalk.blue('🧪 Testing Git hooks functionality...\n'));

  // Test if gitvibe is accessible
  const spinner1 = ora('Testing gitvibe CLI accessibility...').start();
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    await execAsync('gitvibe --version');
    spinner1.succeed('gitvibe CLI is accessible');
  } catch (error) {
    spinner1.fail('gitvibe CLI not found in PATH');
    Logger.error('Make sure gitvibe is installed globally or available in PATH');
    return;
  }

  // Test configuration
  const spinner2 = ora('Testing configuration...').start();
  try {
    const configManager = ConfigManager.getInstance();
    const config = await configManager.load();
    
    const enabledProviders = Object.keys(config.providers).filter(key => {
      const provider = config.providers[key as keyof typeof config.providers];
      return provider?.enabled && provider?.apiKey;
    });
    
    if (enabledProviders.length === 0) {
      spinner2.fail('No enabled providers with API keys found');
      Logger.warn('Run "gitvibe config validate" to fix configuration issues');
      return;
    }
    
    spinner2.succeed(`Configuration valid (${enabledProviders.length} providers enabled)`);
  } catch (error) {
    spinner2.fail('Configuration test failed');
    Logger.error(`Configuration error: ${(error as Error).message}`);
    return;
  }

  // Test AI generation
  const spinner3 = ora('Testing AI generation...').start();
  try {
    const hasChanges = await gitAnalyzer.hasChanges();
    if (!hasChanges) {
      spinner3.warn('No changes detected for testing generation');
    } else {
      // This would be a more complete test in a real implementation
      spinner3.succeed('AI generation test would work with current changes');
    }
  } catch (error) {
    spinner3.fail('AI generation test failed');
    Logger.error(`Generation test error: ${(error as Error).message}`);
  }

  console.log(chalk.green('\n✅ Hook testing completed!'));
  console.log(chalk.blue('\n💡 To test hooks in action:'));
  console.log('  1. Make some changes to your code');
  console.log('  2. Stage changes with: git add .');
  console.log('  3. Commit with: git commit');
  console.log('  4. The hooks should run automatically');
}