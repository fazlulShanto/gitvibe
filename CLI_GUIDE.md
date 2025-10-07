# GitVibe CLI - Complete Usage Guide

A comprehensive guide to using GitVibe's command-line interface for AI-powered commit messages and PR descriptions.

## Table of Contents

-   [Getting Started](#getting-started)
-   [Commands Overview](#commands-overview)
-   [Command Reference](#command-reference)
    -   [gitvibe init](#gitvibe-init)
    -   [gitvibe commit (c)](#gitvibe-commit-c)
    -   [gitvibe pr](#gitvibe-pr)
    -   [gitvibe config](#gitvibe-config)
    -   [gitvibe create-config](#gitvibe-create-config)
-   [Command Options](#command-options)
-   [Workflow Examples](#workflow-examples)
-   [Tips & Best Practices](#tips--best-practices)
-   [Troubleshooting](#troubleshooting)

---

## Getting Started

### First Time Setup

Before using GitVibe, you need to initialize it with your AI provider credentials:

```bash
gitvibe init
```

This interactive command will:

1. ✅ Let you choose an AI provider (Groq, OpenAI, Google, or Anthropic)
2. 🎯 Select a model from available options
3. 🔑 Securely store your API key
4. 🧪 Test the configuration
5. 💾 Create a default configuration profile

### Quick Command Reference

| Command                 | Alias | Purpose                     | Common Usage                      |
| ----------------------- | ----- | --------------------------- | --------------------------------- |
| `gitvibe init`          | -     | Setup AI provider           | `gitvibe init`                    |
| `gitvibe commit`        | `c`   | Generate commit message     | `gitvibe c --apply`               |
| `gitvibe pr`            | -     | Generate PR description     | `gitvibe pr --open`               |
| `gitvibe config`        | -     | Manage configurations       | `gitvibe config list`             |
| `gitvibe create-config` | -     | Create config interactively | `gitvibe create-config my-config` |

---

## Commands Overview

### Basic Workflow

```bash
# 1. Stage your changes
git add .

# 2. Generate and commit (shorthand)
gitvibe c --apply

# 3. Push changes
git push

# 4. Create PR with description
gitvibe pr --open
```

---

## Command Reference

### gitvibe init

**Purpose:** Initialize GitVibe with AI provider setup

**Usage:**

```bash
gitvibe init
```

**What it does:**

-   🤖 Guides you through provider selection (Groq, OpenAI, Google, Anthropic)
-   🎨 Lets you choose from available models
-   🔐 Securely stores your API key in system keychain
-   ✅ Tests connection to verify everything works
-   📝 Creates a default configuration file

**Interactive Prompts:**

1. **Select AI provider** - Choose your preferred AI service
2. **API key handling** - Use existing key or enter a new one
3. **Select model** - Pick from available models or enter custom
4. **API key input** - Securely enter your API key
5. **Configuration test** - Verifies your setup

**Example Session:**

```
Welcome to gitvibe! Let's set up your AI configuration.

? Select AI provider: Groq (default)
? Select model: llama3-8b-8192
? Enter API key: ************************************

Testing configuration...
✅ Setup complete! Configuration saved as "default".
```

**When to use:**

-   First time using GitVibe
-   Switching to a different AI provider
-   Updating your API key

---

### gitvibe commit (c)

**Purpose:** Generate AI-powered commit messages from your staged changes

**Usage:**

```bash
gitvibe commit [options]
gitvibe c [options]      # Short alias
```

**Options:**

| Option            | Description                           | Example                   |
| ----------------- | ------------------------------------- | ------------------------- |
| `--copy`          | Copy selected message to clipboard    | `gitvibe c --copy`        |
| `--apply`         | Commit directly with selected message | `gitvibe c --apply`       |
| `--config <name>` | Use specific configuration profile    | `gitvibe c --config work` |

**How it works:**

1. 📊 Analyzes your staged git changes (diff)
2. 🤖 Generates multiple commit message variations using AI
3. 📋 Presents options following conventional commit format
4. ✨ You select the best message
5. 🚀 Commits or copies based on your choice

**Commit Message Format:**
GitVibe generates messages following [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

Examples:
feat: add user authentication with OAuth2
fix: resolve memory leak in image processing
docs: update API documentation
refactor: simplify error handling logic
test: add unit tests for payment service
```

**Examples:**

```bash
# Interactive mode - choose what to do after selection
gitvibe commit

# Copy to clipboard automatically
gitvibe commit --copy
gitvibe c --copy

# Commit directly without prompts
gitvibe commit --apply
gitvibe c --apply

# Use specific configuration
gitvibe commit --config my-custom-config

# Combine options
gitvibe c --apply --config work
```

**Interactive Flow:**

```
# After staging changes
$ git add src/auth.ts
$ gitvibe c

✨🎉 Generated 2 commit message variations:
? Select a commit message:
❯ feat: add JWT token authentication
  feat: implement user authentication system

? What would you like to do?
❯ Commit with this message
  Copy to clipboard

✅ Committed successfully.
```

**Requirements:**

-   ✅ Must be in a git repository
-   ✅ Must have staged changes (`git add` files first)
-   ✅ Configuration must be initialized

---

### gitvibe pr

**Purpose:** Generate PR titles and descriptions from recent commits

**Usage:**

```bash
gitvibe pr [options]
```

**Options:**

| Option            | Description                         | Default | Example             |
| ----------------- | ----------------------------------- | ------- | ------------------- |
| `--commits <n>`   | Number of recent commits to include | 1       | `--commits 5`       |
| `--copy`          | Copy PR content to clipboard        | -       | `gitvibe pr --copy` |
| `--open`          | Create PR using GitHub CLI          | -       | `gitvibe pr --open` |
| `--config <name>` | Use specific configuration          | default | `--config work`     |

**How it works:**

1. 📜 Retrieves last N commits with their diffs
2. 🤖 Analyzes changes using AI
3. ✍️ Generates professional PR title and description
4. 📋 Shows you the result
5. 🚀 Opens PR or copies to clipboard

**Generated Content Includes:**

-   🎯 Clear, concise PR title
-   📝 Detailed description of changes
-   🔍 Summary of what was modified
-   ⚠️ Breaking changes (if any)
-   📊 Impact assessment

**Examples:**

```bash
# Generate PR from last commit
gitvibe pr

# Include last 3 commits
gitvibe pr --commits 3

# Copy to clipboard
gitvibe pr --copy

# Create PR directly with GitHub CLI
gitvibe pr --open

# Include 5 commits and open PR
gitvibe pr --commits 5 --open

# Use custom config
gitvibe pr --config work --commits 2
```

**Interactive Flow:**

```
$ gitvibe pr --commits 2

⏳︎ Generating PR description from last 2 commits...

Generated PR:
Title: feat: Add user authentication and profile management

Description:
This PR introduces user authentication using JWT tokens and implements
a complete profile management system.

Changes:
- Add JWT-based authentication
- Implement login/logout endpoints
- Create user profile CRUD operations
- Add input validation and error handling

? What would you like to do?
❯ Copy to clipboard
  Open PR with GitHub CLI

✅ Copied to clipboard.
```

**Requirements:**

-   ✅ Must be in a git repository
-   ✅ Must have at least one commit
-   ✅ For `--open`: GitHub CLI must be installed and authenticated

**GitHub CLI Setup (for --open):**

```bash
# Install GitHub CLI
brew install gh  # macOS
# or download from https://cli.github.com/

# Authenticate
gh auth login
```

---

### gitvibe config

**Purpose:** Manage configuration profiles for different projects or preferences

**Usage:**

```bash
gitvibe config <subcommand> [arguments]
```

#### Subcommands

##### `config new <name>`

Create a new configuration profile

**Usage:**

```bash
gitvibe config new <name>
```

**What it does:**

-   📝 Creates a new YAML config file
-   🎨 Opens it in your default editor
-   ⚙️ Pre-fills with sensible defaults
-   ✅ Validates the configuration

**Example:**

```bash
gitvibe config new work-config
gitvibe config new personal
gitvibe config new experimental
```

**Configuration Options:**

```yaml
ai_provider: groq # openai, google, anthropic, groq
model: llama3-8b-8192 # Model name
commit_prompt: "..." # Custom prompt for commits
pr_prompt: "..." # Custom prompt for PRs
merge_commit_prompt: "..." # Custom prompt for merge commits
temperature: 0.7 # AI creativity (0.0-2.0)
max_commit_tokens: 1024 # Max tokens for commit messages
max_pr_tokens: 65536 # Max tokens for PR descriptions
stream_output: true # Stream AI responses
commit_variations: 1 # Number of variations to generate
```

---

##### `config list`

List all available configurations

**Usage:**

```bash
gitvibe config list
```

**Output:**

```
Configurations:
  default (default)
  work-config
  personal
  experimental (invalid)
```

**Legend:**

-   `(default)` - Currently active default configuration
-   `(invalid)` - Configuration has validation errors

---

##### `config show [name]`

Display configuration details

**Usage:**

```bash
gitvibe config show           # Shows default config
gitvibe config show work      # Shows specific config
```

**Output:**

```
Configuration: default
Save path: ~/.gitvibe/configs/default.yaml

Details:
  AI Provider: groq
  Model: llama3-8b-8192
  Temperature: 0.7
  Max Commit Tokens: 1024
  Max PR Tokens: 65536
  Stream Output: true
  Commit Variations: 1

Commit Prompt:
  Generate a concise commit message...

PR Prompt:
  Generate a PR title and description...
```

---

##### `config set-default <name>`

Set which configuration to use by default

**Usage:**

```bash
gitvibe config set-default work
```

**What it does:**

-   🎯 Makes the specified config the default
-   📝 All commands will use this config unless overridden with `--config`

**Example:**

```bash
# Set work config as default
gitvibe config set-default work

# Now all commands use it
gitvibe c --apply

# Override for one command
gitvibe c --apply --config personal
```

---

### gitvibe create-config

**Purpose:** Create a new configuration interactively with guided prompts

**Usage:**

```bash
gitvibe create-config <name>
```

**What it does:**

-   🤖 Guides you through selecting an AI provider (Groq, OpenAI, Google, Anthropic, Zai)
-   🎨 Lets you choose from available models or enter a custom one
-   🌡️ Prompts for temperature setting (0.0-1.0)
-   🔑 Handles API key input or reuse of existing keys
-   ✅ Tests the configuration with a connection check
-   📝 Saves the config and opens it in your default editor for final adjustments
-   🧪 Validates the final configuration

**Interactive Prompts:**

1. **Select AI provider** - Choose from available providers
2. **API key handling** - Use existing key or enter new one
3. **Select model** - Pick from provider models or custom
4. **Custom model** - If chosen, enter model name
5. **Temperature** - Set creativity level
6. **API key input** - Enter key if needed

**Example Session:**

```
$ gitvibe create-config work-config

Let's set up your AI configuration.

? Select AI provider: Groq (default)
? API key found for groq. What would you like to do? Use existing key
? Select model: llama3-8b-8192
? Enter temperature (0.0 to 1.0): 0.5

Testing configuration...
✅ Configuration tested successfully.

Opening nano to edit configuration...
Configuration "work-config" saved.
```

**When to use:**

-   Creating a new config with interactive guidance
-   When you prefer prompts over direct editor editing
-   Setting up configs for different projects or preferences

---

## Command Options

### Global Options

These work with any command:

| Option      | Description           | Example             |
| ----------- | --------------------- | ------------------- |
| `--version` | Show version number   | `gitvibe --version` |
| `--help`    | Show help information | `gitvibe --help`    |
| `-h`        | Short help flag       | `gitvibe c -h`      |

### Command-Specific Options

#### commit / c

| Option            | Short | Type  | Description               |
| ----------------- | ----- | ----- | ------------------------- |
| `--copy`          | -     | flag  | Copy message to clipboard |
| `--apply`         | -     | flag  | Commit automatically      |
| `--config <name>` | -     | value | Use specific config       |

#### pr

| Option            | Short | Type   | Description                    |
| ----------------- | ----- | ------ | ------------------------------ |
| `--commits <n>`   | -     | number | Number of commits (default: 1) |
| `--copy`          | -     | flag   | Copy to clipboard              |
| `--open`          | -     | flag   | Open PR with gh CLI            |
| `--config <name>` | -     | value  | Use specific config            |

---

## Workflow Examples

### Example 1: Quick Commit

```bash
# Stage changes
git add .

# Generate and commit in one command
gitvibe c --apply
```

### Example 2: Review Before Committing

```bash
# Stage changes
git add src/

# Generate message, review, then decide
gitvibe commit
# → Select message
# → Choose "Commit with this message"
```

### Example 3: Custom Message Workflow

```bash
# Generate and copy
gitvibe c --copy

# Edit in your editor, then commit manually
git commit -m "feat: your edited message here"
```

### Example 4: Feature Branch to PR

```bash
# Create feature branch
git checkout -b feature/user-auth

# Make changes and commit
git add .
gitvibe c --apply

# Make more changes
git add .
gitvibe c --apply

# Push and create PR
git push origin feature/user-auth
gitvibe pr --commits 2 --open
```

### Example 5: Multi-Project Setup

```bash
# Setup for work project
cd ~/work/project
gitvibe init  # Configure with work settings
gitvibe config new work-strict
gitvibe config set-default work-strict

# Setup for personal project
cd ~/personal/project
gitvibe init  # Configure with personal settings
gitvibe config new personal-casual
gitvibe config set-default personal-casual

# Use specific config
gitvibe c --apply --config work-strict
```

### Example 6: Experimental AI Models

```bash
# Create experimental config
gitvibe config new gpt4-experiment

# Edit to use GPT-4
# Change: model: gpt-4o

# Test it out
gitvibe c --config gpt4-experiment --copy

# Compare with default
gitvibe c --copy
```

---

## Tips & Best Practices

### 🎯 Commit Message Tips

1. **Stage related changes together**

    ```bash
    # Good: Stage related files
    git add src/auth.ts src/auth.test.ts
    gitvibe c --apply

    # Avoid: Mixing unrelated changes
    git add src/auth.ts src/ui.css src/database.ts
    ```

2. **Use commit variations**

    ```bash
    # Get more options to choose from
    gitvibe config show
    # Edit commit_variations: 3
    gitvibe c
    ```

3. **Review staged changes**
    ```bash
    git status
    git diff --cached
    gitvibe c
    ```

### 🚀 PR Description Tips

1. **Include all relevant commits**

    ```bash
    # Check commit history
    git log --oneline -5

    # Include appropriate number
    gitvibe pr --commits 5
    ```

2. **Review before opening**

    ```bash
    # Copy and review first
    gitvibe pr --commits 3 --copy

    # Then open manually if needed
    gh pr create --title "..." --body "..."
    ```

3. **Use for merge commits**
    ```bash
    # After merging feature branches
    gitvibe pr --commits 10 --copy
    ```

### ⚙️ Configuration Tips

1. **Create project-specific configs**

    ```bash
    # Different conventions per project
    gitvibe config new client-project
    gitvibe config new internal-tool
    ```

2. **Adjust temperature for creativity**

    ```yaml
    temperature: 0.3  # More focused, consistent
    temperature: 1.0  # More creative, varied
    ```

3. **Customize prompts**

    ```yaml
    commit_prompt: |
        Generate a commit message following our team conventions:
        - Start with ticket number [PROJ-123]
        - Use imperative mood
        - Max 72 characters

        {diff}
    ```

### 🔒 Security Tips

1. **API keys are stored securely**

    - macOS: Keychain
    - Linux: Secret Service
    - Windows: Credential Manager

2. **Never commit config files with keys**

    ```bash
    # Configs in ~/.gitvibe/ (outside your repo)
    # Safe to use without exposing keys
    ```

3. **Use different keys per environment**

    ```bash
    # Work key for work projects
    gitvibe init  # Enter work API key

    # Personal key for personal projects
    gitvibe config new personal
    # Use different API key
    ```

---

## Troubleshooting

### Common Issues

#### ❌ "Not a git repository"

**Problem:** GitVibe requires a git repository

**Solution:**

```bash
# Check if you're in a repo
git status

# Initialize if needed
git init
```

---

#### ❌ "No staged changes found"

**Problem:** No files staged for commit

**Solution:**

```bash
# Check status
git status

# Stage files
git add <files>
# or
git add .

# Then try again
gitvibe c
```

---

#### ❌ "No default configuration found"

**Problem:** GitVibe not initialized

**Solution:**

```bash
# Run initialization
gitvibe init

# Or specify a config
gitvibe c --config <name>
```

---

#### ❌ "Configuration not found"

**Problem:** Specified config doesn't exist

**Solution:**

```bash
# List available configs
gitvibe config list

# Create new config
gitvibe config new <name>

# Or use default
gitvibe c
```

---

#### ❌ "Failed to create PR"

**Problem:** GitHub CLI not installed or not authenticated

**Solution:**

```bash
# Install GitHub CLI
brew install gh  # macOS
# or visit https://cli.github.com/

# Authenticate
gh auth login

# Try again
gitvibe pr --open
```

---

#### ❌ "API key not found"

**Problem:** API key missing or expired

**Solution:**

```bash
# Re-run init to update key
gitvibe init

# Verify configuration
gitvibe config show
```

---

#### ❌ "Invalid configuration"

**Problem:** Config file has syntax errors

**Solution:**

```bash
# Check which config is invalid
gitvibe config list

# Edit and fix
gitvibe config new <name>

# Or validate manually
cat ~/.gitvibe/configs/<name>.yaml
```

---

### Getting Help

#### Command Help

```bash
# General help
gitvibe --help

# Command-specific help
gitvibe commit --help
gitvibe pr --help
gitvibe config --help
```

#### Version Information

```bash
gitvibe --version
```

#### Debug Mode

```bash
# Check configuration
gitvibe config show

# List all configs
gitvibe config list

# Verify git status
git status
git diff --cached
```

---

## Advanced Usage

### Chaining Commands

```bash
# Quick workflow
git add . && gitvibe c --apply && git push

# Commit and PR in one go
git add . && gitvibe c --apply && gitvibe pr --open
```

### Shell Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Quick commit
alias gvc='git add . && gitvibe c --apply'

# Quick PR
alias gvpr='gitvibe pr --open'

# Commit with specific config
alias gvw='gitvibe c --apply --config work'
```

### Git Hooks Integration

Create `.git/hooks/prepare-commit-msg`:

```bash
#!/bin/bash
# Auto-generate commit message as suggestion
if [ -z "$2" ]; then
    gitvibe c --copy
    echo "# GitVibe suggestion copied to clipboard"
fi
```

---

## Configuration File Reference

Location: `~/.gitvibe/configs/<name>.yaml`

### Complete Example

```yaml
# AI Provider Configuration
ai_provider: groq # Options: openai, google, anthropic, groq
model: llama3-8b-8192 # Provider-specific model name

# Prompts (supports {diff}, {commits} placeholders)
commit_prompt: |
    Generate a concise commit message following conventional commits format.
    Analyze the following git diff and create a clear, descriptive message.

    {diff}

    Requirements:
    - Use conventional commit format: type: description
    - Types: feat, fix, docs, style, refactor, test, chore
    - Keep under 72 characters
    - Be specific and descriptive

pr_prompt: |
    Generate a professional PR title and description.
    Analyze these commits:

    {commits}

    Format:
    # Title (clear, concise)

    ## Description
    Explain what changed and why

    ## Changes
    - List key changes

    ## Breaking Changes
    Note any breaking changes

merge_commit_prompt: |
    Generate a merge commit message for these changes:
    {diff}

# AI Parameters
temperature: 0.7 # 0.0 = focused, 2.0 = creative
max_commit_tokens: 1024 # Token limit for commits
max_pr_tokens: 65536 # Token limit for PRs

# Output Options
stream_output: true # Stream AI responses
commit_variations: 1 # Number of commit message options
```

---

## Quick Reference Card

### Essential Commands

| Task             | Command                  | Shortcut            |
| ---------------- | ------------------------ | ------------------- |
| **Setup**        | `gitvibe init`           | -                   |
| **Quick commit** | `gitvibe commit --apply` | `gitvibe c --apply` |
| **Copy message** | `gitvibe commit --copy`  | `gitvibe c --copy`  |
| **Create PR**    | `gitvibe pr --open`      | -                   |
| **List configs** | `gitvibe config list`    | -                   |

### Common Workflows

```bash
# Daily workflow
git add . && gitvibe c --apply

# Feature branch
gitvibe c --apply && git push && gitvibe pr --open

# Review first
gitvibe c --copy && git commit  # paste and edit
```

---

## Support & Resources

-   📚 **Full Documentation**: [README.md](README.md)
-   🐛 **Report Issues**: [GitHub Issues](https://github.com/fazlulShanto/gitvibe/issues)
-   💡 **Feature Requests**: [GitHub Discussions](https://github.com/fazlulShanto/gitvibe/discussions)
-   📖 **Conventional Commits**: https://www.conventionalcommits.org/

---

_Last updated: 2025-10-02_
