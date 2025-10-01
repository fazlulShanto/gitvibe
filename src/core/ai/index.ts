import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { generateText, streamText } from "ai";
import {
    Config,
    AIProvider,
    CommitMessage,
    PRDescription,
    GitDiff,
} from "../types";
import { ConfigManager } from "../config";

export class AIService {
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

    static async generateCommitMessage(
        diff: string,
        config: Config,
        variations: number = 1
    ): Promise<CommitMessage> {
        const apiKey = await ConfigManager.getApiKey(config.ai_provider);
        if (!apiKey) {
            throw new Error(
                `API key not found for provider: ${config.ai_provider}`
            );
        }

        const client = this.getClient(config.ai_provider, apiKey);

        const prompt = config.commit_prompt.replace("{diff}", diff);

        if (config.stream_output) {
            // Use streaming
            const result = await streamText({
                model: client(config.model),
                prompt,
            });

            let fullText = "";
            for await (const chunk of result.textStream) {
                fullText += chunk;
                process.stdout.write(chunk);
            }
            process.stdout.write("\n");

            return { message: fullText };
        } else {
            // Use non-streaming
            const messages =
                variations === 1
                    ? await generateText({
                          model: client(config.model),
                          prompt,
                      })
                    : await Promise.all(
                          Array.from({ length: variations }, async () => {
                              const result = await generateText({
                                  model: client(config.model),
                                  prompt,
                              });
                              return result.text;
                          })
                      );

            if (variations === 1) {
                return { message: (messages as any).text };
            } else {
                return {
                    message: (messages as string[])[0],
                    variations: messages as string[],
                };
            }
        }
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
            await this.generateCommitMessage("test diff", config, 1);
            return true;
        } catch (error) {
            return false;
        }
    }
}
