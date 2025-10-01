import { Command } from "commander";
import inquirer from "inquirer";
import { AIProvider, Config } from "../../core/types";
import { ConfigManager } from "../../core/config";
import { AIService } from "../../core/ai";
import {
    DEFAULT_COMMIT_PROMPT,
    DEFAULT_PR_PROMPT,
    DEFAULT_MERGE_COMMIT_PROMPT,
} from "../../core/prompts";

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
        "openai/gpt-oss-120b",
        "meta-llama/llama-4-maverick-17b-128e-instruct",
        "meta-llama/llama-4-scout-17b-16e-instruct",
    ],
};

export const initCommand: Command = new Command("init")
    .description("Initialize gitvibe with AI provider setup")
    .action(async () => {
        console.log(
            "Welcome to gitvibe! Let's set up your AI configuration.\n"
        );

        // Step 1: Select provider
        const { provider } = await inquirer.prompt({
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
        });

        // Step 2: Check for existing API key
        const existingApiKey = await ConfigManager.getApiKey(provider);
        let useExisting = false;
        if (existingApiKey) {
            const { action } = await inquirer.prompt({
                type: "list",
                name: "action",
                message: `API key found for ${provider}. What would you like to do?`,
                choices: [
                    { name: "Use existing key", value: "use" },
                    { name: "Enter new key", value: "new" },
                ],
            });
            useExisting = action === "use";
        }

        // Step 3: Get model and API key if needed
        const modelAnswers = await inquirer.prompt([
            {
                type: "list",
                name: "model",
                message: "Select model:",
                choices: [
                    ...PROVIDER_MODELS[provider as AIProvider],
                    "Custom Model",
                ],
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
                when: () => !useExisting,
            },
        ]);

        const model =
            modelAnswers.model === "Custom Model"
                ? modelAnswers.customModel
                : modelAnswers.model;
        const apiKey = useExisting ? existingApiKey : modelAnswers.apiKey;

        // Store API key
        await ConfigManager.setApiKey(provider, apiKey);

        // Create default config
        const config: Config = {
            ai_provider: provider,
            model,
            commit_prompt: DEFAULT_COMMIT_PROMPT,
            pr_prompt: DEFAULT_PR_PROMPT,
            merge_commit_prompt: DEFAULT_MERGE_COMMIT_PROMPT,
            temperature: 0.7,
            max_commit_tokens: 1 * 1024,
            max_pr_tokens: 64 * 1024,
            stream_output: true,
            commit_variations: 1,
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
