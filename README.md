# PR Description CLI

🤖 **AI-powered CLI tool for generating commit messages and PR descriptions**

Generate meaningful commit messages and comprehensive pull request descriptions using multiple AI providers (OpenAI, Anthropic, Google, Groq) with support for custom templates, Git hooks, and streaming responses.

## ✨ Features

-   🤖 **Multiple AI Providers**: OpenAI, Anthropic, Google, and Groq support
-   📝 **Smart Git Analysis**: Analyzes diffs, staged changes, and branch comparisons
-   🎯 **Custom Templates**: Built-in conventional commits + custom prompt templates
-   🪝 **Git Hooks Integration**: Automatic commit message generation via Git hooks
-   🌊 **Streaming Responses**: Real-time AI generation with progress feedback
-   ⚙️ **Flexible Configuration**: Interactive setup and comprehensive config management
-   🔒 **Secure API Keys**: Encrypted storage using system keychain
-   📊 **Usage Analytics**: Optional anonymous usage tracking

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g gitvibe

# Or with other package managers
pnpm add -g gitvibe
yarn global add gitvibe
bun install -g gitvibe
```

### Initial Setup

```bash
# Interactive setup wizard
gitvibe init

# Quick setup with specific provider
gitvibe init --provider openai
```

The setup wizard will guide you through:

-   API key configuration for your chosen providers
-   Model selection and defaults
-   Template customization
-   Git hooks installation (optional)

### Basic Usage

```bash
# Generate commit message from staged changes
gitvibe commit

# Generate PR description
gitvibe pr

# Show help
gitvibe --help
```

## 📖 Commands

### Core Commands

#### `gitvibe init`

Interactive setup wizard to configure API keys, providers, and preferences.

```bash
gitvibe init [options]

Options:
  --force                 Overwrite existing configuration
  --provider <provider>   Skip provider selection
```

#### `gitvibe commit`

Generate AI-powered commit messages from staged Git changes.

```bash
gitvibe commit [options]

Options:
  -p, --provider <provider>    AI provider (openai, anthropic, google)
  -m, --model <model>          Specific model to use
  -t, --template <template>    Template (default, conventional, custom)
  --no-stream                  Disable streaming output
  --stage-all                  Stage all changes first
  --commit                     Auto-commit with generated message
  --edit                       Edit message before committing

Examples:
  gitvibe commit                           # Basic usage
  gitvibe commit --model gpt-4            # Use specific model
  gitvibe commit --template conventional  # Conventional commits format
  gitvibe commit --stage-all --commit     # Stage all and auto-commit
```

#### `gitvibe pr`

Generate comprehensive PR descriptions from branch changes.

```bash
gitvibe pr [options]

Options:
  -p, --provider <provider>    AI provider to use
  -m, --model <model>          Specific model to use
  -t, --template <template>    Template (default, detailed, custom)
  -b, --branch <branch>        Compare against specific branch
  --no-stream                  Disable streaming output
  -o, --output <file>          Save to file
  --format <format>            Output format (markdown, text)

Examples:
  gitvibe pr                           # Compare current branch with main
  gitvibe pr --branch develop         # Compare with develop branch
  gitvibe pr --template detailed      # Use detailed template
  gitvibe pr --output pr-desc.md      # Save to file
```

### Configuration Commands

#### `gitvibe config`

Manage CLI configuration with various subcommands.

```bash
# Show current configuration
gitvibe config show [--json]

# Set configuration values
gitvibe config set <key> <value>
gitvibe config set defaultProvider openai
gitvibe config set options.temperature 0.8

# Get configuration values
gitvibe config get <key>

# Interactive configuration editor
gitvibe config edit

# Reset to defaults
gitvibe config reset [--confirm]

# Validate configuration
gitvibe config validate

# Show config file path
gitvibe config path
```

#### `gitvibe hooks`

Manage Git hooks integration.

```bash
# Install Git hooks
gitvibe hooks install [--force] [--commit-msg] [--pre-commit]

