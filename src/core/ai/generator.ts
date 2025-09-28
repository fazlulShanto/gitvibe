import { generateText, streamText } from 'ai';
import type { LanguageModel } from 'ai';
import { AIProviderManager } from './providers.js';
import { CLIConfig } from '../config/schema.js';
import { Logger } from '../../utils/Logger.js';

export interface GenerationOptions {
  provider?: string;
  model?: string;
  stream?: boolean;
  template?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export class AIGenerator {
  private providerManager: AIProviderManager;
  private config: CLIConfig;

  constructor(config: CLIConfig) {
    this.config = config;
    this.providerManager = new AIProviderManager(config);
  }

  private buildPrompt(template: string, variables: Record<string, string>): string {
    let prompt = template;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return prompt;
  }

  public async generateCommitMessage(
    gitDiff: string,
    options: GenerationOptions = {}
  ): Promise<string> {
    const template = this.getTemplate('commit', options.template);
    const prompt = this.buildPrompt(template, { diff: gitDiff });
    
    const model = this.providerManager.getModel(options.provider, options.model);
    const maxOutputTokens = options.maxOutputTokens || this.config.options.maxOutputTokens;
    const temperature = options.temperature || this.config.options.temperature;

    try {
      const { text } = await generateText({
        model,
        prompt,
        maxOutputTokens: Math.min(maxOutputTokens, 100), // Commit messages should be short
        temperature,
      });

      Logger.info('Commit message generated successfully');
      return text.trim();
    } catch (error) {
      Logger.error(`Failed to generate commit message: ${(error as Error).message}`);
      throw error;
    }
  }

  public async streamCommitMessage(
    gitDiff: string,
    options: GenerationOptions = {}
  ): Promise<AsyncIterable<string>> {
    const template = this.getTemplate('commit', options.template);
    const prompt = this.buildPrompt(template, { diff: gitDiff });
    
    const model = this.providerManager.getModel(options.provider, options.model);
    const maxOutputTokens = options.maxOutputTokens || this.config.options.maxOutputTokens;
    const temperature = options.temperature || this.config.options.temperature;

    try {
      const { textStream } = await streamText({
        model,
        prompt,
        maxOutputTokens: Math.min(maxOutputTokens, 100),
        temperature,
      });

      Logger.info('Started streaming commit message generation');
      return textStream;
    } catch (error) {
      Logger.error(`Failed to stream commit message: ${(error as Error).message}`);
      throw error;
    }
  }

  public async generatePRDescription(
    gitDiff: string,
    options: GenerationOptions = {}
  ): Promise<string> {
    const template = this.getTemplate('pr', options.template);
    const prompt = this.buildPrompt(template, { diff: gitDiff });
    
    const model = this.providerManager.getModel(options.provider, options.model);
    const maxOutputTokens = options.maxOutputTokens || this.config.options.maxOutputTokens;
    const temperature = options.temperature || this.config.options.temperature;

    try {
      const { text } = await generateText({
        model,
        prompt,
        maxOutputTokens,
        temperature,
      });

      Logger.info('PR description generated successfully');
      return text.trim();
    } catch (error) {
      Logger.error(`Failed to generate PR description: ${(error as Error).message}`);
      throw error;
    }
  }

  public async streamPRDescription(
    gitDiff: string,
    options: GenerationOptions = {}
  ): Promise<AsyncIterable<string>> {
    const template = this.getTemplate('pr', options.template);
    const prompt = this.buildPrompt(template, { diff: gitDiff });
    
    const model = this.providerManager.getModel(options.provider, options.model);
    const maxOutputTokens = options.maxOutputTokens || this.config.options.maxOutputTokens;
    const temperature = options.temperature || this.config.options.temperature;

    try {
      const { textStream } = await streamText({
        model,
        prompt,
        maxOutputTokens,
        temperature,
      });

      Logger.info('Started streaming PR description generation');
      return textStream;
    } catch (error) {
      Logger.error(`Failed to stream PR description: ${(error as Error).message}`);
      throw error;
    }
  }

  private getTemplate(type: 'commit' | 'pr', templateName?: string): string {
    const templates = this.config.templates[type];
    
    if (templateName) {
      // Check custom templates first
      if (templates.custom[templateName]) {
        return templates.custom[templateName];
      }
      
      // Check built-in templates
      if (templateName === 'conventional' && type === 'commit') {
        return (templates as any).conventional;
      }
      if (templateName === 'detailed' && type === 'pr') {
        return (templates as any).detailed;
      }
      
      Logger.error(`Template '${templateName}' not found, using default`);
    }

    return templates.default;
  }

  public async validateProvider(provider: string): Promise<boolean> {
    return this.providerManager.validateProvider(provider);
  }

  public async validateModel(provider: string, model: string): Promise<boolean> {
    return this.providerManager.validateModel(provider, model);
  }

  public getAvailableProviders(): string[] {
    return this.providerManager.getAvailableProviders();
  }

  public getProviderModels(provider: string): string[] {
    return this.providerManager.getProviderModels(provider);
  }

  public async testConnection(provider?: string, model?: string): Promise<boolean> {
    try {
      const testModel = this.providerManager.getModel(provider, model);
      await generateText({
        model: testModel,
        prompt: 'Hello',
        maxOutputTokens: 5,
      });
      return true;
    } catch (error) {
      Logger.error(`Connection test failed: ${(error as Error).message}`);
      return false;
    }
  }
}