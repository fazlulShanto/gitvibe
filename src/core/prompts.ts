export const DEFAULT_COMMIT_PROMPT = `Analyze the following git changes and generate a single, complete conventional commit message.

CHANGES SUMMARY:
\${compactSummary}

\${snippets ? \`\nCODE CONTEXT:\n\${snippets}\n\` : ''}

TASK: Write ONE conventional commit message that accurately describes what was changed.

REQUIREMENTS:
- Format: type: subject (NO scope, just type and subject)
- Be specific and descriptive
- Use imperative mood, present tense
- Include the main component/area affected
- Complete the message - never truncate mid-sentence

COMMIT TYPE GUIDELINES:
- feat: NEW user-facing features only
- refactor: code improvements, restructuring, internal changes
- fix: bug fixes that resolve issues
- docs: documentation changes only
- chore: config updates, maintenance, dependencies

EXAMPLES (correct format - NO scope, just type and subject):
- feat: add user login with OAuth integration
- fix: resolve memory leak in image processing service
- refactor: improve message generation with better prompts
- refactor: increase default max-length from 50 to 100
- docs: update installation and configuration guide
- test: add unit tests for JWT token validation
- chore: update axios to v1.6.0 for security patches

WRONG FORMAT (do not use):
- feat(auth): add user login
- refactor(commit): improve prompts

Return only the commit message line, no explanations.`;

export const DEFAULT_PR_PROMPT = `Analyze the following commits and generate a comprehensive PR title and description.

COMMITS:
{commits}

TASK: Create a PR title and description that summarizes the changes.

REQUIREMENTS:
- Title: Concise, descriptive, follows conventional format (type: description)
- Description: Detailed explanation of changes, impact, and any breaking changes
- Format as:
# Title

Description

Include:
- What was changed
- Why it was changed
- How it affects users/developers
- Any breaking changes or migration notes

PR TITLE GUIDELINES:
- feat: New features
- fix: Bug fixes
- refactor: Code restructuring
- docs: Documentation
- chore: Maintenance

Return only the formatted PR content, no additional explanations.`;

export const DEFAULT_MERGE_COMMIT_PROMPT = `You have been given multiple commit messages generated from different chunks of a large git diff. Your task is to merge them into a single, cohesive conventional commit message.

COMMIT MESSAGES FROM CHUNKS:
{messages}

TASK: Create ONE conventional commit message that encompasses all the changes described in these messages.

REQUIREMENTS:
- Format: type: subject (NO scope, just type and subject)
- Be comprehensive but concise
- Use imperative mood, present tense
- Include the main components/areas affected
- Complete the message - never truncate mid-sentence

COMMIT TYPE GUIDELINES:
- feat: NEW user-facing features only
- refactor: code improvements, restructuring, internal changes
- fix: bug fixes that resolve issues
- docs: documentation changes only
- chore: config updates, maintenance, dependencies

EXAMPLES:
- feat: add user authentication and profile management system
- refactor: improve code structure with modular components and better error handling
- fix: resolve multiple bugs in data processing and validation

Return only the commit message line, no explanations.`;
