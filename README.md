# GitVibe

AI-powered CLI tool for generating commit messages and PR descriptions. Streamline your Git workflow with intelligent, context-aware suggestions powered by leading AI models.

## Features

-   🤖 **AI-Powered Generation**: Generate commit messages and PR descriptions using OpenAI, Google, Anthropic, or Groq
-   🎯 **Conventional Commits**: Follows conventional commit standards for consistent messaging
-   📋 **Clipboard Integration**: Easily copy generated content to clipboard
-   🔄 **Multiple Variations**: Get multiple suggestions and choose the best one
-   🚀 **GitHub Integration**: Create PRs directly with GitHub CLI
-   ⚙️ **Flexible Configuration**: Multiple config profiles with custom prompts and settings
-   🎨 **Interactive Mode**: User-friendly prompts for easy setup and usage

## Installation

### Prerequisites

-   Node.js 20.19.0+ (check with `node --version`)
-   Git repository
-   API key for your chosen AI provider
-   github CLI (for PR)

### Install via npm (Recommended)

```bash
npm install -g gitvibe
```

### Install via pnpm

```bash
pnpm add -g gitvibe --ignore-scripts=false
```

## Quick Start

> # You can use [Groq free tier ](https://console.groq.com/docs/rate-limits)unless your git diff is really big.

Personally I use `moonshotai/kimi-k2-instruct-0905` model. Hence it's defualt choice in the cli.

1. **Initialize GitVibe**:

    ```bash
    gitvibe init
    ```

    This will guide you through selecting an AI provider, model, and entering your API key.

2. **Generate a commit message**:

    ```bash
    git add .
    gitvibe commit
    ```

    Select from generated variations and commit directly or copy to clipboard.

3. **Generate a PR description**:
    ```bash
    gitvibe pr
    ```
    Creates a PR title and description from recent commits.

## Commands

### `gitvibe init`

Initialize GitVibe with AI provider setup. This interactive command will:

-   Prompt you to select an AI provider (Groq, OpenAI, Google, or Anthropic)
-   Choose a model from available options
-   Enter your API key (securely stored)
-   Test the configuration
-   Create a default configuration file

```bash
gitvibe init
```

### `gitvibe commit` (alias: `c`)

Generate commit messages from staged changes.

**Options:**

-   `--copy`: Copy the selected message to clipboard
-   `--commit`: Commit directly with the selected message
-   `--config <name>`: Use a specific configuration

**Examples:**

```bash
# Interactive mode - select from variations
gitvibe commit

# Copy to clipboard
gitvibe commit --copy

# Commit directly
gitvibe commit --commit

# Use specific config
gitvibe commit --config my-config
```

The command analyzes your staged changes and generates multiple commit message variations following conventional commit format (e.g., `feat: add user authentication`).

### `gitvibe pr`

Generate PR descriptions from recent commits.

**Options:**

-   `--commits <n>`: Number of recent commits to include (default: 1)
-   `--copy`: Copy the PR content to clipboard
-   `--open`: Create PR using GitHub CLI
-   `--config <name>`: Use a specific configuration

**Examples:**

```bash
# Generate PR from last commit
gitvibe pr

# Include last 3 commits
gitvibe pr --commits 3

# Copy to clipboard
gitvibe pr --copy

# Create PR directly (requires GitHub CLI)
gitvibe pr --open
```

### `gitvibe config`

Manage configuration profiles.

#### `gitvibe config new <name>`

Create a new configuration file. Opens your default editor to customize:

-   AI provider and model ( Groq with Kimi-k2 model is suggested)
-   Custom prompts
-   Temperature and token limits
-   Output streaming preferences

```bash
gitvibe config new my-config
```

#### `gitvibe config list`

List all available configurations with validity status.

```bash
gitvibe config list
```

#### `gitvibe config show [name]`

Display configuration details. Shows default config if no name provided.

```bash
gitvibe config show
gitvibe config show my-config
```

#### `gitvibe config set-default <name>`

Set the default configuration.

```bash
gitvibe config set-default my-config
```

### `gitvibe create-config <name>`

Create a new configuration interactively. This command guides you through selecting an AI provider, model, temperature, and API key, then tests the configuration and opens it in your editor for customization.

```bash
gitvibe create-config my-config
```

## Examples

### Complete Workflow

```bash
# 1. Initialize (first time only)
gitvibe init

# 2. Stage your changes
git add .

# 3. Generate and commit
gitvibe commit --commit # gitvibe c

# 4. Push and create PR
git push origin feature-branch
gitvibe pr --open
```

### Custom Configuration

```bash
# Create custom config for different projects
gitvibe config new work-config

# Edit the config file that opens
# Modify prompts, temperature, etc.

# Use specific config
gitvibe commit --config work-config
```

### Batch Operations

```bash
# Generate PR from multiple commits
gitvibe pr --commits 5 --copy

# Quick commit without interaction
echo "quick fix" | git commit -F -
# Or use GitVibe for better messages
gitvibe commit --commit
```

## License

MIT License - see LICENSE file for details.

[Command Reference](./CLI_GUIDE.md)

# Inspiration

-   https://github.com/KartikLabhshetwar/lazycommit
