import { Command } from "commander";
import inquirer from "inquirer";
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
import { Config } from "../../core/types";
import { ConfigManager } from "../../core/config";
import { DEFAULT_MERGE_COMMIT_PROMPT } from "../../core/prompts";

export const configCommand: Command = new Command("config");

const newCommand: Command = new Command("new")
    .description("Create a new configuration")
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

        // Get default editor
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

        // Create config file with default content
        const defaultConfig: Config = {
            ai_provider: "groq",
            model: "llama3-8b-8192",
            commit_prompt:
                "Generate a concise commit message for the following git diff:\n\n{diff}\n\nCommit message:",
            pr_prompt:
                "Generate a PR title and description for the following commits:\n\n{commits}\n\nFormat as:\n# Title\n\nDescription",
            merge_commit_prompt: DEFAULT_MERGE_COMMIT_PROMPT,
            temperature: 0.7,
            max_commit_tokens: 150,
            max_pr_tokens: 500,
            stream_output: false,
            commit_variations: 2,
        };

        const yamlContent = require("js-yaml").dump(defaultConfig);
        writeFileSync(configFile, yamlContent);

        console.log(`Opening ${editor} to edit configuration...`);
        execSync(`${editor} ${configFile}`, { stdio: "inherit" });

        // Read back and validate
        const editedContent = readFileSync(configFile, "utf-8");
        try {
            const config = require("js-yaml").load(editedContent) as Config;
            // Full validation using schema
            require("../../core/types").ConfigSchema.parse(config);
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

const listCommand = new Command("list")
    .description("List all configurations")
    .action(async () => {
        const configs = await ConfigManager.listConfigsWithValidity();
        const defaultName = await ConfigManager.getDefaultConfigName();

        if (configs.length === 0) {
            console.log(
                'No configurations found. Run "gitvibe config new <name>" to create one.'
            );
            return;
        }

        console.log("Configurations:");
        for (const { name, valid } of configs) {
            const defaultMarker = name === defaultName ? " (default)" : "";
            const validMarker = valid ? "" : " (invalid)";
            console.log(`  ${name}${defaultMarker}${validMarker}`);
        }
    });

const setDefaultCommand = new Command("set-default")
    .description("Set default configuration")
    .argument("<name>", "Configuration name")
    .action(async (name: string) => {
        const configs = await ConfigManager.listConfigs();
        if (!configs.includes(name)) {
            console.log(`Configuration "${name}" not found.`);
            return;
        }

        await ConfigManager.setDefaultConfigName(name);
        console.log(`Default configuration set to "${name}".`);
    });

const showCommand = new Command("show")
    .description("Show configuration details")
    .argument("[name]", "Configuration name (shows default if not specified)")
    .action(async (name?: string) => {
        let configName = name;
        if (!configName) {
            configName =
                (await ConfigManager.getDefaultConfigName()) || undefined;
            if (!configName) {
                console.log(
                    'No default configuration set. Run "gitvibe init" to create one.'
                );
                return;
            }
        }

        const config = await ConfigManager.getConfig(configName);
        if (!config) {
            const configFile = join(
                homedir(),
                ".gitvibe",
                "configs",
                `${configName}.yaml`
            );
            if (existsSync(configFile)) {
                console.log(`Configuration "${configName}" is invalid.`);
                return;
            } else {
                console.log(`Configuration "${configName}" not found.`);
                return;
            }
        }

        console.log(`Configuration: ${configName}`);
        console.log(`Save path: ~/.gitvibe/configs/${configName}.yaml`);
        console.log("");
        console.log("Details:");
        console.log(`  AI Provider: ${config.ai_provider}`);
        console.log(`  Model: ${config.model}`);
        console.log(`  Temperature: ${config.temperature}`);
        console.log(`  Max Commit Tokens: ${config.max_commit_tokens}`);
        console.log(`  Max PR Tokens: ${config.max_pr_tokens}`);
        console.log(`  Stream Output: ${config.stream_output}`);
        console.log(`  Commit Variations: ${config.commit_variations}`);
        console.log("");
        console.log("Commit Prompt:");
        console.log(`  ${config.commit_prompt.replace("\n", "\n  ")}`);
        console.log("");
        console.log("PR Prompt:");
        console.log(`  ${config.pr_prompt.replace("\n", "\n  ")}`);
    });

configCommand
    .addCommand(newCommand)
    .addCommand(listCommand)
    .addCommand(setDefaultCommand)
    .addCommand(showCommand);
