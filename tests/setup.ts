import { beforeAll, afterAll, vi } from 'vitest'

// Mock external dependencies
vi.mock('keytar', () => ({
  default: {
    setPassword: vi.fn(),
    getPassword: vi.fn(),
    deletePassword: vi.fn(),
  },
}))

vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    status: vi.fn(),
    diff: vi.fn(),
    diffSummary: vi.fn(),
    log: vi.fn(),
    branch: vi.fn(),
    checkout: vi.fn(),
    add: vi.fn(),
    commit: vi.fn(),
  })),
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
  prompt: vi.fn(),
}))

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  })),
}))

// Mock AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}))

// Mock AI providers
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(),
}))

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(),
}))

// Mock fs for file operations
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

// Mock path
vi.mock('path', () => ({
  default: {
    join: vi.fn(),
    resolve: vi.fn(),
    dirname: vi.fn(),
    basename: vi.fn(),
  },
  join: vi.fn(),
  resolve: vi.fn(),
  dirname: vi.fn(),
  basename: vi.fn(),
}))

// Mock os
vi.mock('os', () => ({
  homedir: vi.fn(() => '/home/test'),
  platform: vi.fn(() => 'linux'),
}))

// Mock yaml
vi.mock('yaml', () => ({
  default: {
    parse: vi.fn(),
    stringify: vi.fn(),
  },
  parse: vi.fn(),
  stringify: vi.fn(),
}))

// Global test setup
beforeAll(() => {
  // Set up test environment variables
  process.env.NODE_ENV = 'test'
})

afterAll(() => {
  vi.clearAllMocks()
})