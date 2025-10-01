import { Command } from "commander";
import inquirer from "inquirer";
import { AIProvider, Config } from "../../core/types";
import { ConfigManager } from "../../core/config";
import { AIService } from "../../core/ai";

const PROVIDER_MODELS: Record<AIProvider, string[]> = {
    openai: ["gpt-5-mini", "gpt-4o-mini", "gpt-5-nano", "gpt-5"],
    google: [
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
        "gemini-2.5-pro",
        "gemini-2.5-flash",
    ],
    anthropic: [
        "claude-3-5-sonnet-latest",
        "claude-3-7-sonnet-20250219",
        "claude-4-sonnet-20250514",
        "claude-4-opus-20250514",
    ],
    groq: [
        "moonshotai/kimi-k2-instruct-0905",
        "deepseek-r1-distill-llama-70b",
        "qwen/qwen3-32b",
        "gemma2-9b-it",
        "llama-3.1-8b-instant",
    ],
};

export const initCommand: Command = new Command("init")
    .description("Initialize gitvibe with AI provider setup")
    .action(async () => {
        console.log(
            "Welcome to gitvibe! Let's set up your AI configuration.\n"
        );

        const answers = await inquirer.prompt([
            {
                type: "list",
                name: "provider",
                message: "Select AI provider:",
                choices: [
                    { name: "Groq (default)", value: "groq" },
                    { name: "OpenAI", value: "openai" },
                    { name: "Google", value: "google" },
                    { name: "Anthropic", value: "anthropic" },
                ],
                default: "groq",
            },
            {
                type: "list",
                name: "model",
                message: "Select model:",
                choices: (answers: any) => [
                    ...PROVIDER_MODELS[answers.provider as AIProvider],
                    "Custom Model",
                ],
                when: (answers: any) => answers.provider,
            },
            {
                type: "input",
                name: "customModel",
                message: "Enter custom model name:",
                when: (answers: any) => answers.model === "Custom Model",
            },
            {
                type: "password",
                name: "apiKey",
                message: "Enter API key:",
                validate: (input: string) =>
                    input.length > 0 || "API key is required",
            },
        ]);

        const provider: AIProvider = answers.provider;
        const model =
            answers.model === "Custom Model"
                ? answers.customModel
                : answers.model;
        const apiKey = answers.apiKey;

        // Store API key
        await ConfigManager.setApiKey(provider, apiKey);

        // Create default config
        const config: Config = {
            ai_provider: provider,
            model,
            commit_prompt:
                "Generate a concise commit message for the following git diff:\n\n{diff}\n\nCommit message:",
            pr_prompt:
                "Generate a PR title and description for the following commits:\n\n{commits}\n\nFormat as:\n# Title\n\nDescription",
            temperature: 0.7,
            max_commit_tokens: 300,
            max_pr_tokens: 6000,
            stream_output: true,
            commit_variations: 2,
        };

        await ConfigManager.saveConfig("default", config);
        await ConfigManager.setDefaultConfigName("default");

        console.log("\nTesting configuration...");

        const success = await AIService.testConnection(config);
        if (success) {
            console.log('✅ Setup complete! Configuration saved as "default".');
        } else {
            console.log(
                "❌ Test failed. Please check your API key and try again."
            );
            await ConfigManager.deleteApiKey(provider);
            process.exit(1);
        }
    });
