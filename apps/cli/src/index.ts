#!/usr/bin/env node

import { createCLI, setupCommands, displayWelcome, addGlobalErrorHandler } from './parser.js';

async function main(): Promise<void> {
  displayWelcome();

  const program = createCLI();
  await setupCommands(program);
  addGlobalErrorHandler(program);

  await program.parseAsync();
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});