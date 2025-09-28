import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as yaml from "yaml";
import { CLIConfig, CLIConfigSchema } from "./schema.js";
import { Logger } from "../../utils/Logger.js";

export class ConfigManager {
    private static instance: ConfigManager;
    private config: CLIConfig | null = null;
    private configPath: string;

    private constructor() {
        this.configPath = path.join(os.homedir(), ".gitvibe", "config.yaml");
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    private getDefaultConfig(): CLIConfig {
        return {
            version: "1.0.0",
            defaultProvider: "groq",
            providers: {
                openai: {
                    defaultModel: "gpt-5-mini",
                    enabled: true,
                    customModels: [],
                },
                anthropic: {
                    defaultModel: "claude-3-7-sonnet-latest",
                    enabled: true,
                    customModels: [],
                },
                google: {
                    defaultModel: "gemini-2.5-flash",
                    enabled: true,
                    customModels: [],
                },
                groq: {
                    defaultModel: "moonshotai/kimi-k2-instruct",
                    enabled: true,
                    customModels: [],
                },
            },
            templates: {
                commit: {
                    default: `Analyze the following git diff and generate a concise, descriptive commit message:

{diff}

Requirements:
- Use imperative mood (e.g., "Add", "Fix", "Update")
- Keep it under 50 characters for the summary
- Be specific about what changed
- Don't include file names unless necessary`,
                    conventional: `Analyze the following git diff and generate a conventional commit message:

{diff}

Use the conventional commits format: <type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, chore
Keep the description under 50 characters and use imperative mood.`,
                    custom: {},
                },
                pr: {
                    default: `Generate a comprehensive PR description based on the following git diff:

{diff}

Include:
## What Changed
- Brief summary of changes

## Why
- Motivation for the changes

## Testing
- How to test the changes`,
                    detailed: `Generate a detailed PR description for the following changes:

{diff}

## Summary
Provide a clear summary of what this PR accomplishes.

## Changes Made
List the specific changes made:
-
-
-

## Motivation and Context
Explain why these changes were needed.

## Checklist
- [ ] Code follows the project's style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated as needed
- [ ] Documentation updated if required`,
                    chunk_summary: `Summarize the changes in this portion of the git diff:

{diff}

Provide a concise summary of what this chunk of changes does. Focus on the key modifications, additions, or deletions.`,
                    custom: {},
                },
            },
            options: {
                streaming: true,
                maxOutputTokens: 500,
                temperature: 0.7,
                maxDiffSize: 50000,
                chunkOverlap: 1000,
            },
            gitHooks: {
                enabled: false,
                commitMsg: false,
                preCommit: false,
            },
            analytics: {
                enabled: true,
                anonymous: true,
            },
        };
    }

    public async load(): Promise<CLIConfig> {
        if (this.config) {
            return this.config;
        }

        try {

          const configData = await fs.readFile(this.configPath, "utf-8");
            const parsedConfig = yaml.parse(configData);
            this.config = CLIConfigSchema.parse(parsedConfig);
            Logger.info("Configuration loaded successfully");
            return this.config;
        } catch (error) {
            if ((error as any).code === "ENOENT") {
                Logger.info("No configuration file found, using defaults");
                this.config = this.getDefaultConfig();
                await this.save();
                return this.config;
            }
            console.log(error);
            Logger.error(
                `Failed to load configuration: ${(error as Error).message}`
            );
            throw error;
        }
    }

    public async save(): Promise<void> {
        if (!this.config) {
            throw new Error("No configuration to save");
        }

        try {
            await fs.mkdir(path.dirname(this.configPath), { recursive: true });
            const yamlContent = yaml.stringify(this.config, { indent: 2 });
            await fs.writeFile(this.configPath, yamlContent, "utf-8");
            Logger.info("Configuration saved successfully");
        } catch (error) {
            Logger.error(
                `Failed to save configuration: ${(error as Error).message}`
            );
            throw error;
        }
    }

    public async get(): Promise<CLIConfig> {
        if (!this.config) {
            return await this.load();
        }
        return this.config;
    }

    public async set<K extends keyof CLIConfig>(
        key: K,
        value: CLIConfig[K]
    ): Promise<void> {
        if (!this.config) {
            await this.load();
        }
        this.config![key] = value;
        await this.save();
    }

    public async update(updates: Partial<CLIConfig>): Promise<void> {
        if (!this.config) {
            await this.load();
        }
        this.config = { ...this.config!, ...updates };
        await this.save();
    }

    public getConfigPath(): string {
        return this.configPath;
    }

    public async reset(): Promise<void> {
        this.config = this.getDefaultConfig();
        await this.save();
        Logger.info("Configuration reset to defaults");
    }

    public async exists(): Promise<boolean> {
        try {
            await fs.access(this.configPath);
            return true;
        } catch {
            return false;
        }
    }
}
