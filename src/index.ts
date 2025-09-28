#!/usr/bin/env node

import { createCLI, addGlobalErrorHandler, setupCommands, displayWelcome } from './cli/parser.js';
import { Logger } from './utils/Logger.js';

async function main(): Promise<void> {
  try {
    const program = createCLI();
    
    // Add error handling
    addGlobalErrorHandler(program);
    
    // Setup all commands
    await setupCommands(program);
    
    // If no arguments provided, show welcome and help
    if (process.argv.length <= 2) {
      displayWelcome();
      program.help();
      return;
    }
    
    // Parse command line arguments
    await program.parseAsync(process.argv);
    
  } catch (error) {
    Logger.error(`CLI execution failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Run the CLI
main().catch((error) => {
  Logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});