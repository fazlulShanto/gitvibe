import simpleGit, { SimpleGit } from "simple-git";
import { GitDiff } from "../types";
import { GitAnalyzer } from "./analyzer";

export class GitService {
    private git: SimpleGit;
    private analyzer = new GitAnalyzer();

    constructor() {
        this.git = simpleGit();
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
                diffs.push(diff);
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
