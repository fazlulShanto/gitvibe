import { Command } from "commander";
import inquirer from "inquirer";
import jsYml from "js-yaml";
import { execSync } from "child_process";
import { platform, homedir } from "os";
import { join } from "path";
import {
    existsSync,
    mkdirSync,
    writeFileSync,
    readFileSync,
    unlinkSync,
} from "fs";
import { Config, AIProvider, ConfigSchema } from "../../core/types";
import { ConfigManager } from "../../core/config";
import { AIService } from "../../core/ai";
import {
    DEFAULT_COMMIT_PROMPT,
    DEFAULT_PR_PROMPT,
    DEFAULT_MERGE_COMMIT_PROMPT,
    DEFAULT_MERGE_PR_PROMPT,
} from "../../core/prompts";
import { PROVIDER_MODELS } from "./init";

export const createConfigCommand: Command = new Command("create-config")
    .description("Create a new configuration interactively")
    .argument("<name>", "Configuration name")
    .action(async (name: string) => {
        const configDir = join(homedir(), ".gitvibe", "configs");
        const configFile = join(configDir, `${name}.yaml`);

        if (existsSync(configFile)) {
            console.log(`Configuration "${name}" already exists.`);
            return;
        }

        // Ensure config dir exists
        if (!existsSync(configDir)) {
            mkdirSync(configDir, { recursive: true });
        }

        console.log("Let's set up your AI configuration.\n");

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
                { name: "Zai", value: "zai" },
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

        // Step 3: Get model, temperature, and API key if needed
        const answers = await inquirer.prompt([
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
                type: "input",
                name: "temperature",
                message: "Enter temperature (0.0 to 1.0):",
                default: "0.5",
                validate: (input: string) => {
                    const num = parseFloat(input);
                    return (
                        (!isNaN(num) && num >= 0 && num <= 1) ||
                        "Temperature must be a number between 0.0 and 1.0"
                    );
                },
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
            answers.model === "Custom Model"
                ? answers.customModel
                : answers.model;
        const temperature = parseFloat(answers.temperature);
        const apiKey = useExisting ? existingApiKey : answers.apiKey;

        // Store API key
        await ConfigManager.setApiKey(provider, apiKey);

        // Test connection
        console.log("\nTesting configuration...");
        const testConfig: Config = {
            ai_provider: provider,
            model,
            commit_prompt: DEFAULT_COMMIT_PROMPT,
            pr_prompt: DEFAULT_PR_PROMPT,
            merge_commit_prompt: DEFAULT_MERGE_COMMIT_PROMPT,
            merge_pr_prompt: DEFAULT_MERGE_PR_PROMPT,
            temperature,
            max_commit_tokens: 1 * 1024,
            max_pr_tokens: 64 * 1024,
            stream_output: true,
            commit_variations: 1,
        };
        const success = await AIService.testConnection(testConfig);
        if (!success) {
            console.log(
                "❌ Test failed. Please check your API key and try again."
            );
            await ConfigManager.deleteApiKey(provider);
            process.exit(1);
        }

        // Create config
        const config: Config = {
            ai_provider: provider,
            model,
            commit_prompt: DEFAULT_COMMIT_PROMPT,
            pr_prompt: DEFAULT_PR_PROMPT,
            merge_commit_prompt: DEFAULT_MERGE_COMMIT_PROMPT,
            merge_pr_prompt: DEFAULT_MERGE_PR_PROMPT,
            temperature,
            max_commit_tokens: 1 * 1024,
            max_pr_tokens: 20 * 1024,
            stream_output: true,
            commit_variations: 1,
        };

        // Save config
        const yamlContent = jsYml.dump(config);
        writeFileSync(configFile, yamlContent);

        // Get editor
        let editor = process.env.EDITOR;
        if (!editor) {
            const isWindows = platform() === "win32";
            const preferredEditors = isWindows
                ? ["code", "codium", "notepad", "nano"]
                : ["code", "codium", "vim", "nano"];

            for (const ed of preferredEditors) {
                try {
                    execSync(`${ed} --version`, { stdio: "pipe" });
                    editor = ed;
                    break;
                } catch {
                    // Editor not available, try next
                }
            }
            if (!editor) {
                editor = "nano"; // Final fallback
            }
        }

        console.log(`Opening ${editor} to edit configuration...`);
        execSync(`${editor} ${configFile}`, { stdio: "inherit" });

        // Read back and validate
        const editedContent = readFileSync(configFile, "utf-8");
        try {
            const config = jsYml.load(editedContent) as Config;
            // Full validation using schema
            ConfigSchema.parse(config);
            console.log(`Configuration "${name}" saved.`);
        } catch (error) {
            console.error(
                "Invalid configuration:",
                error instanceof Error ? error.message : String(error)
            );
            // Remove invalid file
            unlinkSync(configFile);
        }
    });
