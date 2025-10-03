import simpleGit, { SimpleGit } from "simple-git";
import { GitDiff } from "../types";
import { GitAnalyzer } from "./analyzer";

export class GitService {
    private git: SimpleGit;
    private analyzer = new GitAnalyzer();

    // Lock files to exclude from diffs sent to AI
    private static readonly LOCK_FILE_PATTERNS = [
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "bun.lockb",
        "requirements.txt.lock",
        "poetry.lock",
        "Pipfile.lock",
        "uv.lock",
        "Gemfile.lock",
        "composer.lock",
        "Cargo.lock",
        "go.sum",
        "Podfile.lock",
        "pubspec.lock",
        "packages.lock.json",
    ];

    constructor() {
        this.git = simpleGit();
    }

    private shouldExcludeFile(filename: string): boolean {
        return GitService.LOCK_FILE_PATTERNS.some(
            (pattern) =>
                filename.endsWith(pattern) || filename.includes(`/${pattern}`)
        );
    }

    private filterDiff(diff: string): string {
        // Split diff into file chunks
        const diffParts = diff.split(/^diff --git /m);

        // Filter out lock files
        const filteredParts = diffParts.filter((part) => {
            if (!part.trim()) return true; // Keep empty parts

            // Extract filename from diff header
            const match = part.match(/^a\/(.+?) b\//);
            if (!match) return true;

            const filename = match[1];
            return !this.shouldExcludeFile(filename);
        });

        // Rejoin the diff
        return filteredParts
            .map((part, idx) => (idx === 0 ? part : `diff --git ${part}`))
            .join("");
    }

    async getStagedDiff(): Promise<string> {
        const gitAnalyzerDiff = await this.analyzer.getStagedChanges();
        const formattedDiff = this.analyzer.formatDiffForAI(gitAnalyzerDiff);
        return formattedDiff;
    }

    async getLastNCommits(n: number): Promise<string[]> {
        const log = await this.git.log({ n });
        return log.all.map((commit) => commit.message);
    }

    async getLastNCommitDiffs(n: number) {
        try {
            // Get the last N commits' hashes
            const log = await this.git.log({ n });
            const commits = log.all;

            const diffs = [];

            for (const commit of commits) {
                // Get the diff for this commit
                const diff = await this.git.show([commit.hash]);
                // Filter out lock files from diff
                const filteredDiff = this.filterDiff(diff);
                diffs.push(filteredDiff);
            }

            return diffs;
        } catch (err) {
            console.error("Error fetching commit diffs:", err);
        }
    }

    async getDiffSummary(diff: string): Promise<GitDiff> {
        const lines = diff.split("\n");
        const files: GitDiff["files"] = [];
        let currentFile: any = null;

        for (const line of lines) {
            if (line.startsWith("diff --git")) {
                if (currentFile) {
                    files.push(currentFile);
                }
                const match = line.match(/diff --git a\/(.+) b\/(.+)/);
                if (match) {
                    currentFile = {
                        filename: match[1],
                        status: "modified",
                        additions: 0,
                        deletions: 0,
                        content: "",
                    };
                }
            } else if (line.startsWith("new file mode")) {
                if (currentFile) currentFile.status = "added";
            } else if (line.startsWith("deleted file mode")) {
                if (currentFile) currentFile.status = "deleted";
            } else if (line.startsWith("@@")) {
                // hunk header
            } else if (line.startsWith("+") && !line.startsWith("+++")) {
                if (currentFile) currentFile.additions++;
                if (currentFile) currentFile.content += line + "\n";
            } else if (line.startsWith("-") && !line.startsWith("---")) {
                if (currentFile) currentFile.deletions++;
                if (currentFile) currentFile.content += line + "\n";
            }
        }

        if (currentFile) {
            files.push(currentFile);
        }

        return { files };
    }

    async chunkDiff(
        diff: string,
        maxChunkSize: number = 4000
    ): Promise<string[]> {
        const summary = await this.getDiffSummary(diff);
        const chunks: string[] = [];
        let currentChunk = "";

        for (const file of summary.files) {
            const fileContent = `File: ${file.filename}\nStatus: ${file.status}\n${file.content}`;

            if (currentChunk.length + fileContent.length > maxChunkSize) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = "";
                }
                if (fileContent.length > maxChunkSize) {
                    // Split large files
                    const lines = fileContent.split("\n");
                    let tempChunk = "";
                    for (const line of lines) {
                        if (tempChunk.length + line.length > maxChunkSize) {
                            chunks.push(tempChunk.trim());
                            tempChunk = line + "\n";
                        } else {
                            tempChunk += line + "\n";
                        }
                    }
                    if (tempChunk) chunks.push(tempChunk.trim());
                } else {
                    currentChunk = fileContent;
                }
            } else {
                currentChunk += fileContent + "\n";
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    analyzerDiff(diffString: string, perChunkSize = 4000): string[] {
        return this.analyzer.chunkDiffString(diffString, perChunkSize);
    }

    chunkCommits(
        commits: string[],
        maxChunkSize: number = 20 * 1000
    ): string[][] {
        const chunks: string[][] = [];
        let currentChunk: string[] = [];
        let currentSize = 0;

        for (const commit of commits) {
            let commitParts: string[];
            if (commit.length > maxChunkSize) {
                // Split large commits by lines
                commitParts = commit.split("\n");
            } else {
                commitParts = [commit];
            }

            for (const part of commitParts) {
                const partSize = part.length + 1; // +1 for newline

                if (
                    currentSize + partSize > maxChunkSize &&
                    currentChunk.length > 0
                ) {
                    chunks.push(currentChunk);
                    currentChunk = [];
                    currentSize = 0;
                }

                currentChunk.push(part);
                currentSize += partSize;
            }
        }

        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }

        return chunks;
    }

    async commit(message: string): Promise<void> {
        await this.git.commit(message);
    }

    async isGitRepo(): Promise<boolean> {
        try {
            await this.git.status();
            return true;
        } catch {
            return false;
        }
    }
}
