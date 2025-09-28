import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import { CLIConfig } from '../config/schema.js';
import { ConfigManager } from '../config/manager.js';
import { AnthropicMessagesModelId } from '@ai-sdk/anthropic/internal';
import { OpenAIChatModelId } from '@ai-sdk/openai/internal';
import { GoogleGenerativeAIModelId } from '@ai-sdk/google/internal';
import { createGroq} from '@ai-sdk/groq';
import { Logger } from '../../utils/Logger.js';


export interface ProviderInfo {
  name: string;
  models: AnthropicMessagesModelId[] | OpenAIChatModelId[] | GoogleGenerativeAIModelId[] ;
  getModel: (apiKey: string, model: string) => LanguageModel;
}

export const PROVIDERS: Record<string, ProviderInfo> = {
  openai: {
    name: 'OpenAI',
    models: [
     'gpt-5-mini',
     'gpt-5-nano',
     'gpt-5-chat-latests'
    ],
    getModel: (apiKey: string, model: string) => {
      const openaiProvider = createOpenAI({ apiKey });
      return openaiProvider(model);
    },
  },
  anthropic: {
    name: 'Anthropic',
    models: [
      'claude-3-7-sonnet-latest',
      'claude-sonnet-4-0',
    ],
    getModel: (apiKey: string, model: string) => {
      const anthropicProvider = createAnthropic({ apiKey });
      return anthropicProvider(model);
    },
  },
  google: {
    name: 'Google',
    models: [
     'gemini-1.5-pro-latest',
     'gemini-2.5-flash-lite',
     'gemini-2.5-pro',
     'gemini-2.5-flash'
    ],
    getModel: (apiKey: string, model: string) => {
      const googleProvider = createGoogleGenerativeAI({ apiKey });
      return googleProvider(model);
    },
  },
  groq :{
    name: 'Groq',
    models: [
      'moonshotai/kimi-k2-instruct',
      'moonshotai/kimi-k2-instruct-0905',
      'deepseek-r1-distill-llama-70b'
    ],
    getModel: (apiKey: string, model: string) => {
      const getGroqProvider = createGroq({ apiKey });
      return getGroqProvider(model);
    }
  }
};

export class AIProviderManager {
  private config: CLIConfig;
  private configManager: ConfigManager;

  constructor(config: CLIConfig) {
    this.config = config;
    this.configManager = ConfigManager.getInstance();
  }

  public getAvailableProviders(): string[] {
    return Object.keys(PROVIDERS).filter(provider => {
      const providerConfig = this.config.providers[provider as keyof typeof this.config.providers];
      return providerConfig?.enabled ?? false;
    });
  }

  public getProviderModels(provider: string): string[] {
    const knownModels = PROVIDERS[provider]?.models || [];
    const providerConfig = this.config.providers[provider as keyof typeof this.config.providers];
    const customModels = providerConfig?.customModels || [];
    return [...knownModels, ...customModels];
  }

  public async getModel(provider?: string, model?: string): Promise<LanguageModel> {
    const selectedProvider = provider || this.config.defaultProvider;
    const providerConfig = this.config.providers[selectedProvider as keyof typeof this.config.providers];

    if (!providerConfig?.enabled) {
      throw new Error(`Provider ${selectedProvider} is disabled`);
    }

    const apiKey = await this.configManager.getApiKey(selectedProvider);
    if (!apiKey) {
      throw new Error(`API key not found for provider: ${selectedProvider}`);
    }

    const selectedModel = model || providerConfig.defaultModel;
    const providerInfo = PROVIDERS[selectedProvider];

    if (!providerInfo) {
      throw new Error(`Unsupported provider: ${selectedProvider}`);
    }

    // Allow dynamic or custom models; warn if model not in known list
    this.validateModel(selectedProvider, selectedModel);

    return providerInfo.getModel(apiKey, selectedModel);
  }

  public validateProvider(provider: string): boolean {
    return provider in PROVIDERS;
  }

  public validateModel(provider: string, model: string): boolean {
    const knownModels = PROVIDERS[provider]?.models || [];
    const providerConfig = this.config.providers[provider as keyof typeof this.config.providers];
    const customModels = providerConfig?.customModels || [];

    const isKnown = knownModels.includes(model) || customModels.includes(model);

    if (!isKnown) {
      Logger.warn(`Using unknown model '${model}' for provider '${provider}'. This may not work if the model doesn't exist.`);
      // Suggest similar models
      const similar = this.findSimilarModels(model, knownModels);
      if (similar.length > 0) {
        Logger.info(`Did you mean: ${similar.join(', ')}?`);
      }
    }

    return true; // Allow any model
  }

  private findSimilarModels(target: string, models: string[]): string[] {
    return models
      .filter(m => m.includes(target) || target.includes(m))
      .slice(0, 3);
  }

  public getProviderInfo(provider: string): ProviderInfo | undefined {
    return PROVIDERS[provider];
  }

  public getAllProviderInfo(): Record<string, ProviderInfo> {
    return PROVIDERS;
  }

  public async isProviderConfigured(provider: string): Promise<boolean> {
    const providerConfig = this.config.providers[provider as keyof typeof this.config.providers];
    if (!providerConfig?.enabled) {
      return false;
    }
    const hasApiKey = await this.configManager.hasApiKey(provider);
    return hasApiKey;
  }

  public getConfiguredProviders(): string[] {
    return Object.keys(this.config.providers).filter(provider => 
      this.isProviderConfigured(provider)
    );
  }
}