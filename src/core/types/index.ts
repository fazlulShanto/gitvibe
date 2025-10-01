import { z } from "zod";

export const AIProviderSchema = z.enum([
    "openai",
    "google",
    "anthropic",
    "groq",
]);
export type AIProvider = z.infer<typeof AIProviderSchema>;

export const ConfigSchema = z.object({
    ai_provider: AIProviderSchema,
    model: z.string(),
    commit_prompt: z.string(),
    pr_prompt: z.string(),
    merge_commit_prompt: z.string(),
    temperature: z.number().min(0).max(2),
    max_commit_tokens: z.number().int().positive(),
    max_pr_tokens: z.number().int().positive(),
    stream_output: z.boolean(),
    commit_variations: z.number().int().min(1).default(2),
});

export type Config = z.infer<typeof ConfigSchema>;

export const ConfigMapSchema = z.record(z.string(), ConfigSchema);
export type ConfigMap = z.infer<typeof ConfigMapSchema>;

export const GitDiffSchema = z.object({
    files: z.array(
        z.object({
            filename: z.string(),
            status: z.string(),
            additions: z.number(),
            deletions: z.number(),
            content: z.string(),
        })
    ),
});

export type GitDiff = z.infer<typeof GitDiffSchema>;

export const CommitMessageSchema = z.object({
    message: z.string(),
    variations: z.array(z.string()).optional(),
});

export type CommitMessage = z.infer<typeof CommitMessageSchema>;

export const PRDescriptionSchema = z.object({
    title: z.string(),
    description: z.string(),
});

export type PRDescription = z.infer<typeof PRDescriptionSchema>;
