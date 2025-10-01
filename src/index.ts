#!/usr/bin/env node

import { Command } from 'commander'
import { initCommand } from './cli/commands/init'
import { configCommand } from './cli/commands/config'
import { commitCommand } from './cli/commands/commit'
import { prCommand } from './cli/commands/pr'

const program = new Command()

program
  .name('gitvibe')
  .description('AI-powered CLI tool for generating commit messages and PR descriptions')
  .version('1.0.0')

program.addCommand(initCommand)
program.addCommand(configCommand)
program.addCommand(commitCommand)
program.addCommand(prCommand)

program.parse()