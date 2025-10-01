import { createOpenAI, OpenAIProvider } from "@ai-sdk/openai";
import {
    createGoogleGenerativeAI,
    GoogleGenerativeAIProvider,
} from "@ai-sdk/google";
import { AnthropicProvider, createAnthropic } from "@ai-sdk/anthropic";
import { createGroq, GroqProvider } from "@ai-sdk/groq";
import { generateObject, generateText, streamText } from "ai";
import { z } from "zod";
import { Config, AIProvider, CommitMessage, PRDescription } from "../types";
import { ConfigManager } from "../config";
import { GitService } from "../git";

const CommitMessageSchema = z.object({
    results: z.array(z.string()).min(1),
});

export class AIService {
    private static getGitService() {
        return new GitService();
    }
    private static getClient(provider: AIProvider, apiKey: string) {
        switch (provider) {
            case "openai":
                return createOpenAI({ apiKey });
            case "google":
                return createGoogleGenerativeAI({ apiKey });
            case "anthropic":
                return createAnthropic({ apiKey });
            case "groq":
                return createGroq({ apiKey });
            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }

    private static async handleLargeDiff(
        diff: string,
        config: Config,
        client: any,
        gitService: GitService
    ): Promise<z.infer<typeof CommitMessageSchema>> {
        const chunks = await gitService.chunkDiff(diff);
        const chunkMessages: string[] = [];

        for (const chunk of chunks) {
            const chunkPrompt = this.buildPrompt(config.commit_prompt, {
                diff: chunk,
                n_commit: config.commit_variations.toString(),
            });

            const result = await generateObject({
                model: client(config.model),
                schema: CommitMessageSchema,
                prompt: chunkPrompt,
            });

            chunkMessages.push(...result.object.results);
        }

        const mergePrompt = this.buildPrompt(config.merge_commit_prompt, {
            messages: chunkMessages.map((msg) => `- ${msg}`).join("\n"),
        });

        const finalResult = await generateObject({
            model: client(config.model),
            schema: CommitMessageSchema,
            prompt: mergePrompt,
        });

        return finalResult.object;
    }

    private static async handleSmallDiff(
        diffSummary: string,
        config: Config,
        client:
            | OpenAIProvider
            | GoogleGenerativeAIProvider
            | AnthropicProvider
            | GroqProvider
    ): Promise<z.infer<typeof CommitMessageSchema>> {
        const prompt = this.buildPrompt(config.commit_prompt, {
            diff: diffSummary,
            n_commit: config.commit_variations.toString(),
        });

        const { object } = await generateObject({
            model: client(config.model),
            schema: CommitMessageSchema,
            prompt,
        });
        return object;
    }

    private static buildPrompt(
        template: string,
        replacements: { [key: string]: string }
    ): string {
        let prompt = template;
        for (const [key, value] of Object.entries(replacements)) {
            prompt = prompt.replace(new RegExp("{" + key + "}", "g"), value);
        }
        return prompt;
    }

    static async generateCommitMessage(
        diff: string,
        config: Config
    ): Promise<CommitMessage> {
        const apiKey = await ConfigManager.getApiKey(config.ai_provider);
        if (!apiKey) {
            throw new Error(
                `API key not found for provider: ${config.ai_provider}`
            );
        }

        const client = this.getClient(config.ai_provider, apiKey);
        const gitService = this.getGitService();

        const isSmallDif = diff.length < 30 * 1000;

        let finalResult: z.infer<typeof CommitMessageSchema>;

        if (isSmallDif) {
            finalResult = await this.handleLargeDiff(
                diff,
                config,
                client,
                gitService
            );
        } else {
            finalResult = await this.handleSmallDiff(diff, config, client);
        }
        const isValidResult = CommitMessageSchema.safeParse(finalResult);
        return {
            variations: isValidResult.success ? finalResult.results : [],
        };
    }

    static async generatePRDescription(
        commits: string[],
        config: Config
    ): Promise<PRDescription> {
        const apiKey = await ConfigManager.getApiKey(config.ai_provider);
        if (!apiKey) {
            throw new Error(
                `API key not found for provider: ${config.ai_provider}`
            );
        }

        const client = this.getClient(config.ai_provider, apiKey);

        const commitsText = commits.join("\n");

        const prompt = config.pr_prompt.replace("{commits}", commitsText);

        // Use non-streaming
        const result = await generateObject({
            model: client(config.model),
            schema: z.object({
                title: z.string(),
                description: z.string(),
            }),
            prompt,
        });

        return {
            title: result.object.title,
            description: result.object.description,
        };
    }

    static async testConnection(config: Config): Promise<boolean> {
        try {
            await this.generateCommitMessage("test diff", config);
            return true;
        } catch (error) {
            console.error("Connection test failed:", error);
            return false;
        }
    }
}
