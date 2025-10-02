#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./cli/commands/init";
import { configCommand } from "./cli/commands/config";
import { commitCommand } from "./cli/commands/commit";
import { prCommand } from "./cli/commands/pr";

const program = new Command();

program
    .name("gitvibe")
    .description(
        "AI-powered CLI tool for generating commit messages and PR descriptions"
    )
    .version("1.0.0");

program.addCommand(initCommand);
program.addCommand(configCommand);
program.addCommand(commitCommand);
program.addCommand(prCommand);

try {
    program.parse();
} catch (error) {
    console.error(
        "Error parsing command:",
        error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
}

process.on("SIGINT", () => {
    console.log("\nGracefully shutting down...");
    process.exit(0); // exit without error
});

process.on("SIGTERM", () => {
    console.log("\nReceived termination signal. Shutting down gracefully...");
    process.exit(0);
});

process.on("uncaughtException", (error) => {
    if (error.name === "ExitPromptError") {
        console.log("\nGracefully shutting down...");
        process.exit(0);
    } else {
        console.error("Uncaught Exception:", error.message);
        process.exit(1);
    }
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("👋 See you next time!");
    process.exit(1);
});

program.configureOutput({
    writeErr: (str) => {
        process.stderr.write(str);
    },
    outputError: (str, write) => write(`Something went wrong: ${str}`),
});
