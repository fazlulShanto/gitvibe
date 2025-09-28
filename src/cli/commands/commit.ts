import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../../core/config/manager.js';
import { AIGenerator } from '../../core/ai/generator.js';
import { GitAnalyzer } from '../../core/git/analyzer.js';
import { Logger } from '../../utils/Logger.js';
import { PROVIDERS } from '../../core/ai/providers.js';

export function registerCommitCommand(program: Command): void {
  program
    .command('commit')
    .alias('c')
    .description('Generate AI-powered commit message from staged changes')
    .option('-p, --provider <provider>', 'AI provider to use (openai, anthropic, google)')
    .option('-m, --model <model>', 'Specific model to use')
    .option('-t, --template <template>', 'Template to use (default, conventional, custom name)')
    .option('--no-stream', 'Disable streaming output')
    .option('--stage-all', 'Stage all changes before generating commit message')
    .option('--commit', 'Automatically commit with generated message')
    .option('--edit', 'Edit the generated message before committing')
    .action(async (options) => {
      try {
        await commitCommand(options);
      } catch (error) {
        Logger.error(`Commit generation failed: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}

interface CommitOptions {
  provider?: string;
  model?: string;
  template?: string;
  stream?: boolean;
  stageAll?: boolean;
  commit?: boolean;
  edit?: boolean;
}

async function commitCommand(options: CommitOptions): Promise<void> {
  const configManager = ConfigManager.getInstance();
  const config = await configManager.load();
  const gitAnalyzer = new GitAnalyzer();

  // Check if we're in a git repository
  if (!await gitAnalyzer.isGitRepository()) {
    throw new Error('Not in a Git repository. Please run this command from within a Git repository.');
  }

  // Stage all changes if requested
  if (options.stageAll) {
    const stageSpinner = ora('Staging all changes...').start();
    try {
      await gitAnalyzer.stageAll();
      stageSpinner.succeed('All changes staged successfully');
    } catch (error) {
      stageSpinner.fail('Failed to stage changes');
      throw error;
    }
  }

  // Check for staged changes
  const hasStagedChanges = await gitAnalyzer.hasStagedChanges();
  if (!hasStagedChanges) {
    const hasUnstagedChanges = await gitAnalyzer.hasChanges();
    
    if (!hasUnstagedChanges) {
      Logger.warn('No changes detected in the repository.');
      return;
    }

    Logger.warn('No staged changes found.');
    const { stageNow } = await inquirer.prompt([{
      type: 'confirm',
      name: 'stageNow',
      message: 'Would you like to stage all changes now?',
      default: true,
    }]);

    if (!stageNow) {
      Logger.info('Please stage your changes first using "git add" or run with --stage-all');
      return;
    }

    await gitAnalyzer.stageAll();
    Logger.success('Changes staged successfully');
  }

  // Get staged changes
  const changeInfo = await gitAnalyzer.getStagedChanges();
  
  if (!changeInfo.diff.trim()) {
    Logger.warn('No meaningful changes detected in staged files.');
    return;
  }

  // Display change summary
  console.log(chalk.blue('\n📊 Change Summary:'));
  console.log(`  Files modified: ${chalk.cyan(changeInfo.files.length)}`);
  console.log(`  Additions: ${chalk.green(`+${changeInfo.additions}`)}`);
  console.log(`  Deletions: ${chalk.red(`-${changeInfo.deletions}`)}`);
  console.log(`  Branch: ${chalk.yellow(changeInfo.branch)}\n`);

  // Show file list
  if (changeInfo.files.length > 0) {
    console.log(chalk.blue('Modified files:'));
    changeInfo.files.slice(0, 10).forEach(file => {
      console.log(`  ${chalk.cyan('•')} ${file}`);
    });
    if (changeInfo.files.length > 10) {
      console.log(`  ${chalk.gray(`... and ${changeInfo.files.length - 10} more files`)}`);
    }
    console.log();
  }

  // Validate provider and model
  const aiGenerator = new AIGenerator(config);
  const selectedProvider = options.provider || config.defaultProvider;
  const selectedModel = options.model;

  if (!aiGenerator.validateProvider(selectedProvider)) {
    throw new Error(`Invalid provider: ${selectedProvider}`);
  }

  if (selectedModel && !aiGenerator.validateModel(selectedProvider, selectedModel)) {
    throw new Error(`Invalid model ${selectedModel} for provider ${selectedProvider}`);
  }

  // Generate commit message
  const generationOptions = {
    provider: selectedProvider,
    model: selectedModel,
    template: options.template,
    stream: options.stream !== false && config.options.streaming,
  };

  let commitMessage: string;

  if (generationOptions.stream) {
    // Streaming generation
    const spinner = ora('Generating commit message...').start();
    
    try {
      const stream = await aiGenerator.streamCommitMessage(
        gitAnalyzer.formatDiffForAI(changeInfo),
        generationOptions
      );

      let fullMessage = '';
      spinner.text = 'Generating';

      for await (const chunk of stream) {
        fullMessage += chunk;
        // Update spinner with preview (first 50 chars)
        const preview = fullMessage.replace(/\n/g, ' ').substring(0, 50);
        spinner.text = `Generating: ${preview}${fullMessage.length > 50 ? '...' : ''}`;
      }

      commitMessage = fullMessage.trim();
      spinner.succeed('Commit message generated!');
    } catch (error) {
      spinner.fail('Failed to generate commit message');
      throw error;
    }
  } else {
    // Non-streaming generation
    const spinner = ora('Generating commit message...').start();
    
    try {
      commitMessage = await aiGenerator.generateCommitMessage(
        gitAnalyzer.formatDiffForAI(changeInfo),
        generationOptions
      );
      spinner.succeed('Commit message generated!');
    } catch (error) {
      spinner.fail('Failed to generate commit message');
      throw error;
    }
  }

  // Display the generated message
  console.log(chalk.green('\n💬 Generated Commit Message:'));
  console.log(chalk.white('─'.repeat(50)));
  console.log(commitMessage);
  console.log(chalk.white('─'.repeat(50)));

  // Ask what to do with the message
  const actions = [];
  if (options.commit) {
    actions.push({ name: 'Commit with this message', value: 'commit' });
  }
  if (options.edit) {
    actions.push({ name: 'Edit and commit', value: 'edit' });
  }
  
  if (actions.length === 0) {
    actions.push(
      { name: 'Commit with this message', value: 'commit' },
      { name: 'Edit message before committing', value: 'edit' },
      { name: 'Copy to clipboard', value: 'copy' },
      { name: 'Just show message (no action)', value: 'show' }
    );
  }

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What would you like to do?',
    choices: actions,
  }]);

  switch (action) {
    case 'commit':
      await commitWithMessage(gitAnalyzer, commitMessage);
      break;
      
    case 'edit':
      const { editedMessage } = await inquirer.prompt([{
        type: 'editor',
        name: 'editedMessage',
        message: 'Edit your commit message:',
        default: commitMessage,
      }]);
      
      if (editedMessage.trim()) {
        await commitWithMessage(gitAnalyzer, editedMessage.trim());
      } else {
        Logger.warn('Empty commit message. Commit cancelled.');
      }
      break;
      
    case 'copy':
      // Copy to clipboard (simplified - would need clipboard package for full implementation)
      console.log(chalk.yellow('📋 Message ready to copy:'));
      console.log(commitMessage);
      Logger.info('Copy the message above and use: git commit -m "YOUR_MESSAGE"');
      break;
      
    case 'show':
      Logger.info('Message displayed above. Use: git commit -m "YOUR_MESSAGE"');
      break;
  }
}

async function commitWithMessage(gitAnalyzer: GitAnalyzer, message: string): Promise<void> {
  const spinner = ora('Creating commit...').start();
  
  try {
    await gitAnalyzer.commit(message);
    spinner.succeed(chalk.green('✨ Commit created successfully!'));
    
    // Show recent commits
    console.log(chalk.blue('\n📋 Recent commits:'));
    const recentCommits = await gitAnalyzer.getRecentCommits(3);
    recentCommits.forEach(commit => {
      console.log(`  ${chalk.cyan('•')} ${commit}`);
    });
  } catch (error) {
    spinner.fail('Failed to create commit');
    throw error;
  }
}