import { Command } from "commander";
import inquirer from "inquirer";
import clipboardy from "clipboardy";
import { ConfigManager } from "../../core/config";
import { AIService } from "../../core/ai";
import { GitService } from "../../core/git";

export const commitCommand: Command = new Command("commit")
    .description("Generate commit message from staged changes")
    .option("--copy", "Copy to clipboard")
    .option("--edit", "Edit the message")
    .option("--commit", "Commit with the message")
    .option("--config <name>", "Use specific config")
    .alias("c")
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

        console.log("Generating commit message...");

        const chunks = await git.chunkDiff(diff);
        let message: string;

        if (chunks.length === 1) {
            const result = await AIService.generateCommitMessage(
                chunks[0],
                config,
                1
            );
            message = result.message;
        } else {
            // For multiple chunks, generate for first chunk as representative
            const result = await AIService.generateCommitMessage(
                chunks[0],
                config,
                1
            );
            message = result.message;
        }

        if (!config.stream_output) {
            console.log("\nGenerated message:");
            console.log(message);
        }

        const actions = [];
        if (options.copy) actions.push("copy");
        if (options.edit) actions.push("edit");
        if (options.commit) actions.push("commit");

        if (actions.length === 0) {
            const answer = await inquirer.prompt([
                {
                    type: "checkbox",
                    name: "actions",
                    message: "What would you like to do?",
                    choices: [
                        { name: "Copy to clipboard", value: "copy" },
                        { name: "Edit message", value: "edit" },
                        { name: "Commit with this message", value: "commit" },
                    ],
                },
            ]);
            actions.push(...answer.actions);
        }

        for (const action of actions) {
            switch (action) {
                case "copy":
                    await clipboardy.write(message);
                    console.log("Copied to clipboard.");
                    break;
                case "edit":
                    const editAnswer = await inquirer.prompt([
                        {
                            type: "editor",
                            name: "message",
                            message: "Edit the commit message:",
                            default: message,
                        },
                    ]);
                    message = editAnswer.message.trim();
                    break;
                case "commit":
                    await git.commit(message);
                    console.log("Committed successfully.");
                    break;
            }
        }
    });
