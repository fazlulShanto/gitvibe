import { generateText, streamText } from 'ai';
import type { LanguageModel } from 'ai';
import { AIProviderManager } from './providers.js';
import { CLIConfig } from '../config/schema.js';
import { Logger } from '../utils/Logger.js';

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

  private chunkDiff(diff: string): string[] {
    const maxSize = this.config.options.maxDiffSize;
    const overlap = this.config.options.chunkOverlap;

    if (diff.length <= maxSize) {
      return [diff];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < diff.length) {
      let end = start + maxSize;

      // If we're not at the end, try to find a good breaking point
      if (end < diff.length) {
        // Look for a line break near the end
        const lastNewline = diff.lastIndexOf('\n', end);
        if (lastNewline > start + maxSize * 0.8) {
          end = lastNewline;
        }
      }

      chunks.push(diff.slice(start, end));

      // Move start position with overlap
      start = Math.max(start + 1, end - overlap);
    }

    return chunks;
  }

  public async generateCommitMessage(
    gitDiff: string,
    options: GenerationOptions = {}
  ): Promise<string> {
    const chunks = this.chunkDiff(gitDiff);

    if (chunks.length === 1) {
      // Use the original method for small diffs
      return this.generateCommitMessageFromChunk(gitDiff, options);
    }

    // For commit messages, use the first chunk as it's typically the most important
    // and commit messages should be concise
    Logger.info(`Diff is large (${gitDiff.length} characters), using first chunk for commit message generation`);
    return this.generateCommitMessageFromChunk(chunks[0], options);
  }

  private async generateCommitMessageFromChunk(
    gitDiff: string,
    options: GenerationOptions = {}
  ): Promise<string> {
    const template = this.getTemplate('commit', options.template);
    const prompt = this.buildPrompt(template, { diff: gitDiff });

    const model = await this.providerManager.getModel(options.provider, options.model);
    const maxOutputTokens = options.maxOutputTokens || this.config.options.maxOutputTokens;
    const temperature = options.temperature || this.config.options.temperature;

    const { text } = await generateText({
      model,
      prompt,
      maxOutputTokens: Math.min(maxOutputTokens, 100), // Commit messages should be short
      temperature,
    });

    return text.trim();
  }

  public async streamCommitMessage(
    gitDiff: string,
    options: GenerationOptions = {}
  ): Promise<AsyncIterable<string>> {
    const chunks = this.chunkDiff(gitDiff);

    if (chunks.length === 1) {
      // Use the original method for small diffs
      return this.streamCommitMessageFromChunk(gitDiff, options);
    }

    // For streaming with large diffs, use the first chunk for commit messages
    Logger.info(`Diff is large (${gitDiff.length} characters), streaming commit message with first chunk only`);
    return this.streamCommitMessageFromChunk(chunks[0], options);
  }

  private async streamCommitMessageFromChunk(
    gitDiff: string,
    options: GenerationOptions = {}
  ): Promise<AsyncIterable<string>> {
    const template = this.getTemplate('commit', options.template);
    const prompt = this.buildPrompt(template, { diff: gitDiff });

    const model = await this.providerManager.getModel(options.provider, options.model);
    const maxOutputTokens = options.maxOutputTokens || this.config.options.maxOutputTokens;
    const temperature = options.temperature || this.config.options.temperature;

    const { textStream } = await streamText({
      model,
      prompt,
      maxOutputTokens: Math.min(maxOutputTokens, 100),
      temperature,
    });

    return textStream;
  }

  public async generatePRDescription(
    gitDiff: string,
    options: GenerationOptions = {}
  ): Promise<string> {
    const chunks = this.chunkDiff(gitDiff);

    if (chunks.length === 1) {
      // Use the original method for small diffs
      return this.generatePRDescriptionFromChunk(gitDiff, options);
    }

    // Process chunks and combine results
    const chunkSummaries: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      Logger.info(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} characters)`);

      try {
        const summary = await this.generatePRDescriptionFromChunk(chunk, {
          ...options,
          template: 'chunk_summary' // Use a special template for chunks
        });
        chunkSummaries.push(summary);
      } catch (error) {
        Logger.error(`Failed to process chunk ${i + 1}: ${(error as Error).message}`);
        // Continue with other chunks
      }
    }

    if (chunkSummaries.length === 0) {
      throw new Error('Failed to process any chunks');
    }

    // Combine all chunk summaries into final PR description
    const combinedSummaries = chunkSummaries.join('\n\n---\n\n');
    const finalPrompt = `Based on the following summaries of different parts of the git diff, create a comprehensive PR description:

${combinedSummaries}

Please create a cohesive PR description that covers all the changes mentioned in the summaries.`;

    const model = await this.providerManager.getModel(options.provider, options.model);
    const maxOutputTokens = options.maxOutputTokens || this.config.options.maxOutputTokens;
    const temperature = options.temperature || this.config.options.temperature;

    try {
      const { text } = await generateText({
        model,
        prompt: finalPrompt,
        maxOutputTokens,
        temperature,
      });

      Logger.info('PR description generated successfully from chunks');
      return text.trim();
    } catch (error) {
      Logger.error(`Failed to generate final PR description: ${(error as Error).message}`);
      throw error;
    }
  }

  private async generatePRDescriptionFromChunk(
    gitDiff: string,
    options: GenerationOptions = {}
  ): Promise<string> {
    const template = this.getTemplate('pr', options.template);
    const prompt = this.buildPrompt(template, { diff: gitDiff });

    const model = await this.providerManager.getModel(options.provider, options.model);
    const maxOutputTokens = options.maxOutputTokens || this.config.options.maxOutputTokens;
    const temperature = options.temperature || this.config.options.temperature;

    const { text } = await generateText({
      model,
      prompt,
      maxOutputTokens,
      temperature,
    });

    return text.trim();
  }

  public async streamPRDescription(
    gitDiff: string,
    options: GenerationOptions = {}
  ): Promise<AsyncIterable<string>> {
    const chunks = this.chunkDiff(gitDiff);

    if (chunks.length === 1) {
      // Use the original method for small diffs
      return this.streamPRDescriptionFromChunk(gitDiff, options);
    }

    // For streaming with large diffs, we can't easily combine chunks
    // So we'll use the first chunk for streaming
    Logger.info(`Diff is large (${gitDiff.length} characters), streaming with first chunk only`);
    return this.streamPRDescriptionFromChunk(chunks[0], options);
  }

  private async streamPRDescriptionFromChunk(
    gitDiff: string,
    options: GenerationOptions = {}
  ): Promise<AsyncIterable<string>> {
    const template = this.getTemplate('pr', options.template);
    const prompt = this.buildPrompt(template, { diff: gitDiff });

    const model = await this.providerManager.getModel(options.provider, options.model);
    const maxOutputTokens = options.maxOutputTokens || this.config.options.maxOutputTokens;
    const temperature = options.temperature || this.config.options.temperature;

    const { textStream } = await streamText({
      model,
      prompt,
      maxOutputTokens,
      temperature,
    });

    return textStream;
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
      const testModel = await this.providerManager.getModel(provider, model);
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