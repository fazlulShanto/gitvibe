import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import { CLIConfig } from '../config/schema.js';
import { AnthropicMessagesModelId } from '@ai-sdk/anthropic/internal';
import { OpenAIChatModelId } from '@ai-sdk/openai/internal';
import { GoogleGenerativeAIModelId } from '@ai-sdk/google/internal';
import { createGroq} from '@ai-sdk/groq';


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

  constructor(config: CLIConfig) {
    this.config = config;
  }

  public getAvailableProviders(): string[] {
    return Object.keys(PROVIDERS).filter(provider => {
      const providerConfig = this.config.providers[provider as keyof typeof this.config.providers];
      return providerConfig?.enabled && providerConfig?.apiKey;
    });
  }

  public getProviderModels(provider: string): string[] {
    return PROVIDERS[provider]?.models || [];
  }

  public getModel(provider?: string, model?: string): LanguageModel {
    const selectedProvider = provider || this.config.defaultProvider;
    const providerConfig = this.config.providers[selectedProvider as keyof typeof this.config.providers];
    
    if (!providerConfig?.apiKey) {
      throw new Error(`API key not found for provider: ${selectedProvider}`);
    }

    if (!providerConfig.enabled) {
      throw new Error(`Provider ${selectedProvider} is disabled`);
    }

    const selectedModel = model || providerConfig.defaultModel;
    const providerInfo = PROVIDERS[selectedProvider];
    
    if (!providerInfo) {
      throw new Error(`Unsupported provider: ${selectedProvider}`);
    }

    if (!providerInfo.models.includes(selectedModel)) {
      throw new Error(`Model ${selectedModel} not available for provider ${selectedProvider}`);
    }

    return providerInfo.getModel(providerConfig.apiKey, selectedModel);
  }

  public validateProvider(provider: string): boolean {
    return provider in PROVIDERS;
  }

  public validateModel(provider: string, model: string): boolean {
    return PROVIDERS[provider]?.models.includes(model) || false;
  }

  public getProviderInfo(provider: string): ProviderInfo | undefined {
    return PROVIDERS[provider];
  }

  public getAllProviderInfo(): Record<string, ProviderInfo> {
    return PROVIDERS;
  }

  public isProviderConfigured(provider: string): boolean {
    const providerConfig = this.config.providers[provider as keyof typeof this.config.providers];
    return !!(providerConfig?.apiKey && providerConfig?.enabled);
  }

  public getConfiguredProviders(): string[] {
    return Object.keys(this.config.providers).filter(provider => 
      this.isProviderConfigured(provider)
    );
  }
}