# Remove Git hooks
gitvibe hooks uninstall [--all]

# Show hooks status
gitvibe hooks status

# Test hooks functionality
gitvibe hooks test
```

## ⚙️ Configuration

The CLI stores configuration in `~/.gitvibe/config.yaml`. The configuration includes:

### Providers Configuration

```yaml
providers:
    openai:
        apiKey: "your-api-key" # Stored securely in system keychain
        defaultModel: "gpt-3.5-turbo"
        enabled: true
        customModels: ["gpt-4o", "gpt-4o-mini"] # Add new models not in the built-in list
    anthropic:
        apiKey: "your-api-key"
        defaultModel: "claude-3-haiku-20240307"
        enabled: true
        customModels: []
    google:
        apiKey: "your-api-key"
        defaultModel: "gemini-pro"
        enabled: true
        customModels: []
```

#### Dynamic Model Support

The CLI supports using new AI models as soon as they're released by providers, without requiring CLI updates:

-   **Automatic Support**: Any model string is accepted - the AI SDK handles validation
-   **Custom Models**: Add new models to your config using `customModels` array
-   **Smart Warnings**: Unknown models trigger warnings with suggestions for similar known models

```bash
# Add a new model to your config
gitvibe config set providers.openai.customModels "gpt-4o,gpt-4o-mini,gpt-4-turbo"

# Use the new model immediately
gitvibe commit --model gpt-4o
```

### Templates

#### Built-in Templates

**Default Commit Template:**

```
Analyze the following git diff and generate a concise, descriptive commit message:

{diff}

Requirements:
- Use imperative mood (e.g., "Add", "Fix", "Update")
- Keep it under 50 characters for the summary
- Be specific about what changed
- Don't include file names unless necessary
```

**Conventional Commits Template:**

```
Use the conventional commits format: <type>(<scope>): <description>
Types: feat, fix, docs, style, refactor, perf, test, chore
```

#### Custom Templates

Add custom templates in the configuration:

```yaml
templates:
    commit:
        custom:
            jira: "Generate commit with JIRA ticket format: {diff}"
            emoji: "Generate commit with emoji prefixes: {diff}"
    pr:
        custom:
            detailed: "Generate detailed PR with testing section: {diff}"
```

### Options

```yaml
options:
    streaming: true # Enable streaming responses
    maxOutputTokens: 500 # Maximum tokens per response
    temperature: 0.7 # AI creativity (0.0-2.0)
```

### Git Hooks

```yaml
gitHooks:
    enabled: true
    commitMsg: true # prepare-commit-msg hook
    preCommit: false # pre-commit validation hook
```

## 🪝 Git Hooks

The CLI can install Git hooks for automatic commit message generation:

### prepare-commit-msg Hook

-   Automatically generates commit messages when you run `git commit` without `-m`
-   Only activates when no commit message is provided
-   Respects your existing workflow

### pre-commit Hook

-   Validates configuration before commits
-   Ensures API keys are properly configured
-   Can be bypassed with `git commit --no-verify`

### Installation

```bash
# Install both hooks
gitvibe hooks install

# Install specific hooks
gitvibe hooks install --commit-msg
gitvibe hooks install --pre-commit

# Check installation status
gitvibe hooks status
```

## 🎯 Templates

### Using Templates

```bash
# Use built-in templates
gitvibe commit --template conventional
gitvibe pr --template detailed

