import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../../core/config/manager.js';
import { PROVIDERS } from '../../core/ai/providers.js';
import { Logger } from '../../utils/Logger.js';
import { AIGenerator } from '../../core/ai/generator.js';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize PR Description CLI with interactive setup')
    .option('--force', 'Overwrite existing configuration')
    .option('--provider <provider>', 'Skip provider selection and use specified provider')
    .action(async (options) => {
      try {
        await initCommand(options);
      } catch (error) {
        Logger.error(`Initialization failed: ${(error as Error).message}`);
        process.exit(1);
      }
    });
}

async function initCommand(options: { force?: boolean; provider?: string }): Promise<void> {
  console.log(chalk.cyan('🚀 Welcome to PR Description CLI Setup!\n'));

  const configManager = ConfigManager.getInstance();
  
  // Check if config already exists
  if (!options.force && await configManager.exists()) {
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: 'Configuration file already exists. Do you want to overwrite it?',
      default: false,
    }]);
    
    if (!overwrite) {
      Logger.info('Setup cancelled. Use --force to overwrite existing configuration.');
      return;
    }
  }

  const config = await configManager.load();

  // Provider selection
  let selectedProviders: string[] = [];
  if (options.provider) {
    if (!PROVIDERS[options.provider]) {
      throw new Error(`Invalid provider: ${options.provider}`);
    }
    selectedProviders = [options.provider];
  } else {
    const { providers } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'providers',
      message: 'Which AI providers would you like to configure?',
      choices: Object.keys(PROVIDERS).map(key => ({
        name: `${PROVIDERS[key].name} (${key})`,
        value: key,
      })),
      validate: (input) => input.length > 0 || 'Please select at least one provider',
    }]);
    selectedProviders = providers;
  }

  // Configure each selected provider
  for (const provider of selectedProviders) {
    console.log(chalk.blue(`\n📋 Configuring ${PROVIDERS[provider].name}...`));
    
    const { apiKey } = await inquirer.prompt([{
      type: 'password',
      name: 'apiKey',
      message: `Enter your ${PROVIDERS[provider].name} API key:`,
      validate: (input) => input.trim().length > 0 || 'API key is required',
      mask: '*',
    }]);

    const { model } = await inquirer.prompt([{
      type: 'list',
      name: 'model',
      message: `Select default model for ${PROVIDERS[provider].name}:`,
      choices: PROVIDERS[provider].models,
      default: config.providers[provider as keyof typeof config.providers]?.defaultModel,
    }]);

    // Update configuration
    const providerKey = provider as keyof typeof config.providers;
    config.providers[providerKey] = {
      ...config.providers[providerKey],
      apiKey,
      defaultModel: model,
      enabled: true,
    };

    // Test the connection
    const spinner = ora(`Testing ${PROVIDERS[provider].name} connection...`).start();
    try {
      const generator = new AIGenerator(config);
      const isWorking = await generator.testConnection(provider, model);
      
      if (isWorking) {
        spinner.succeed(`${PROVIDERS[provider].name} connection successful!`);
      } else {
        spinner.fail(`${PROVIDERS[provider].name} connection failed`);
        const { continueAnyway } = await inquirer.prompt([{
          type: 'confirm',
          name: 'continueAnyway',
          message: 'Connection test failed. Continue anyway?',
          default: false,
        }]);
        
        if (!continueAnyway) {
          config.providers[providerKey].enabled = false;
        }
      }
    } catch (error) {
      spinner.fail(`${PROVIDERS[provider].name} connection failed: ${(error as Error).message}`);
      config.providers[providerKey].enabled = false;
    }
  }

  // Set default provider
  const enabledProviders = selectedProviders.filter(p => 
    config.providers[p as keyof typeof config.providers]?.enabled
  );

  if (enabledProviders.length === 0) {
    throw new Error('No providers are enabled. Please check your API keys and try again.');
  }

  if (enabledProviders.length === 1) {
    config.defaultProvider = enabledProviders[0] as any;
    Logger.info(`Default provider set to ${PROVIDERS[enabledProviders[0]].name}`);
  } else {
    const { defaultProvider } = await inquirer.prompt([{
      type: 'list',
      name: 'defaultProvider',
      message: 'Select your default provider:',
      choices: enabledProviders.map(p => ({
        name: PROVIDERS[p].name,
        value: p,
      })),
    }]);
    config.defaultProvider = defaultProvider;
  }

  // Configure additional options
  console.log(chalk.blue('\n⚙️ Additional Configuration...'));
  
  const { streaming, maxTokens, temperature } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'streaming',
      message: 'Enable streaming responses for better user experience?',
      default: config.options.streaming,
    },
    {
      type: 'number',
      name: 'maxTokens',
      message: 'Maximum tokens per response:',
      default: config.options.maxTokens,
      validate: (input) => input > 0 && input <= 4000 || 'Please enter a value between 1 and 4000',
    },
    {
      type: 'number',
      name: 'temperature',
      message: 'Temperature (creativity) - 0.0 to 2.0:',
      default: config.options.temperature,
      validate: (input) => input >= 0 && input <= 2 || 'Please enter a value between 0.0 and 2.0',
    },
  ]);

  config.options = { streaming, maxTokens, temperature };

  // Git hooks configuration
  const { enableHooks } = await inquirer.prompt([{
    type: 'confirm',
    name: 'enableHooks',
    message: 'Would you like to install Git hooks for automatic commit message generation?',
    default: false,
  }]);

  if (enableHooks) {
    const { hooks } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'hooks',
      message: 'Select Git hooks to install:',
      choices: [
        { name: 'prepare-commit-msg (generate commit message)', value: 'commitMsg' },
        { name: 'pre-commit (validate before commit)', value: 'preCommit' },
      ],
    }]);

    config.gitHooks = {
      enabled: true,
      commitMsg: hooks.includes('commitMsg'),
      preCommit: hooks.includes('preCommit'),
    };
  }

  // Analytics
  const { enableAnalytics } = await inquirer.prompt([{
    type: 'confirm',
    name: 'enableAnalytics',
    message: 'Enable anonymous usage analytics to help improve the tool?',
    default: config.analytics.enabled,
  }]);

  config.analytics.enabled = enableAnalytics;

  // Save configuration
  const saveSpinner = ora('Saving configuration...').start();
  try {
    await configManager.update(config);
    saveSpinner.succeed('Configuration saved successfully!');
  } catch (error) {
    saveSpinner.fail('Failed to save configuration');
    throw error;
  }

  // Install Git hooks if enabled
  if (config.gitHooks.enabled) {
    const { installHooksNow } = await inquirer.prompt([{
      type: 'confirm',
      name: 'installHooksNow',
      message: 'Install Git hooks now?',
      default: true,
    }]);

    if (installHooksNow) {
      Logger.info('Installing Git hooks...');
      // This will be implemented in the hooks command
      Logger.warn('Git hooks installation not yet implemented. Run "gitvibe hooks install" later.');
    }
  }

  // Success message
  console.log(chalk.green(`
  ✅ Setup completed successfully!
  
  Your configuration:
  • Default provider: ${PROVIDERS[config.defaultProvider].name}
  • Enabled providers: ${enabledProviders.map(p => PROVIDERS[p].name).join(', ')}
  • Streaming: ${config.options.streaming ? 'enabled' : 'disabled'}
  • Git hooks: ${config.gitHooks.enabled ? 'enabled' : 'disabled'}
  
  Quick start:
  • ${chalk.cyan('gitvibe commit')} - Generate commit message
  • ${chalk.cyan('gitvibe pr')} - Generate PR description
  • ${chalk.cyan('gitvibe config')} - Manage configuration
  
  Happy coding! 🎉
  `));
}