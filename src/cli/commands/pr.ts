import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../../core/config/manager.js';
import { AIGenerator } from '../../core/ai/generator.js';
import { GitAnalyzer } from '../../core/git/analyzer.js';
import { Logger } from '../../utils/Logger.js';

export function registerPRCommand(program: Command): void {
  program
    .command('pr')
    .alias('pull-request')
    .description('Generate AI-powered PR description from branch changes')
    .option('-p, --provider <provider>', 'AI provider to use (openai, anthropic, google)')
    .option('-m, --model <model>', 'Specific model to use')
    .option('-t, --template <template>', 'Template to use (default, detailed, custom name)')
    .option('-b, --branch <branch>', 'Compare against specific branch (default: main)')
    .option('--no-stream', 'Disable streaming output')
    .option('-o, --output <file>', 'Save PR description to file')
    .option('--format <format>', 'Output format (markdown, text)', 'markdown')
    .action(async (options) => {
      try {
        await prCommand(options);
      } catch (error) {
        Logger.error(`PR description generation failed: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}

interface PROptions {
  provider?: string;
  model?: string;
  template?: string;
  branch?: string;
  stream?: boolean;
  output?: string;
  format?: 'markdown' | 'text';
}

async function prCommand(options: PROptions): Promise<void> {
  const configManager = ConfigManager.getInstance();
  const config = await configManager.load();
  const gitAnalyzer = new GitAnalyzer();

  // Check if we're in a git repository
  if (!await gitAnalyzer.isGitRepository()) {
    throw new Error('Not in a Git repository. Please run this command from within a Git repository.');
  }

  // Get current branch
  const currentBranch = await gitAnalyzer.getCurrentBranch();
  
  if (currentBranch === 'main' || currentBranch === 'master') {
    Logger.warn(`You're currently on the ${currentBranch} branch. PR descriptions are typically generated for feature branches.`);
    
    const { proceed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: 'Continue anyway?',
      default: false,
    }]);
    
    if (!proceed) {
      return;
    }
  }

  // Determine target branch
  const targetBranch = options.branch || await detectMainBranch(gitAnalyzer);
  Logger.info(`Comparing ${currentBranch} against ${targetBranch}`);

  // Get branch diff
  let changeInfo;
  try {
    changeInfo = await gitAnalyzer.getBranchDiff(targetBranch);
  } catch (error) {
    // Fallback to all changes if branch comparison fails
    Logger.warn(`Failed to compare with ${targetBranch}, using all changes`);
    changeInfo = await gitAnalyzer.getAllChanges();
  }

  if (!changeInfo.diff.trim()) {
    Logger.warn('No changes detected between branches.');
    return;
  }

  // Display change summary
  console.log(chalk.blue('\n📊 PR Summary:'));
  console.log(`  Current branch: ${chalk.cyan(currentBranch)}`);
  console.log(`  Target branch: ${chalk.cyan(targetBranch)}`);
  console.log(`  Files modified: ${chalk.cyan(changeInfo.files.length)}`);
  console.log(`  Additions: ${chalk.green(`+${changeInfo.additions}`)}`);
  console.log(`  Deletions: ${chalk.red(`-${changeInfo.deletions}`)}`);

  // Show file list
  if (changeInfo.files.length > 0) {
    console.log(chalk.blue('\nModified files:'));
    const filesToShow = changeInfo.files.slice(0, 15);
    filesToShow.forEach(file => {
      console.log(`  ${chalk.cyan('•')} ${file}`);
    });
    if (changeInfo.files.length > 15) {
      console.log(`  ${chalk.gray(`... and ${changeInfo.files.length - 15} more files`)}`);
    }
    console.log();
  }

  // Get recent commits for context
  const recentCommits = await gitAnalyzer.getRecentCommits(5);
  if (recentCommits.length > 0) {
    console.log(chalk.blue('Recent commits:'));
    recentCommits.forEach(commit => {
      console.log(`  ${chalk.cyan('•')} ${commit}`);
    });
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

  // Generate PR description
  const generationOptions = {
    provider: selectedProvider,
    model: selectedModel,
    template: options.template,
    stream: options.stream !== false && config.options.streaming,
  };

  let prDescription: string;

  if (generationOptions.stream) {
    // Streaming generation
    console.log(chalk.blue('🤖 Generating PR description...\n'));
    
    try {
      const stream = await aiGenerator.streamPRDescription(
        gitAnalyzer.formatDiffForAI(changeInfo),
        generationOptions
      );

      let fullDescription = '';
      process.stdout.write(chalk.gray('> '));

      for await (const chunk of stream) {
        fullDescription += chunk;
        process.stdout.write(chunk);
      }

      prDescription = fullDescription.trim();
      console.log(); // New line after streaming
    } catch (error) {
      Logger.error('Failed to generate PR description');
      throw error;
    }
  } else {
    // Non-streaming generation
    const spinner = ora('Generating PR description...').start();
    
    try {
      prDescription = await aiGenerator.generatePRDescription(
        gitAnalyzer.formatDiffForAI(changeInfo),
        generationOptions
      );
      spinner.succeed('PR description generated!');
    } catch (error) {
      spinner.fail('Failed to generate PR description');
      throw error;
    }
  }

  // Display the generated description
  if (!generationOptions.stream) {
    console.log(chalk.green('\n📝 Generated PR Description:'));
    console.log(chalk.white('═'.repeat(60)));
    console.log(prDescription);
    console.log(chalk.white('═'.repeat(60)));
  }

  // Handle output options
  if (options.output) {
    await saveToFile(options.output, prDescription, options.format || 'markdown');
  } else {
    // Ask what to do with the description
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do with the PR description?',
      choices: [
        { name: 'Copy to clipboard', value: 'copy' },
        { name: 'Save to file', value: 'save' },
        { name: 'Edit description', value: 'edit' },
        { name: 'Open in browser (if GitHub)', value: 'browser' },
        { name: 'Just display', value: 'display' },
      ],
    }]);

    switch (action) {
      case 'copy':
        console.log(chalk.yellow('\n📋 PR Description (copy this):'));
        console.log(chalk.white('─'.repeat(50)));
        console.log(prDescription);
        console.log(chalk.white('─'.repeat(50)));
        Logger.info('Copy the description above for your PR');
        break;

      case 'save':
        const { filename } = await inquirer.prompt([{
          type: 'input',
          name: 'filename',
          message: 'Enter filename to save:',
          default: 'pr-description.md',
        }]);
        await saveToFile(filename, prDescription, options.format || 'markdown');
        break;

      case 'edit':
        const { editedDescription } = await inquirer.prompt([{
          type: 'editor',
          name: 'editedDescription',
          message: 'Edit your PR description:',
          default: prDescription,
        }]);
        
        if (editedDescription.trim()) {
          console.log(chalk.green('\n📝 Final PR Description:'));
          console.log(chalk.white('═'.repeat(60)));
          console.log(editedDescription.trim());
          console.log(chalk.white('═'.repeat(60)));
        }
        break;

      case 'browser':
        Logger.info('GitHub CLI integration not yet implemented.');
        Logger.info('Copy the description above and create your PR manually.');
        break;

      case 'display':
        Logger.info('PR description displayed above');
        break;
    }
  }

  // Suggest next steps
  console.log(chalk.blue('\n💡 Next steps:'));
  console.log(`  • Create PR: ${chalk.cyan(`gh pr create --title "Your PR Title" --body-file pr-description.md`)}`);
  console.log(`  • Or use GitHub web interface with the generated description`);
  console.log(`  • Consider running: ${chalk.cyan('gitvibe commit')} for any final commits`);
}

async function detectMainBranch(gitAnalyzer: GitAnalyzer): Promise<string> {
  const branches = await gitAnalyzer.getLocalBranches();
  
  if (branches.includes('main')) {
    return 'main';
  } else if (branches.includes('master')) {
    return 'master';
  } else if (branches.includes('develop')) {
    return 'develop';
  }
  
  // Ask user to specify
  const currentBranch = await gitAnalyzer.getCurrentBranch();
  const { targetBranch } = await inquirer.prompt([{
    type: 'list',
    name: 'targetBranch',
    message: 'Select target branch for PR comparison:',
    choices: branches.filter(b => b !== currentBranch),
  }]);
  
  return targetBranch;
}

async function saveToFile(filename: string, content: string, format: string): Promise<void> {
  const fs = await import('fs/promises');
  
  try {
    let fileContent = content;
    
    if (format === 'text' && filename.endsWith('.md')) {
      // Convert markdown to plain text (basic conversion)
      fileContent = content
        .replace(/^#+ /gm, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1');
    }
    
    await fs.writeFile(filename, fileContent, 'utf-8');
    Logger.success(`PR description saved to: ${filename}`);
  } catch (error) {
    Logger.error(`Failed to save file: ${(error as Error).message}`);
    throw error;
  }
}