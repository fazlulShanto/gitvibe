import simpleGit, { SimpleGit } from "simple-git";
import { Logger } from "../utils/logger";

export interface GitChangeInfo {
    files: string[];
    additions: number;
    deletions: number;
    diff: string;
    branch: string;
    staged: boolean;
}

export class GitAnalyzer {
    private git: SimpleGit;

    constructor(workingDir?: string) {
        this.git = simpleGit(workingDir || process.cwd());
    }

    public async isGitRepository(): Promise<boolean> {
        try {
            await this.git.status();
            return true;
        } catch {
            return false;
        }
    }

    public async getStagedChanges(): Promise<GitChangeInfo> {
        try {
            const status = await this.git.status();
            const diff = await this.git.diff(["--cached"]);
            const diffStat = await this.git.diffSummary(["--cached"]);

            return {
                files: [
                    ...status.staged,
                    ...status.modified,
                    ...status.created,
                ],
                additions: diffStat.insertions,
                deletions: diffStat.deletions,
                diff: diff,
                branch: status.current || "unknown",
                staged: true,
            };
        } catch (error) {
            Logger.error(
                `Failed to get staged changes: ${(error as Error).message}`
            );
            throw error;
        }
    }

    public async getUnstagedChanges(): Promise<GitChangeInfo> {
        try {
            const status = await this.git.status();
            const diff = await this.git.diff();
            const diffStat = await this.git.diffSummary();

            return {
                files: [...status.modified, ...status.not_added],
                additions: diffStat.insertions,
                deletions: diffStat.deletions,
                diff: diff,
                branch: status.current || "unknown",
                staged: false,
            };
        } catch (error) {
            Logger.error(
                `Failed to get unstaged changes: ${(error as Error).message}`
            );
            throw error;
        }
    }

    public async getAllChanges(): Promise<GitChangeInfo> {
        try {
            const status = await this.git.status();
            const diff = await this.git.diff(["HEAD"]);
            const diffStat = await this.git.diffSummary(["HEAD"]);

            return {
                files: [...status.files.map((f) => f.path)],
                additions: diffStat.insertions,
                deletions: diffStat.deletions,
                diff: diff,
                branch: status.current || "unknown",
                staged: false,
            };
        } catch (error) {
            Logger.error(
                `Failed to get all changes: ${(error as Error).message}`
            );
            throw error;
        }
    }

    public async getBranchDiff(
        targetBranch: string = "main"
    ): Promise<GitChangeInfo> {
        try {
            const status = await this.git.status();
            const currentBranch = status.current || "HEAD";

            // Get diff between current branch and target
            const diff = await this.git.diff([
                `${targetBranch}...${currentBranch}`,
            ]);
            const diffStat = await this.git.diffSummary([
                `${targetBranch}...${currentBranch}`,
            ]);

            // Get list of changed files
            const changedFiles = await this.git.diff([
                `${targetBranch}...${currentBranch}`,
                "--name-only",
            ]);
            const files = changedFiles
                .split("\n")
                .filter((file) => file.trim());

            return {
                files,
                additions: diffStat.insertions,
                deletions: diffStat.deletions,
                diff,
                branch: currentBranch,
                staged: false,
            };
        } catch (error) {
            Logger.error(
                `Failed to get branch diff: ${(error as Error).message}`
            );
            throw error;
        }
    }

    public async getCurrentBranch(): Promise<string> {
        try {
            const status = await this.git.status();
            return status.current || "unknown";
        } catch (error) {
            Logger.error(
                `Failed to get current branch: ${(error as Error).message}`
            );
            throw error;
        }
    }

    public async getRecentCommits(count: number = 5): Promise<string[]> {
        try {
            const log = await this.git.log({ maxCount: count });
            return log.all.map(
                (commit) => `${commit.hash.substring(0, 7)}: ${commit.message}`
            );
        } catch (error) {
            Logger.error(
                `Failed to get recent commits: ${(error as Error).message}`
            );
            throw error;
        }
    }

    public async hasChanges(): Promise<boolean> {
        try {
            const status = await this.git.status();
            return status.files.length > 0;
        } catch (error) {
            Logger.error(
                `Failed to check for changes: ${(error as Error).message}`
            );
            return false;
        }
    }

    public async hasStagedChanges(): Promise<boolean> {
        try {
            const status = await this.git.status();
            return status.staged.length > 0;
        } catch (error) {
            Logger.error(
                `Failed to check for staged changes: ${
                    (error as Error).message
                }`
            );
            return false;
        }
    }

    public async stageAll(): Promise<void> {
        try {
            await this.git.add(".");
            Logger.info("All changes staged successfully");
        } catch (error) {
            Logger.error(
                `Failed to stage changes: ${(error as Error).message}`
            );
            throw error;
        }
    }

    public async stageFiles(files: string[]): Promise<void> {
        try {
            await this.git.add(files);
            Logger.info(`Staged ${files.length} files successfully`);
        } catch (error) {
            Logger.error(`Failed to stage files: ${(error as Error).message}`);
            throw error;
        }
    }

    public async commit(message: string): Promise<void> {
        try {
            await this.git.commit(message);
            Logger.info("Commit created successfully");
        } catch (error) {
            Logger.error(
                `Failed to create commit: ${(error as Error).message}`
            );
            throw error;
        }
    }

    public async getRemoteBranches(): Promise<string[]> {
        try {
            const branches = await this.git.branch(["-r"]);
            return Object.keys(branches.branches)
                .filter(
                    (branch) =>
                        branch.startsWith("origin/") && !branch.includes("HEAD")
                )
                .map((branch) => branch.replace("origin/", ""));
        } catch (error) {
            Logger.error(
                `Failed to get remote branches: ${(error as Error).message}`
            );
            return [];
        }
    }

    public async getLocalBranches(): Promise<string[]> {
        try {
            const branches = await this.git.branchLocal();
            return branches.all;
        } catch (error) {
            Logger.error(
                `Failed to get local branches: ${(error as Error).message}`
            );
            return [];
        }
    }

    public formatDiffForAI(changeInfo: GitChangeInfo): string {
        const summary = [
            `Branch: ${changeInfo.branch}`,
            `Files changed: ${changeInfo.files.length}`,
            `Additions: +${changeInfo.additions}`,
            `Deletions: -${changeInfo.deletions}`,
            "",
            "Modified files:",
            ...changeInfo.files.map((file) => `- ${file}`),
            "",
            "Git diff:",
            changeInfo.diff,
        ].join("\n");

        return summary;
    }

    public chunkDiffString(
        diff: string,
        maxDiffSize = 4000,
        chunkOverlap = 200
    ): string[] {
        if (diff.length <= maxDiffSize) {
            return [diff];
        }

        const chunks: string[] = [];
        let start = 0;

        while (start < diff.length) {
            let end = start + maxDiffSize;

            // If we're not at the end, try to find a good breaking point
            if (end < diff.length) {
                // Look for a line break near the end
                const lastNewline = diff.lastIndexOf("\n", end);
                if (lastNewline > start + maxDiffSize * 0.8) {
                    end = lastNewline;
                }
            }

            chunks.push(diff.slice(start, end));

            // Move start position with overlap
            start = Math.max(start + 1, end - chunkOverlap);
        }

        return chunks;
    }
}