# Use custom templates
gitvibe commit --template jira
gitvibe pr --template detailed
```

### Template Variables

Templates support variable substitution:

-   `{diff}` - Git diff content
-   `{files}` - List of modified files
-   `{branch}` - Current branch name

### Creating Custom Templates

Add custom templates via configuration:

```bash
gitvibe config edit
# Select "Custom Templates" and add your templates
```

## 🔒 Security

-   **API Keys**: Stored securely using the system keychain (macOS Keychain, Windows Credential Store, Linux Secret Service)
-   **Configuration**: Plain text configuration with sensitive data referenced securely
-   **Analytics**: Optional and anonymous usage tracking

## 📊 Supported Models

### OpenAI

-   `gpt-4` - Most capable, higher cost
-   `gpt-4-turbo` - Faster GPT-4 variant
-   `gpt-3.5-turbo` - Fast and cost-effective (recommended)

### Anthropic

-   `claude-3-opus-20240229` - Most capable
-   `claude-3-sonnet-20240229` - Balanced performance
-   `claude-3-haiku-20240307` - Fastest (recommended)

### Google

-   `gemini-pro` - Latest Gemini model
-   `gemini-1.5-pro-latest` - Extended context
-   `gemini-1.5-flash-latest` - Fastest variant

## 🛠️ Development

### Project Structure

```
pr-description-cli/
├── src/
│   ├── cli/                    # CLI interface and commands
│   │   ├── commands/           # Individual command implementations
│   │   └── parser.ts           # Command parser setup
│   ├── core/                   # Core functionality
│   │   ├── ai/                 # AI provider integrations
│   │   ├── config/             # Configuration management
│   │   └── git/                # Git integration utilities
│   └── utils/                  # Utility functions
├── bin/                        # Executable entry point
└── dist/                       # Built output
```

### Building from Source

```bash
# Clone repository
git clone <repository-url>
cd pr-description-cli

# Install dependencies
pnpm install

# Build
pnpm run build

# Test locally
node dist/index.js --help

# Link globally for testing
npm link
```

### Scripts

```bash
pnpm dev     # Development mode with watch
pnpm build   # Production build
pnpm start   # Run built version
```

## 🐛 Troubleshooting

### Common Issues

**"Not in a Git repository" error:**

-   Ensure you're running the command inside a Git repository
-   Check that `.git` directory exists

**"No staged changes found" error:**

-   Stage your changes first: `git add .`
-   Or use `--stage-all` flag: `gitvibe commit --stage-all`

**API connection failures:**

-   Verify API keys are correct: `gitvibe config validate`
-   Check internet connection
-   Ensure API key has proper permissions

**Git hooks not working:**

-   Verify hooks are installed: `gitvibe hooks status`
-   Check hook permissions: hooks should be executable
-   Test manually: `gitvibe hooks test`

### Debug Mode

```bash
# Enable verbose logging
gitvibe --verbose <command>

# Check configuration
gitvibe config show
gitvibe config validate
```

## 📝 Examples

### Basic Workflow

```bash
# 1. Setup (one-time)
gitvibe init

# 2. Make changes to your code
echo "console.log('Hello World');" > hello.js

# 3. Generate commit message
gitvibe commit --stage-all

# 4. Create PR description
gitvibe pr --output pr-description.md
```

### Advanced Usage

```bash
# Use specific model for better quality
gitvibe commit --provider openai --model gpt-4

# Generate conventional commit
gitvibe commit --template conventional

# Create detailed PR description
gitvibe pr --template detailed --branch develop

# Auto-commit without interaction
gitvibe commit --stage-all --commit --no-stream
```

### Git Hooks Workflow

```bash
# Install hooks once
gitvibe hooks install

# Now commits are auto-generated
git add .
git commit  # Message generated automatically

# Or provide your own message
git commit -m "Your custom message"
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details.

## 🙏 Acknowledgments

-   Built with [Vercel AI SDK](https://sdk.vercel.ai/) for unified AI provider support
-   Uses [Commander.js](https://github.com/tj/commander.js/) for CLI interface
-   Powered by [simple-git](https://github.com/steveukx/git-js) for Git integration
-   UI enhanced with [Inquirer.js](https://github.com/SBoudrias/Inquirer.js/) and [Chalk](https://github.com/chalk/chalk)

---

**Happy coding with AI-powered commit messages and PR descriptions! 🚀**
