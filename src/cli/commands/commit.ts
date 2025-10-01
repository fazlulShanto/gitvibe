import { Command } from "commander";
import inquirer from "inquirer";
import clipboardy from "clipboardy";
import { ConfigManager } from "../../core/config";
import { AIService } from "../../core/ai";
import { GitService } from "../../core/git";

export const commitCommand: Command = new Command("commit")
    .alias("c")
    .description("Generate commit message from staged changes")
    .option("--copy", "Copy to clipboard")
    .option("--commit", "Commit with the message")
    .option("--config <name>", "Use specific config")
    .action(async (options) => {
        const git = new GitService();

        if (!(await git.isGitRepo())) {
            console.error("Not a git repository.");
            process.exit(1);
        }

        const diff = await git.getStagedDiff();
        if (!diff) {
            console.log("No staged changes found.");
            return;
        }

        const configName =
            options.config || (await ConfigManager.getDefaultConfigName());
        if (!configName) {
            console.error(
                'No default configuration found. Run "gitvibe init" first.'
            );
            process.exit(1);
        }

        const config = await ConfigManager.getConfig(configName);
        if (!config) {
            console.error(`Configuration "${configName}" not found.`);
            process.exit(1);
        }

        const chunks = await git.chunkDiff(diff);
        let message: string;

        // For variations > 1, disable streaming to get multiple messages
        const generationConfig =
            config.commit_variations > 1
                ? { ...config, stream_output: false }
                : config;

        const result = await AIService.generateCommitMessage(
            chunks[0],
            generationConfig,
            config.commit_variations
        );

        if (config.commit_variations === 1) {
            message = result.message;
            if (!config.stream_output) {
                console.log("\n 🎉Generated message:");
                console.log(message);
            }
        } else {
            // Multiple variations, let user select
            const variations = result.variations!;
            console.log(
                `\n🎉 Generated ${config.commit_variations} commit message variations:`
            );

            const selectionAnswer = await inquirer.prompt([
                {
                    type: "list",
                    name: "selectedIndex",
                    message: "Select a commit message:",
                    choices: variations.map((variation, index) => ({
                        name: variation,
                        value: index,
                    })),
                },
            ]);
            message = variations[selectionAnswer.selectedIndex];
        }

        let action: string;
        if (options.copy) action = "copy";
        else if (options.commit) action = "commit";
        else {
            const answer = await inquirer.prompt([
                {
                    type: "list",
                    name: "action",
                    message: "What would you like to do?",
                    choices: [
                        { name: "Commit with this message", value: "commit" },
                        { name: "Copy to clipboard", value: "copy" },
                    ],
                },
            ]);
            action = answer.action;
        }

        switch (action) {
            case "copy":
                await clipboardy.write(message);
                console.log("✅ Copied to clipboard.");
                break;
            case "commit":
                await git.commit(message);
                console.log("✅ Committed successfully.");
                break;
        }
    });
