import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerCommitCommand } from '../../../src/cli/commands/commit'
import { Command } from 'commander'
import { ConfigManager } from '../../../src/core/config/manager'
import { AIGenerator } from '../../../src/core/ai/generator'
import { GitAnalyzer } from '../../../src/core/git/analyzer'

vi.mock('commander', () => ({
  Command: vi.fn().mockImplementation(() => ({
    command: vi.fn().mockReturnThis(),
    alias: vi.fn().mockReturnThis(),
    description: vi.fn().mockReturnThis(),
    option: vi.fn().mockReturnThis(),
    action: vi.fn().mockReturnThis(),
  })),
}))

vi.mock('../../../src/core/config/manager', () => ({
  ConfigManager: {
    getInstance: vi.fn(),
  },
}))

vi.mock('../../../src/core/ai/generator', () => ({
  AIGenerator: vi.fn(),
}))

vi.mock('../../../src/core/git/analyzer', () => ({
  GitAnalyzer: vi.fn(),
}))

vi.mock('../../../src/utils/Logger', () => ({
  Logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  })),
}))

vi.mock('chalk', () => ({
  default: {
    blue: vi.fn((str) => str),
    cyan: vi.fn((str) => str),
    green: vi.fn((str) => str),
    red: vi.fn((str) => str),
    white: vi.fn((str) => str),
    yellow: vi.fn((str) => str),
  },
}))

