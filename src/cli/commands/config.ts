import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as yaml from 'yaml';
import { ConfigManager } from '../../core/config/manager.js';
import { PROVIDERS } from '../../core/ai/providers.js';
import { Logger } from '../../utils/Logger.js';
import { AIGenerator } from '../../core/ai/generator.js';

export function registerConfigCommand(program: Command): void {
  const configCmd = program
    .command('config')
    .description('Manage PR Description CLI configuration');

  // Show current configuration
  configCmd
    .command('show')
    .alias('list')
    .description('Show current configuration')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      try {
        await showConfig(options);
      } catch (error) {
        Logger.error(`Failed to show configuration: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Set configuration value
  configCmd
    .command('set <key> <value>')
    .description('Set a configuration value')
    .option('--provider <provider>', 'Set value for specific provider')
    .action(async (key: string, value: string, options) => {
      try {
        await setConfig(key, value, options);
      } catch (error) {
        Logger.error(`Failed to set configuration: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Get configuration value
  configCmd
    .command('get <key>')
    .description('Get a configuration value')
    .option('--provider <provider>', 'Get value for specific provider')
    .action(async (key: string, options) => {
      try {
        await getConfig(key, options);
      } catch (error) {
        Logger.error(`Failed to get configuration: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Interactive configuration editor
  configCmd
    .command('edit')
    .alias('interactive')
    .description('Interactive configuration editor')
    .action(async () => {
      try {
        await editConfig();
      } catch (error) {
        Logger.error(`Configuration edit failed: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Reset configuration to defaults
  configCmd
    .command('reset')
    .description('Reset configuration to defaults')
    .option('--confirm', 'Skip confirmation prompt')
    .action(async (options) => {
      try {
        await resetConfig(options);
      } catch (error) {
        Logger.error(`Failed to reset configuration: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Validate configuration
  configCmd
    .command('validate')
    .description('Validate current configuration')
    .action(async () => {
      try {
        await validateConfig();
      } catch (error) {
        Logger.error(`Configuration validation failed: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Manage templates
  configCmd
    .command('templates')
    .description('Manage prompt templates')
    .action(async () => {
      try {
        await manageTemplates();
      } catch (error) {
        Logger.error(`Template management failed: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Show configuration path
  configCmd
    .command('path')
    .description('Show configuration file path')
    .action(() => {
      const configManager = ConfigManager.getInstance();
      console.log(configManager.getConfigPath());
    });
}

async function showConfig(options: { json?: boolean }): Promise<void> {
  const configManager = ConfigManager.getInstance();
  const config = await configManager.load();

  if (options.json) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  console.log(chalk.blue('📋 Current Configuration\n'));

  // Providers section
  console.log(chalk.yellow('🤖 AI Providers:'));
  console.log(`  Default: ${chalk.cyan(config.defaultProvider)}`);
  
  for (const [key, provider] of Object.entries(config.providers)) {
    const status = provider.enabled && provider.apiKey ? '✅' : '❌';
    const keyStatus = provider.apiKey ? '🔑' : '🚫';
    console.log(`  ${status} ${chalk.cyan(key)}: ${provider.defaultModel} ${keyStatus}`);
  }

  // Options section
  console.log(chalk.yellow('\n⚙️ Options:'));
  console.log(`  Streaming: ${config.options.streaming ? '✅' : '❌'}`);
  console.log(`  Max tokens: ${chalk.cyan(config.options.maxTokens)}`);
  console.log(`  Temperature: ${chalk.cyan(config.options.temperature)}`);

  // Git hooks section
  console.log(chalk.yellow('\n🪝 Git Hooks:'));
  console.log(`  Enabled: ${config.gitHooks.enabled ? '✅' : '❌'}`);
  if (config.gitHooks.enabled) {
    console.log(`  Commit message hook: ${config.gitHooks.commitMsg ? '✅' : '❌'}`);
    console.log(`  Pre-commit hook: ${config.gitHooks.preCommit ? '✅' : '❌'}`);
  }

  // Templates section
  console.log(chalk.yellow('\n📝 Templates:'));
  const commitCustomCount = Object.keys(config.templates.commit.custom).length;
  const prCustomCount = Object.keys(config.templates.pr.custom).length;
  console.log(`  Commit templates: default, conventional${commitCustomCount > 0 ? `, +${commitCustomCount} custom` : ''}`);
  console.log(`  PR templates: default, detailed${prCustomCount > 0 ? `, +${prCustomCount} custom` : ''}`);

  // Analytics section
  console.log(chalk.yellow('\n📊 Analytics:'));
  console.log(`  Enabled: ${config.analytics.enabled ? '✅' : '❌'}`);
  console.log(`  Anonymous: ${config.analytics.anonymous ? '✅' : '❌'}`);

  console.log(chalk.gray('\n💡 Use "gitvibe config edit" for interactive editing'));
}

async function setConfig(key: string, value: string, options: { provider?: string }): Promise<void> {
  const configManager = ConfigManager.getInstance();
  const config = await configManager.load();

  // Parse the key and value
  const keyParts = key.split('.');
  
  try {
    if (options.provider && keyParts[0] === 'providers') {
      // Provider-specific setting
      const provider = options.provider as keyof typeof config.providers;
      if (!config.providers[provider]) {
        throw new Error(`Unknown provider: ${provider}`);
      }
      
      const providerKey = keyParts[1] as keyof typeof config.providers[typeof provider];
      
      if (providerKey === 'apiKey') {
        config.providers[provider].apiKey = value;
      } else if (providerKey === 'defaultModel') {
        config.providers[provider].defaultModel = value;
      } else if (providerKey === 'enabled') {
        config.providers[provider].enabled = value.toLowerCase() === 'true';
      } else {
        throw new Error(`Unknown provider setting: ${providerKey}`);
      }
    } else {
      // General settings
      switch (key) {
        case 'defaultProvider':
          if (!Object.keys(PROVIDERS).includes(value)) {
            throw new Error(`Invalid provider: ${value}`);
          }
          config.defaultProvider = value as any;
          break;
          
        case 'options.streaming':
          config.options.streaming = value.toLowerCase() === 'true';
          break;
          
        case 'options.maxTokens':
          const maxTokens = parseInt(value);
          if (isNaN(maxTokens) || maxTokens <= 0) {
            throw new Error('Max tokens must be a positive number');
          }
          config.options.maxTokens = maxTokens;
          break;
          
        case 'options.temperature':
          const temperature = parseFloat(value);
          if (isNaN(temperature) || temperature < 0 || temperature > 2) {
            throw new Error('Temperature must be between 0.0 and 2.0');
          }
          config.options.temperature = temperature;
          break;
          
        case 'gitHooks.enabled':
          config.gitHooks.enabled = value.toLowerCase() === 'true';
          break;
          
        case 'analytics.enabled':
          config.analytics.enabled = value.toLowerCase() === 'true';
          break;
          
        default:
          throw new Error(`Unknown configuration key: ${key}`);
      }
    }

    await configManager.update(config);
    Logger.success(`Configuration updated: ${key} = ${value}`);
    
  } catch (error) {
    throw new Error(`Invalid value for ${key}: ${(error as Error).message}`);
  }
}

async function getConfig(key: string, options: { provider?: string }): Promise<void> {
  const configManager = ConfigManager.getInstance();
  const config = await configManager.load();

  const keyParts = key.split('.');
  
  if (options.provider && keyParts[0] === 'providers') {
    const provider = options.provider as keyof typeof config.providers;
    if (!config.providers[provider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    const providerKey = keyParts[1] as keyof typeof config.providers[typeof provider];
    const value = config.providers[provider][providerKey];
    console.log(value);
  } else {
    // Navigate through the config object
    let value: any = config;
    for (const part of keyParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        throw new Error(`Configuration key not found: ${key}`);
      }
    }
    console.log(value);
  }
}

async function editConfig(): Promise<void> {
  const configManager = ConfigManager.getInstance();
  const config = await configManager.load();

  const { section } = await inquirer.prompt([{
    type: 'list',
    name: 'section',
    message: 'What would you like to configure?',
    choices: [
      { name: '🤖 AI Providers & Models', value: 'providers' },
      { name: '⚙️ Generation Options', value: 'options' },
      { name: '📝 Custom Templates', value: 'templates' },
      { name: '🪝 Git Hooks', value: 'hooks' },
      { name: '📊 Analytics', value: 'analytics' },
      { name: '🔄 Reset to Defaults', value: 'reset' },
    ],
  }]);

  switch (section) {
    case 'providers':
      await editProviders(configManager, config);
      break;
    case 'options':
      await editOptions(configManager, config);
      break;
    case 'templates':
      await editTemplates(configManager, config);
      break;
    case 'hooks':
      await editHooks(configManager, config);
      break;
    case 'analytics':
      await editAnalytics(configManager, config);
      break;
    case 'reset':
      await resetConfig({ confirm: false });
      break;
  }
}

async function editProviders(configManager: ConfigManager, config: any): Promise<void> {
  // Implementation for provider editing
  Logger.info('Provider editing not fully implemented yet');
}

async function editOptions(configManager: ConfigManager, config: any): Promise<void> {
  // Implementation for options editing
  Logger.info('Options editing not fully implemented yet');
}

async function editTemplates(configManager: ConfigManager, config: any): Promise<void> {
  // Implementation for template editing
  Logger.info('Template editing not fully implemented yet');
}

async function editHooks(configManager: ConfigManager, config: any): Promise<void> {
  // Implementation for hooks editing
  Logger.info('Hooks editing not fully implemented yet');
}

async function editAnalytics(configManager: ConfigManager, config: any): Promise<void> {
  // Implementation for analytics editing
  Logger.info('Analytics editing not fully implemented yet');
}

async function resetConfig(options: { confirm?: boolean }): Promise<void> {
  if (!options.confirm) {
    const { shouldReset } = await inquirer.prompt([{
      type: 'confirm',
      name: 'shouldReset',
      message: chalk.red('This will reset ALL configuration to defaults. Continue?'),
      default: false,
    }]);
    
    if (!shouldReset) {
      Logger.info('Reset cancelled');
      return;
    }
  }

  const configManager = ConfigManager.getInstance();
  await configManager.reset();
  Logger.success('Configuration reset to defaults');
}

async function validateConfig(): Promise<void> {
  const configManager = ConfigManager.getInstance();
  const config = await configManager.load();

  console.log(chalk.blue('🔍 Validating configuration...\n'));

  let isValid = true;
  const issues: string[] = [];

  // Check providers
  const enabledProviders = Object.keys(config.providers).filter(key => {
    const provider = config.providers[key as keyof typeof config.providers];
    return provider?.enabled && provider?.apiKey;
  });

  if (enabledProviders.length === 0) {
    issues.push('❌ No enabled providers with API keys');
    isValid = false;
  } else {
    console.log(`✅ ${enabledProviders.length} provider(s) enabled`);
  }

  // Test connections
  if (enabledProviders.length > 0) {
    console.log(chalk.blue('\n🔌 Testing provider connections...'));
    const aiGenerator = new AIGenerator(config);

    for (const provider of enabledProviders) {
      const isWorking = await aiGenerator.testConnection(provider);
      if (isWorking) {
        console.log(`✅ ${PROVIDERS[provider].name} connection working`);
      } else {
        console.log(`❌ ${PROVIDERS[provider].name} connection failed`);
        issues.push(`❌ ${PROVIDERS[provider].name} API connection failed`);
        isValid = false;
      }
    }
  }

  // Check configuration values
  if (config.options.maxTokens <= 0 || config.options.maxTokens > 4000) {
    issues.push('❌ Invalid maxTokens value');
    isValid = false;
  }

  if (config.options.temperature < 0 || config.options.temperature > 2) {
    issues.push('❌ Invalid temperature value');
    isValid = false;
  }

  // Summary
  console.log(chalk.blue('\n📋 Validation Results:'));
  if (isValid) {
    console.log(chalk.green('✅ Configuration is valid and ready to use!'));
  } else {
    console.log(chalk.red('❌ Configuration has issues:'));
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log(chalk.yellow('\n💡 Run "gitvibe config edit" to fix these issues'));
  }
}

async function manageTemplates(): Promise<void> {
  Logger.info('Template management not fully implemented yet');
  Logger.info('Use configuration file editing for now');
}