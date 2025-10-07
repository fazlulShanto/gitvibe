import { Command } from "commander";
import inquirer from "inquirer";
import clipboardy from "clipboardy";
import { ConfigManager } from "../../core/config";
import { AIService } from "../../core/ai";
import { GitService } from "../../core/git";
import { GitAnalyzer } from "../../core/git/analyzer";

export const commitCommand: Command = new Command("commit")
    .alias("c")
    .description("Generate commit message from staged changes")
    .option("--copy", "Copy to clipboard")
    .option("--apply", "Commit with the message")
    .option("--config <name>", "Use specific config")
    .action(async (options) => {
        const git = new GitService();
        // check if in a git repo
        if (!(await git.isGitRepo())) {
            console.error("Not a git repository.");
            process.exit(1);
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

        const diff = await git.getStagedDiff();

        if (!diff) {
            console.log("No staged changes found.");
            return;
        }

        const result = await AIService.generateCommitMessage(diff, config);

        // Multiple variations, let user select
        const variations = result.variations!;
        console.log(
            `✨🎉 Generated ${variations.length} commit message variations:`
        );

        const selectionAnswer = await inquirer.prompt([
            {
                type: "list",
                name: "selectedIndex",
                message: `Select a commit message (config: ${configName}):`,
                choices: Array.isArray(variations)
                    ? variations.map((variation, index) => ({
                          name: variation,
                          value: index,
                      }))
                    : [],
            },
        ]);

        let message = variations[selectionAnswer.selectedIndex];

        let action: string;
        if (options.copy) action = "copy";
        else if (options.apply) action = "commit";
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
