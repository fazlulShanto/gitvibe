import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs'
import { join, extname } from 'path'
import { homedir } from 'os'
import yaml from 'js-yaml'
import keytar from 'keytar'
import { Config, ConfigMap, ConfigMapSchema, ConfigSchema, AIProvider } from '../types'

const CONFIG_DIR = join(homedir(), '.gitvibe')
const CONFIGS_DIR = join(CONFIG_DIR, 'configs')
const DEFAULT_CONFIG_FILE = join(CONFIG_DIR, 'default.txt')

export class ConfigManager {
  private static ensureConfigDir() {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true })
    }
    if (!existsSync(CONFIGS_DIR)) {
      mkdirSync(CONFIGS_DIR, { recursive: true })
    }
  }

  static async loadConfigs(): Promise<ConfigMap> {
    this.ensureConfigDir()
    const configs: ConfigMap = {}
    if (!existsSync(CONFIGS_DIR)) return configs
    const files = readdirSync(CONFIGS_DIR).filter(f => extname(f) === '.yaml')
    for (const file of files) {
      const name = file.replace('.yaml', '')
      const filePath = join(CONFIGS_DIR, file)
      try {
        const content = readFileSync(filePath, 'utf-8')
        const config = ConfigSchema.parse(yaml.load(content))
        configs[name] = config
      } catch (error) {
        // Skip invalid configs
      }
    }
    return configs
  }


  static async getDefaultConfigName(): Promise<string | null> {
    if (!existsSync(DEFAULT_CONFIG_FILE)) {
      return null
    }
    return readFileSync(DEFAULT_CONFIG_FILE, 'utf-8').trim()
  }

  static async setDefaultConfigName(name: string): Promise<void> {
    this.ensureConfigDir()
    writeFileSync(DEFAULT_CONFIG_FILE, name, 'utf-8')
  }

  static async saveConfig(name: string, config: Config): Promise<void> {
    this.ensureConfigDir()
    const filePath = join(CONFIGS_DIR, `${name}.yaml`)
    const content = yaml.dump(config)
    writeFileSync(filePath, content, 'utf-8')
  }

  static async getConfig(name: string): Promise<Config | null> {
    const filePath = join(CONFIGS_DIR, `${name}.yaml`)
    if (!existsSync(filePath)) return null
    try {
      const content = readFileSync(filePath, 'utf-8')
      return ConfigSchema.parse(yaml.load(content))
    } catch (error) {
      return null
    }
  }

  static async listConfigs(): Promise<string[]> {
    this.ensureConfigDir()
    if (!existsSync(CONFIGS_DIR)) return []
    const files = readdirSync(CONFIGS_DIR).filter(f => extname(f) === '.yaml')
    return files.map(f => f.replace('.yaml', ''))
  }

  static async listConfigsWithValidity(): Promise<{name: string, valid: boolean}[]> {
    this.ensureConfigDir()
    if (!existsSync(CONFIGS_DIR)) return []
    const files = readdirSync(CONFIGS_DIR).filter(f => extname(f) === '.yaml')
    const result: {name: string, valid: boolean}[] = []
    for (const file of files) {
      const name = file.replace('.yaml', '')
      const filePath = join(CONFIGS_DIR, file)
      let valid = false
      try {
        const content = readFileSync(filePath, 'utf-8')
        ConfigSchema.parse(yaml.load(content))
        valid = true
      } catch (error) {
        // invalid
      }
      result.push({name, valid})
    }
    return result
  }

  static async deleteConfig(name: string): Promise<void> {
    const filePath = join(CONFIGS_DIR, `${name}.yaml`)
    if (existsSync(filePath)) {
      unlinkSync(filePath)
    }
  }

  static getApiKeyServiceName(provider: AIProvider): string {
    return `gitvibe-${provider}`
  }

  static async getApiKey(provider: AIProvider): Promise<string | null> {
    return await keytar.getPassword(this.getApiKeyServiceName(provider), 'api-key')
  }

  static async setApiKey(provider: AIProvider, key: string): Promise<void> {
    await keytar.setPassword(this.getApiKeyServiceName(provider), 'api-key', key)
  }

  static async deleteApiKey(provider: AIProvider): Promise<void> {
    await keytar.deletePassword(this.getApiKeyServiceName(provider), 'api-key')
  }
}