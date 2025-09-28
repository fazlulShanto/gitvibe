import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConfigManager } from '../../../src/core/config/manager'
import { promises as fs } from 'fs'
import * as path from 'path'
import os from 'os'
import keytar from 'keytar'

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
  },
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
}))

vi.mock('path', () => ({
  join: vi.fn(),
  resolve: vi.fn(),
  dirname: vi.fn(),
  basename: vi.fn(),
}))

vi.mock('os', () => ({
  homedir: vi.fn(() => '/home/test'),
  platform: vi.fn(() => 'linux'),
}))

vi.mock('yaml', () => ({
  parse: vi.fn(),
  stringify: vi.fn(),
}))

vi.mock('keytar', () => ({
  default: {
    setPassword: vi.fn(),
    getPassword: vi.fn(),
    deletePassword: vi.fn(),
  }
}))

describe('ConfigManager', () => {
  let configManager: ConfigManager

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset singleton instance
    ;(ConfigManager as any).instance = null
    configManager = ConfigManager.getInstance()
    // Mock getConfigPath to return a fixed path
    vi.spyOn(configManager, 'getConfigPath').mockReturnValue('/mock/config/path')
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ConfigManager.getInstance()
      const instance2 = ConfigManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('getConfigPath', () => {
    it('should return correct config path', () => {
      const mockJoin = vi.mocked(path.join)
      const mockHomedir = vi.mocked(os.homedir)

      mockHomedir.mockReturnValue('/home/test')
      mockJoin.mockReturnValue('/home/test/.gitvibe/config.yaml')

      const configPath = configManager.getConfigPath()
      expect(configPath).toBe('/home/test/.gitvibe/config.yaml')
      expect(mockJoin).toHaveBeenCalledWith('/home/test', '.gitvibe', 'config.yaml')
    })
  })

  describe('load', () => {
    it('should load config successfully', async () => {
      const mockConfig = {
        version: '1.0.0',
        defaultProvider: 'openai',
        providers: {
          openai: { defaultModel: 'gpt-4', enabled: true }
        },
        templates: {
          commit: { default: 'test template' },
          pr: { default: 'test pr template' }
        },
        options: { streaming: true, maxOutputTokens: 500, temperature: 0.7 },
        gitHooks: { enabled: false, commitMsg: false, preCommit: false },
        analytics: { enabled: true, anonymous: true }
      }

      vi.mocked(fs.readFile).mockResolvedValue('yaml content')
      const mockYamlParse = vi.mocked(require('yaml').parse)
      mockYamlParse.mockReturnValue(mockConfig)

      const config = await configManager.load()
      expect(config).toEqual(mockConfig)
      expect(fs.readFile).toHaveBeenCalled()
    })

    it('should return default config if file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' })
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      const config = await configManager.load()
      expect(config).toHaveProperty('version')
      expect(config).toHaveProperty('providers')
      expect(config).toHaveProperty('defaultProvider')
    })
  })

  describe('save', () => {
    it('should save config successfully', async () => {
      // First load to initialize config
      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' })
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await configManager.load()

      const mockYamlStringify = vi.mocked(require('yaml').stringify)
      mockYamlStringify.mockReturnValue('yaml content')

      await configManager.save()

      expect(fs.mkdir).toHaveBeenCalled()
      expect(fs.writeFile).toHaveBeenCalled()
    })

    it('should throw error if no config to save', async () => {
      ;(configManager as any).config = null

      await expect(configManager.save()).rejects.toThrow('No configuration to save')
    })
  })

  describe('get', () => {
    it('should return cached config', async () => {
      // First load to initialize config
      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' })
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await configManager.load()

      const config = await configManager.get()
      expect(config).toHaveProperty('version')
    })
  })

  describe('set', () => {
    it('should update config property', async () => {
      // First load to initialize config
      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' })
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await configManager.load()

      const mockYamlStringify = vi.mocked(require('yaml').stringify)
      mockYamlStringify.mockReturnValue('yaml content')

      await configManager.set('defaultProvider', 'anthropic')

      const config = await configManager.get()
      expect(config.defaultProvider).toBe('anthropic')
    })
  })

  describe('update', () => {
    it('should update multiple config properties', async () => {
      // First load to initialize config
      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' })
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await configManager.load()

      const mockYamlStringify = vi.mocked(require('yaml').stringify)
      mockYamlStringify.mockReturnValue('yaml content')

      await configManager.update({
        defaultProvider: 'google',
        options: { streaming: false, maxOutputTokens: 1000, temperature: 0.5 }
      })

      const config = await configManager.get()
      expect(config.defaultProvider).toBe('google')
      expect(config.options.streaming).toBe(false)
    })
  })

  describe('reset', () => {
    it('should reset config to defaults', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      const mockYamlStringify = vi.mocked(require('yaml').stringify)
      mockYamlStringify.mockReturnValue('yaml content')

      await configManager.reset()

      const config = await configManager.get()
      expect(config.version).toBe('1.0.0')
      expect(config.defaultProvider).toBe('openai')
    })
  })

  describe('exists', () => {
    it('should return true if config file exists', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)

      const exists = await configManager.exists()
      expect(exists).toBe(true)
    })

    it('should return false if config file does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'))

      const exists = await configManager.exists()
      expect(exists).toBe(false)
    })
  })

  describe('getApiKey', () => {
    it('should return API key from keychain', async () => {
      const mockKeytar = vi.mocked(keytar)
      mockKeytar.getPassword.mockResolvedValueOnce('test-api-key')

      const apiKey = await configManager.getApiKey('openai')
      expect(apiKey).toBe('test-api-key')
      expect(mockKeytar.getPassword).toHaveBeenCalledWith('pr-description-cli', 'openai')
    })

    it('should return null if API key not found', async () => {
      const mockKeytar = vi.mocked(keytar)
      mockKeytar.getPassword.mockResolvedValueOnce(null)

      const apiKey = await configManager.getApiKey('openai')
      expect(apiKey).toBeNull()
      expect(mockKeytar.getPassword).toHaveBeenCalledWith('pr-description-cli', 'openai')
    })
  })

  describe('setApiKey', () => {
    it('should store API key in keychain', async () => {
      const mockKeytar = vi.mocked(keytar)
      mockKeytar.setPassword.mockResolvedValueOnce(undefined)

      await configManager.setApiKey('openai', 'test-api-key')
      expect(mockKeytar.setPassword).toHaveBeenCalledWith('pr-description-cli', 'openai', 'test-api-key')
    })
  })

  describe('deleteApiKey', () => {
    it('should delete API key from keychain', async () => {
      const mockKeytar = vi.mocked(keytar)
      mockKeytar.deletePassword.mockResolvedValueOnce(true)

      const result = await configManager.deleteApiKey('openai')
      expect(result).toBe(true)
      expect(mockKeytar.deletePassword).toHaveBeenCalledWith('pr-description-cli', 'openai')
    })
  })

  describe('hasApiKey', () => {
    it('should return true if API key exists', async () => {
      const mockKeytar = vi.mocked(keytar)
      mockKeytar.getPassword.mockResolvedValueOnce('test-api-key')

      const hasKey = await configManager.hasApiKey('openai')
      expect(hasKey).toBe(true)
      expect(mockKeytar.getPassword).toHaveBeenCalledWith('pr-description-cli', 'openai')
    })

    it('should return false if API key does not exist', async () => {
      const mockKeytar = vi.mocked(keytar)
      mockKeytar.getPassword.mockResolvedValueOnce(null)

      const hasKey = await configManager.hasApiKey('openai')
      expect(hasKey).toBe(false)
      expect(mockKeytar.getPassword).toHaveBeenCalledWith('pr-description-cli', 'openai')
    })
  })
})