describe('Commit Command', () => {
  let mockProgram: any
  let mockConfigManager: any
  let mockConfig: any
  let mockGitAnalyzer: any
  let mockAIGenerator: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockProgram = {
      command: vi.fn().mockReturnThis(),
      alias: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    }
    ;(Command as any).mockImplementation(() => mockProgram)

    mockConfig = {
      defaultProvider: 'openai',
      options: { streaming: true },
      providers: {
        openai: { defaultModel: 'gpt-4', enabled: true }
      },
      templates: {
        commit: { default: 'test template' }
      }
    }

    mockConfigManager = {
      load: vi.fn().mockResolvedValue(mockConfig),
    }

    mockGitAnalyzer = {
      isGitRepository: vi.fn().mockResolvedValue(true),
      hasStagedChanges: vi.fn().mockResolvedValue(true),
      hasChanges: vi.fn().mockResolvedValue(false),
      getStagedChanges: vi.fn().mockResolvedValue({
        diff: 'test diff content',
        files: ['file1.ts', 'file2.ts'],
        additions: 10,
        deletions: 5,
        branch: 'main'
      }),
      formatDiffForAI: vi.fn().mockReturnValue('formatted diff'),
      stageAll: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      getRecentCommits: vi.fn().mockResolvedValue(['commit1', 'commit2', 'commit3']),
    }

    mockAIGenerator = {
      validateProvider: vi.fn().mockReturnValue(true),
      validateModel: vi.fn().mockReturnValue(true),
      generateCommitMessage: vi.fn().mockResolvedValue('Generated commit message'),
      streamCommitMessage: vi.fn().mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield 'Generated '
          yield 'commit '
          yield 'message'
        }
      }),
    }

    ;(ConfigManager.getInstance as any).mockReturnValue(mockConfigManager)
    ;(AIGenerator as any).mockImplementation(() => mockAIGenerator)
    ;(GitAnalyzer as any).mockImplementation(() => mockGitAnalyzer)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('registerCommitCommand', () => {
    it('should register commit command with correct options', () => {
      registerCommitCommand(mockProgram)

      expect(mockProgram.command).toHaveBeenCalledWith('commit')
      expect(mockProgram.alias).toHaveBeenCalledWith('c')
      expect(mockProgram.description).toHaveBeenCalledWith('Generate AI-powered commit message from staged changes')
      expect(mockProgram.option).toHaveBeenCalledWith('-p, --provider <provider>', 'AI provider to use (openai, anthropic, google)')
      expect(mockProgram.option).toHaveBeenCalledWith('-m, --model <model>', 'Specific model to use')
      expect(mockProgram.option).toHaveBeenCalledWith('-t, --template <template>', 'Template to use (default, conventional, custom name)')
      expect(mockProgram.option).toHaveBeenCalledWith('--no-stream', 'Disable streaming output')
      expect(mockProgram.option).toHaveBeenCalledWith('--stage-all', 'Stage all changes before generating commit message')
      expect(mockProgram.option).toHaveBeenCalledWith('--commit', 'Automatically commit with generated message')
      expect(mockProgram.option).toHaveBeenCalledWith('--edit', 'Edit the generated message before committing')
      expect(mockProgram.action).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe('commitCommand execution', () => {
    let actionHandler: any

    beforeEach(() => {
      // Get the action handler from the mock calls
      actionHandler = mockProgram.action.mock.calls[mockProgram.action.mock.calls.length - 1][0]
    })

    it('should throw error if not in git repository', async () => {
      mockGitAnalyzer.isGitRepository.mockResolvedValue(false)

      await expect(actionHandler({})).rejects.toThrow('Not in a Git repository')
    })

    it('should stage all changes when stageAll option is true', async () => {
      const actionHandler = mockProgram.action.mock.calls[0][0]

      await actionHandler({ stageAll: true })

      expect(mockGitAnalyzer.stageAll).toHaveBeenCalled()
    })

    it('should prompt to stage changes when no staged changes exist', async () => {
      mockGitAnalyzer.hasStagedChanges.mockResolvedValue(false)
      mockGitAnalyzer.hasChanges.mockResolvedValue(true)

      const mockInquirer = vi.mocked(await import('inquirer'))
      mockInquirer.default.prompt.mockResolvedValue({ stageNow: true })

      const actionHandler = mockProgram.action.mock.calls[0][0]

      await actionHandler({})

      expect(mockInquirer.default.prompt).toHaveBeenCalledWith([{
        type: 'confirm',
        name: 'stageNow',
        message: 'Would you like to stage all changes now?',
        default: true,
      }])
      expect(mockGitAnalyzer.stageAll).toHaveBeenCalled()
    })

    it('should generate commit message with streaming', async () => {
      const mockInquirer = vi.mocked(await import('inquirer'))
      mockInquirer.default.prompt.mockResolvedValue({ action: 'show' })

      const actionHandler = mockProgram.action.mock.calls[0][0]

      await actionHandler({})

      expect(mockAIGenerator.streamCommitMessage).toHaveBeenCalledWith(
        'formatted diff',
        {
          provider: 'openai',
          model: undefined,
          template: undefined,
          stream: true,
        }
      )
    })

    it('should generate commit message without streaming', async () => {
      mockConfig.options.streaming = false

      const mockInquirer = vi.mocked(await import('inquirer'))
      mockInquirer.default.prompt.mockResolvedValue({ action: 'show' })

      const actionHandler = mockProgram.action.mock.calls[0][0]

      await actionHandler({})

      expect(mockAIGenerator.generateCommitMessage).toHaveBeenCalledWith(
        'formatted diff',
        {
          provider: 'openai',
          model: undefined,
          template: undefined,
          stream: false,
        }
      )
    })

    it('should validate provider and model', async () => {
      const mockInquirer = vi.mocked(await import('inquirer'))
      mockInquirer.default.prompt.mockResolvedValue({ action: 'show' })

      const actionHandler = mockProgram.action.mock.calls[0][0]

      await actionHandler({ provider: 'invalid', model: 'invalid-model' })

      expect(mockAIGenerator.validateProvider).toHaveBeenCalledWith('invalid')
      expect(mockAIGenerator.validateModel).toHaveBeenCalledWith('invalid', 'invalid-model')
    })

    it('should handle commit action', async () => {
      const mockInquirer = vi.mocked(await import('inquirer'))
      mockInquirer.default.prompt.mockResolvedValue({ action: 'commit' })

      const actionHandler = mockProgram.action.mock.calls[0][0]

      await actionHandler({})

      expect(mockGitAnalyzer.commit).toHaveBeenCalledWith('Generated commit message')
      expect(mockGitAnalyzer.getRecentCommits).toHaveBeenCalledWith(3)
    })

    it('should handle edit action', async () => {
      const mockInquirer = vi.mocked(await import('inquirer'))
      mockInquirer.default.prompt
        .mockResolvedValueOnce({ action: 'edit' })
        .mockResolvedValueOnce({ editedMessage: 'Edited commit message' })

      const actionHandler = mockProgram.action.mock.calls[0][0]

      await actionHandler({})

      expect(mockInquirer.default.prompt).toHaveBeenCalledWith([{
        type: 'editor',
        name: 'editedMessage',
        message: 'Edit your commit message:',
        default: 'Generated commit message',
      }])
      expect(mockGitAnalyzer.commit).toHaveBeenCalledWith('Edited commit message')
    })

    it('should handle copy action', async () => {
      const mockInquirer = vi.mocked(await import('inquirer'))
      mockInquirer.default.prompt.mockResolvedValue({ action: 'copy' })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const actionHandler = mockProgram.action.mock.calls[0][0]

      await actionHandler({})

      expect(consoleSpy).toHaveBeenCalledWith('📋 Message ready to copy:')
      consoleSpy.mockRestore()
    })

    it('should handle show action', async () => {
      const mockInquirer = vi.mocked(await import('inquirer'))
      mockInquirer.default.prompt.mockResolvedValue({ action: 'show' })

      const actionHandler = mockProgram.action.mock.calls[0][0]

      await actionHandler({})

      // Should not call commit or other actions
      expect(mockGitAnalyzer.commit).not.toHaveBeenCalled()
    })

    it('should handle empty edited message', async () => {
      const mockInquirer = vi.mocked(await import('inquirer'))
      mockInquirer.default.prompt
        .mockResolvedValueOnce({ action: 'edit' })
        .mockResolvedValueOnce({ editedMessage: '' })

      const actionHandler = mockProgram.action.mock.calls[0][0]

      await actionHandler({})

      expect(mockGitAnalyzer.commit).not.toHaveBeenCalled()
    })
  })
})