export const DEFAULT_COMMIT_PROMPT = `Analyze the following git changes and generate {n_commit} complete conventional commit message.
GIT DIFF:
{diff}

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
`;

export const DEFAULT_PR_PROMPT = `I am about to open a github PR, please Analyze the following git diff and generate a comprehensive PR title and description.

COMMIT DIFFS:
{commits}


REQUIREMENTS:
- Title: Concise, descriptive, follows conventional format
- Description: Detailed explanation of changes, impact, and any breaking changes
- Format as:
# Title

Description

Include:
- What was changed
- Why it was changed
- User stories (if applicable)
- important details
- Impact on existing functionality
`;

export const DEFAULT_MERGE_COMMIT_PROMPT = `You have been given multiple commit messages generated from different chunks of a large git diff.
Your task is to merge them into precious, cohesive conventional commit message.
you have to ensure that the final commit message accurately reflects all the changes described in the individual messages.

create {n_commit} commit variations of the merged commit message.

INPUT (COMMIT MESSAGES FROM CHUNKS):
{messages}

TASK: Create {n_commit} variations of conventional commit message/s that encompasses all the changes described in these indivudual commit Chunks.

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
`;

export const DEFAULT_MERGE_PR_PROMPT = `You have been given multiple PR descriptions generated from different chunks of commits.
Your task is to merge them into a single, cohesive PR title and description that encompasses all the changes described in the individual PR descriptions.

INPUT (PR DESCRIPTIONS FROM CHUNKS):
{pr_descriptions}

TASK: Create a single PR title and description that combines all the changes from these chunked PR descriptions.

REQUIREMENTS:
- Title: Concise, descriptive, follows conventional format
- Description: Detailed explanation of all changes, impact, and any breaking changes
- Format as:
# Title

Description

Include:
- What was changed (combine from all chunks)
- Why it was changed
- User stories (if applicable)
- Important details
- Impact on existing functionality

Ensure the final PR description is comprehensive but not redundant.
`;
