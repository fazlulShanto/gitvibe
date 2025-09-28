import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCLI, addGlobalErrorHandler, setupCommands, displayWelcome, displayHelp } from '../../src/cli/parser'
import { Command } from 'commander'
import chalk from 'chalk'

vi.mock('commander', () => ({
  Command: vi.fn().mockImplementation(() => ({
    name: vi.fn().mockReturnThis(),
    description: vi.fn().mockReturnThis(),
    version: vi.fn().mockReturnThis(),
    configureOutput: vi.fn().mockReturnThis(),
    configureHelp: vi.fn().mockReturnThis(),
    option: vi.fn().mockReturnThis(),
    hook: vi.fn().mockReturnThis(),
    exitOverride: vi.fn().mockReturnThis(),
    commands: [],
  })),
}))

vi.mock('chalk', () => ({
  default: {
    red: vi.fn((str) => str),
    yellow: vi.fn((str) => str),
    cyan: vi.fn((str) => str),
    green: vi.fn((str) => str),
  },
}))

vi.mock('../utils/Logger.js', () => ({
  Logger: {
    setVerbose: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('./commands/init.js', () => ({
  registerInitCommand: vi.fn(),
}))

vi.mock('./commands/commit.js', () => ({
  registerCommitCommand: vi.fn(),
}))

vi.mock('./commands/pr.js', () => ({
  registerPRCommand: vi.fn(),
}))

vi.mock('./commands/config.js', () => ({
  registerConfigCommand: vi.fn(),
}))

vi.mock('./commands/hooks.js', () => ({
  registerHooksCommand: vi.fn(),
}))

describe('CLI Parser', () => {
  let mockProgram: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockProgram = {
      name: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      version: vi.fn().mockReturnThis(),
      configureOutput: vi.fn().mockReturnThis(),
      configureHelp: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      hook: vi.fn().mockReturnThis(),
      exitOverride: vi.fn().mockReturnThis(),
      commands: [],
    }
    ;(Command as any).mockImplementation(() => mockProgram)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createCLI', () => {
    it('should create CLI with correct configuration', () => {
      const program = createCLI()

      expect(Command).toHaveBeenCalled()
      expect(mockProgram.name).toHaveBeenCalledWith('gitvibe')
      expect(mockProgram.description).toHaveBeenCalledWith('AI-powered CLI tool for generating commit messages and PR descriptions')
      expect(mockProgram.version).toHaveBeenCalledWith('1.0.0')
      expect(mockProgram.configureOutput).toHaveBeenCalled()
      expect(mockProgram.configureHelp).toHaveBeenCalled()
      expect(mockProgram.option).toHaveBeenCalledWith('-v, --verbose', 'Enable verbose logging')
      expect(mockProgram.option).toHaveBeenCalledWith('--config <path>', 'Path to configuration file')
      expect(mockProgram.hook).toHaveBeenCalledWith('preAction', expect.any(Function))
    })

    it('should set verbose logging when verbose option is enabled', () => {
      const program = createCLI()
      const preActionHook = mockProgram.hook.mock.calls.find((call: any) => call[0] === 'preAction')[1]

      const mockThisCommand = { opts: () => ({ verbose: true }) }
      preActionHook(mockThisCommand, {})

      const { Logger } = require('../utils/Logger.js')
      expect(Logger.setVerbose).toHaveBeenCalledWith(true)
    })

    it('should not set verbose logging when verbose option is disabled', () => {
      const program = createCLI()
      const preActionHook = mockProgram.hook.mock.calls.find((call: any) => call[0] === 'preAction')[1]

      const mockThisCommand = { opts: () => ({ verbose: false }) }
      preActionHook(mockThisCommand, {})

      const { Logger } = require('../utils/Logger.js')
      expect(Logger.setVerbose).not.toHaveBeenCalled()
    })
  })

  describe('addGlobalErrorHandler', () => {
    it('should add error handler to program', () => {
      const program = createCLI()
      addGlobalErrorHandler(program)

      expect(mockProgram.exitOverride).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should handle help command gracefully', () => {
      const program = createCLI()
      addGlobalErrorHandler(program)

      const exitOverrideHandler = mockProgram.exitOverride.mock.calls[0][0]
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

      const helpError = { code: 'commander.help' }
      exitOverrideHandler(helpError)

      expect(mockExit).toHaveBeenCalledWith(0)
      mockExit.mockRestore()
    })

    it('should handle version command gracefully', () => {
      const program = createCLI()
      addGlobalErrorHandler(program)

      const exitOverrideHandler = mockProgram.exitOverride.mock.calls[0][0]
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

      const versionError = { code: 'commander.version' }
      exitOverrideHandler(versionError)

      expect(mockExit).toHaveBeenCalledWith(0)
      mockExit.mockRestore()
    })

    it('should handle unknown command with suggestions', () => {
      const program = createCLI()
      mockProgram.commands = [
        { name: () => 'init', description: () => 'Initialize CLI' },
        { name: () => 'commit', description: () => 'Generate commit message' },
      ]
      addGlobalErrorHandler(program)

      const exitOverrideHandler = mockProgram.exitOverride.mock.calls[0][0]
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const unknownCommandError = { code: 'commander.unknownCommand', message: 'Unknown command' }
      exitOverrideHandler(unknownCommandError)

      expect(consoleSpy).toHaveBeenCalledWith(chalk.yellow('\nDid you mean one of these?'))
      expect(mockExit).toHaveBeenCalledWith(1)

      consoleSpy.mockRestore()
      mockExit.mockRestore()
    })

    it('should handle uncaught exceptions', () => {
      const program = createCLI()
      addGlobalErrorHandler(program)

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
      const { Logger } = require('../utils/Logger.js')

      const mockError = new Error('Test error')
      process.emit('uncaughtException', mockError)

      expect(Logger.error).toHaveBeenCalledWith('Uncaught exception: Test error')
      expect(mockExit).toHaveBeenCalledWith(1)

      mockExit.mockRestore()
    })

    it('should handle unhandled rejections', () => {
      const program = createCLI()
      addGlobalErrorHandler(program)

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
      const { Logger } = require('../utils/Logger.js')

      const mockPromise = Promise.resolve()
      const mockReason = 'Test rejection'
      process.emit('unhandledRejection', mockReason, mockPromise)

      expect(Logger.error).toHaveBeenCalledWith(`Unhandled rejection at: ${mockPromise}, reason: ${mockReason}`)
      expect(mockExit).toHaveBeenCalledWith(1)

      mockExit.mockRestore()
    })
  })

  describe('setupCommands', () => {
    it('should register all commands', async () => {
      const program = createCLI()

      await setupCommands(program)

      const {
        registerInitCommand,
      } = await import('../../src/cli/commands/init.js')

      const {
        registerCommitCommand,
      } = await import('../../src/cli/commands/commit.js')

      const {
        registerPRCommand,
      } = await import('../../src/cli/commands/pr.js')

      const {
        registerConfigCommand,
      } = await import('../../src/cli/commands/config.js')

      const {
        registerHooksCommand,
      } = await import('../../src/cli/commands/hooks.js')

      expect(registerInitCommand).toHaveBeenCalledWith(program)
      expect(registerCommitCommand).toHaveBeenCalledWith(program)
      expect(registerPRCommand).toHaveBeenCalledWith(program)
      expect(registerConfigCommand).toHaveBeenCalledWith(program)
      expect(registerHooksCommand).toHaveBeenCalledWith(program)
    })
  })

  describe('displayWelcome', () => {
    it('should display welcome message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      displayWelcome()

      expect(consoleSpy).toHaveBeenCalledWith(chalk.cyan(expect.stringContaining('🤖 PR Description CLI')))

      consoleSpy.mockRestore()
    })
  })

  describe('displayHelp', () => {
    it('should display help information', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      displayHelp()

      expect(consoleSpy).toHaveBeenCalledWith(chalk.green(expect.stringContaining('Quick Start:')))
      expect(consoleSpy).toHaveBeenCalledWith(chalk.green(expect.stringContaining('gitvibe init')))
      expect(consoleSpy).toHaveBeenCalledWith(chalk.green(expect.stringContaining('gitvibe commit')))
      expect(consoleSpy).toHaveBeenCalledWith(chalk.green(expect.stringContaining('gitvibe pr')))

      consoleSpy.mockRestore()
    })
  })
})