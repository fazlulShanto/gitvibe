import { createOpenAI, OpenAIProvider } from "@ai-sdk/openai";
import {
    createGoogleGenerativeAI,
    GoogleGenerativeAIProvider,
} from "@ai-sdk/google";
import { AnthropicProvider, createAnthropic } from "@ai-sdk/anthropic";
import { createGroq, GroqProvider } from "@ai-sdk/groq";
import { generateText, streamText } from "ai";
import { z } from "zod";
import { Config, AIProvider, CommitMessage, PRDescription } from "../types";
import { ConfigManager } from "../config";
import { GitService } from "../git";
import { Logger } from "../utils/logger";

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

            const result = await generateText({
                model: client(config.model),
                prompt: chunkPrompt,
            });
            try {
                const parsed = CommitMessageSchema.safeParse(
                    JSON.parse(result.text)
                );
                if (parsed.success) {
                    chunkMessages.push(...parsed.data.results);
                }
                chunkMessages.push(result.text.trim());
            } catch {
                console.log("Got in a chunk error 🟥", result.text);
            }
        }

        const mergePrompt = this.buildPrompt(config.merge_commit_prompt, {
            messages: chunkMessages.map((msg) => `- ${msg}`).join("\n"),
        });

        const finalResult = await generateText({
            model: client(config.model),
            prompt: mergePrompt,
            maxOutputTokens: config.max_commit_tokens,
        });

        try {
            if (
                CommitMessageSchema.safeParse(JSON.parse(finalResult.text))
                    .success
            ) {
                return JSON.parse(finalResult.text);
            }
            throw new Error("Invalid final commit message format");
        } catch {
            Logger.error("Failed to parse final commit message JSON.");
            throw new Error("Failed to parse final commit message JSON.");
        }
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

        const { text: result } = await generateText({
            model: client(config.model),
            prompt,
            maxOutputTokens: config.max_commit_tokens,
        });

        try {
            if (CommitMessageSchema.safeParse(JSON.parse(result)).success) {
                return JSON.parse(result);
            }
            throw new Error("Invalid commit message format");
        } catch {
            Logger.error("Failed to parse commit message JSON.");
            throw new Error("Failed to parse commit message JSON.");
        }
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

        const isSmallDif = diff.length < 50 * 1000;

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

        let text: string;

        if (config.stream_output) {
            // Use streaming
            const result = await streamText({
                model: client(config.model),
                prompt,
            });

            text = "";
            for await (const chunk of result.textStream) {
                text += chunk;
                process.stdout.write(chunk);
            }
            process.stdout.write("\n");
        } else {
            // Use non-streaming
            const result = await generateText({
                model: client(config.model),
                prompt,
            });
            text = result.text;
        }

        // Parse the result to extract title and description
        const lines = text.split("\n");
        const title = lines[0].replace(/^#+\s*/, "").trim();
        const description = lines.slice(1).join("\n").trim();

        return { title, description };
    }

    static async testConnection(config: Config): Promise<boolean> {
        try {
            await this.generateCommitMessage("test diff", config);
            return true;
        } catch (error) {
            return false;
        }
    }
}
