import { z } from 'zod';

export const ProviderConfigSchema = z.object({
  apiKey: z.string().optional(),
  defaultModel: z.string(),
  enabled: z.boolean().default(true),
  customModels: z.array(z.string()).default([]),
});

export const ProvidersConfigSchema = z.object({
  openai: ProviderConfigSchema.extend({
    defaultModel: z.string().default('gpt-5-mini'),
  }),
  anthropic: ProviderConfigSchema.extend({
    defaultModel: z.string().default('claude-3-7-sonnet-latest',),
  }),
  google: ProviderConfigSchema.extend({
    defaultModel: z.string().default('gemini-2.5-flash'),
  }),
  groq: ProviderConfigSchema.extend({
    defaultModel: z.string().default('moonshotai/kimi-k2-instruct'),
  }),
});

export const TemplatesConfigSchema = z.object({
  commit: z.object({
    default: z.string(),
    conventional: z.string(),
    custom: z.record(z.string()).default({}),
  }),
  pr: z.object({
    default: z.string(),
    detailed: z.string(),
    custom: z.record(z.string()).default({}),
  }),
});

export const OptionsConfigSchema = z.object({
  streaming: z.boolean().default(true),
  maxOutputTokens: z.number().default(500),
  temperature: z.number().min(0).max(2).default(0.7),
});

export const GitHooksConfigSchema = z.object({
  enabled: z.boolean().default(false),
  commitMsg: z.boolean().default(false),
  preCommit: z.boolean().default(false),
});

export const CLIConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  defaultProvider: z.enum(['openai', 'anthropic', 'google','groq']).default('groq'),
  providers: ProvidersConfigSchema,
  templates: TemplatesConfigSchema,
  options: OptionsConfigSchema,
  gitHooks: GitHooksConfigSchema,
  analytics: z.object({
    enabled: z.boolean().default(true),
    anonymous: z.boolean().default(true),
  }).default({}),
});

export type CLIConfig = z.infer<typeof CLIConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type ProvidersConfig = z.infer<typeof ProvidersConfigSchema>;
export type TemplatesConfig = z.infer<typeof TemplatesConfigSchema>;
export type OptionsConfig = z.infer<typeof OptionsConfigSchema>;
export type GitHooksConfig = z.infer<typeof GitHooksConfigSchema>;