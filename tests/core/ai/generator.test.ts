import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIGenerator } from '../../../src/core/ai/generator.js';
import { CLIConfig } from '../../../src/core/config/schema.js';

// Mock the AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

// Mock the provider manager
vi.mock('../../../src/core/ai/providers.js', () => ({
  AIProviderManager: vi.fn().mockImplementation(() => ({
    getModel: vi.fn(),
    validateProvider: vi.fn(),
    validateModel: vi.fn(),
    getAvailableProviders: vi.fn(),
    getProviderModels: vi.fn(),
  })),
}));

// Mock Logger
vi.mock('../../../src/utils/Logger.js', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    setVerbose: vi.fn(),
  },
}));

describe('AIGenerator', () => {
  let generator: AIGenerator;
  let mockConfig: CLIConfig;

  beforeEach(() => {
    mockConfig = {
      version: '1.0.0',
      defaultProvider: 'groq' as const,
      options: {
        streaming: false,
        maxDiffSize: 1000,
        chunkOverlap: 100,
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
      templates: {
        commit: {
          default: 'Generate commit message for: {diff}',
          custom: {},
          conventional: 'Conventional commit: {diff}',
        },
        pr: {
          default: 'Generate PR description for: {diff}',
          custom: {},
          detailed: 'Detailed PR description for: {diff}',
          chunk_summary: 'Summarize this chunk: {diff}',
        },
      },
      providers: {
        openai: {
          defaultModel: 'gpt-4',
          enabled: true,
          customModels: [],
        },
        anthropic: {
          defaultModel: 'claude-3',
          enabled: true,
          customModels: [],
        },
        google: {
          defaultModel: 'gemini-pro',
          enabled: true,
          customModels: [],
        },
        groq: {
          defaultModel: 'llama2-70b',
          enabled: true,
          customModels: [],
        },
      },
      gitHooks: {
        enabled: false,
        commitMsg: false,
        preCommit: false,
      },
      analytics: {
        enabled: true,
        anonymous: true,
      },
    };

    generator = new AIGenerator(mockConfig);
  });

  describe('chunkDiff', () => {
    it('should return single chunk for small diffs', () => {
      const smallDiff = 'diff --git a/file.txt b/file.txt\n+line1\n+line2';
      const chunks = (generator as any).chunkDiff(smallDiff);
      expect(chunks).toEqual([smallDiff]);
    });

    it('should split large diffs into chunks with overlap', () => {
      // Create a diff larger than maxDiffSize (1000 chars)
      const largeDiff = 'diff --git a/file.txt b/file.txt\n' + '+'.repeat(1200);
      const chunks = (generator as any).chunkDiff(largeDiff);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]).toContain('diff --git');
      expect(chunks[1]).toBeDefined();

      // Check overlap - second chunk should start before the end of first chunk
      const firstChunkEnd = chunks[0].length;
      const secondChunkStart = largeDiff.indexOf(chunks[1]);
      expect(secondChunkStart).toBeLessThan(firstChunkEnd);
    });

    it('should break chunks at line boundaries when possible', () => {
      const diffWithLines = 'diff --git a/file.txt b/file.txt\n' +
        '+line1\n+line2\n+line3\n+line4\n+line5\n'.repeat(50); // ~1400 chars

      const chunks = (generator as any).chunkDiff(diffWithLines);

      expect(chunks.length).toBeGreaterThan(1);

      // At least one chunk should be smaller than the full diff
      expect(chunks.some((chunk: string) => chunk.length < diffWithLines.length)).toBe(true);
    });
  });

  describe('generateCommitMessage', () => {
    it('should use first chunk for large diffs', async () => {
      const largeDiff = 'diff --git a/file.txt b/file.txt\n' + '+'.repeat(1200);

      // Mock the generateCommitMessageFromChunk method
      const mockGenerateFromChunk = vi.spyOn(generator as any, 'generateCommitMessageFromChunk')
        .mockResolvedValue('Test commit message');

      await generator.generateCommitMessage(largeDiff);

      expect(mockGenerateFromChunk).toHaveBeenCalledTimes(1);
      expect(mockGenerateFromChunk).toHaveBeenCalledWith(expect.stringContaining('diff --git'), {});
    });

    it('should use full diff for small diffs', async () => {
      const smallDiff = 'diff --git a/file.txt b/file.txt\n+line1';

      const mockGenerateFromChunk = vi.spyOn(generator as any, 'generateCommitMessageFromChunk')
        .mockResolvedValue('Test commit message');

      await generator.generateCommitMessage(smallDiff);

      expect(mockGenerateFromChunk).toHaveBeenCalledWith(smallDiff, {});
      expect(mockGenerateFromChunk).toHaveBeenCalledTimes(1);
    });
  });

  describe('generatePRDescription', () => {
    it('should process chunks and combine results for large diffs', async () => {
      const largeDiff = 'diff --git a/file.txt b/file.txt\n' + '+'.repeat(1200);

      // Mock the generatePRDescriptionFromChunk method
      const mockGenerateFromChunk = vi.spyOn(generator as any, 'generatePRDescriptionFromChunk')
        .mockResolvedValueOnce('Summary of first chunk')
        .mockResolvedValueOnce('Summary of second chunk');

      // Mock generateText for final combination
      const { generateText } = await import('ai');
      (generateText as any).mockResolvedValue({ text: 'Combined PR description' });

      const result = await generator.generatePRDescription(largeDiff);

      expect(mockGenerateFromChunk).toHaveBeenCalledTimes(2);
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('create a comprehensive PR description'),
          maxOutputTokens: 1000,
          temperature: 0.7,
        })
      );
      expect(result).toBe('Combined PR description');
    });

    it('should use full diff for small diffs', async () => {
      const smallDiff = 'diff --git a/file.txt b/file.txt\n+line1';

      const mockGenerateFromChunk = vi.spyOn(generator as any, 'generatePRDescriptionFromChunk')
        .mockResolvedValue('PR description');

      const result = await generator.generatePRDescription(smallDiff);

      expect(mockGenerateFromChunk).toHaveBeenCalledWith(smallDiff, {});
      expect(result).toBe('PR description');
    });
  });
});