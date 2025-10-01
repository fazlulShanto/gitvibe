# GitVibe CLI Tool Development Plan

## Overview

Create a modular Node.js project called "gitvibe" with:

-   Core library for AI-powered git operations
-   CLI tool for command-line usage
-   Website for documentation and landing page

The CLI generates commit messages and PR descriptions from staged changes or last N commits using AI providers via Vercel AI SDK.

## Key Features

-   Global npm installation
-   Interactive setup with `gitvibe init`
-   Configurable AI providers (OpenAI, Google, Anthropic, Groq)
-   Secure API key storage in OS keychain
-   YAML-based config management
-   Intelligent chunking for large git diffs to fit AI token limits
-   Commands: init, config (new/list/set-default), commit, pr

## Architecture

### Modularity

-   **Core Library** (`src/core`): Internal library handling raw operations (AI integration, git operations, config management)
-   **CLI Tool**: Main published package bundling core functionality for command-line usage
-   **Website** (`website/`): Documentation and landing page (separate, not published on npm)

### Technologies

-   Language: TypeScript for type safety
-   Build: tsdown for bundling, tsx for development
-   CLI Framework: Commander.js
-   Interactive Prompts: inquirer.js
-   Validation: Zod for config and input validation
-   Keychain: keytar (cross-platform)
-   Config: js-yaml
-   AI: @vercel/ai
-   Git: simple-git
-   Clipboard: clipboardy
-   Editor: open-editor for config editing
-   Entry Point: bin/gitvibe.js (compiled from TypeScript)

### Project Structure

```
src/
├── core/           # Core library
│   ├── ai/         # AI provider integrations
│   ├── git/        # Git operations and diff chunking
│   ├── config/     # Configuration management and keychain
│   └── types/      # TypeScript types and Zod schemas
├── cli/            # CLI commands (init, config, commit, pr)
│   └── commands/
└── index.ts        # CLI entry point
website/            # Documentation site
bin/
└── gitvibe.js      # Compiled entry point
```

## Command Structure

-   `gitvibe init` - Interactive setup
-   `gitvibe config new --name <name>` - Create/edit config in editor
-   `gitvibe config list` - List configs
-   `gitvibe config set-default <name>` - Set default config
-   `gitvibe commit [options]` - Generate commit message (options: copy to clipboard, edit, commit to git; interactive prompt if no options provided)
-   `gitvibe pr [options]` - Generate PR description (options: copy to clipboard, edit, open PR with GitHub CLI; interactive prompt if no options provided)

## Implementation Steps

1. Update package.json with dependencies
2. Create CLI entry point
3. Implement init command
4. Implement config management
5. Implement git integration
6. Implement AI generation
7. Add error handling
8. Create documentation

## Config Schema

Each config YAML contains:

-   ai_provider: string
-   model: string
-   temperature: number
-   max_commit_tokens: number
-   max_pr_tokens: number
-   stream_output: boolean
-   commit_variations: number (default 2)
-   pr_prompt: string
-   commit_prompt: string

## Security

-   API keys stored in OS keychain with provider-specific keys
-   Config files do not contain sensitive data
