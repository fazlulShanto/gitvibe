import { Command } from "commander";
import inquirer from "inquirer";
import clipboardy from "clipboardy";
import { execSync } from "child_process";
import { ConfigManager } from "../../core/config";
import { AIService } from "../../core/ai";
import { GitService } from "../../core/git";

export const prCommand: Command = new Command("pr")
    .description("Generate PR description from recent commits")
    .option("--commits <n>", "Number of recent commits to include", "10")
    .option("--copy", "Copy to clipboard")
    .option("--edit", "Edit the description")
    .option("--open", "Open PR with GitHub CLI")
    .option("--config <name>", "Use specific config")
    .action(async (options) => {
        const git = new GitService();

        if (!(await git.isGitRepo())) {
            console.error("Not a git repository.");
            process.exit(1);
        }

        const n = parseInt(options.commits) || 10;
        const commits = await git.getLastNCommits(n);

        if (commits.length === 0) {
            console.log("No commits found.");
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

        console.log(
            `Generating PR description from last ${commits.length} commits...`
        );

        const result = await AIService.generatePRDescription(commits, config);

        if (!config.stream_output) {
            console.log("\nGenerated PR:");
            console.log(`Title: ${result.title}`);
            console.log(`Description:\n${result.description}`);
        }

        const actions = [];
        if (options.copy) actions.push("copy");
        if (options.edit) actions.push("edit");
        if (options.open) actions.push("open");

        if (actions.length === 0) {
            const answer = await inquirer.prompt([
                {
                    type: "checkbox",
                    name: "actions",
                    message: "What would you like to do?",
                    choices: [
                        { name: "Copy to clipboard", value: "copy" },
                        { name: "Edit description", value: "edit" },
                        { name: "Open PR with GitHub CLI", value: "open" },
                    ],
                },
            ]);
            actions.push(...answer.actions);
        }

        for (const action of actions) {
            switch (action) {
                case "copy":
                    const fullContent = `${result.title}\n\n${result.description}`;
                    await clipboardy.write(fullContent);
                    console.log("Copied to clipboard.");
                    break;
                case "edit":
                    const titleAnswer = await inquirer.prompt([
                        {
                            type: "input",
                            name: "title",
                            message: "Edit title:",
                            default: result.title,
                        },
                    ]);
                    const descAnswer = await inquirer.prompt([
                        {
                            type: "editor",
                            name: "description",
                            message: "Edit description:",
                            default: result.description,
                        },
                    ]);
                    result.title = titleAnswer.title;
                    result.description = descAnswer.description;
                    break;
                case "open":
                    try {
                        // Create PR with gh CLI
                        const cmd = `gh pr create --title "${result.title.replace(
                            /"/g,
                            '\\"'
                        )}" --body "${result.description.replace(
                            /"/g,
                            '\\"'
                        )}"`;
                        execSync(cmd, { stdio: "inherit" });
                        console.log("PR created successfully.");
                    } catch (error) {
                        console.error(
                            "Failed to create PR. Make sure GitHub CLI is installed and authenticated."
                        );
                    }
                    break;
            }
        }
    });
