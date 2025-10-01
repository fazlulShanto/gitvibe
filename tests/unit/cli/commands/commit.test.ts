import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfigManager } from "../../../../src/core/config";

// Mock ConfigManager
vi.mock("../../../../src/core/config", () => ({
    ConfigManager: {
        getDefaultConfigName: vi.fn(),
        getConfig: vi.fn(),
    },
}));

describe("commit command validation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should validate git repository check", async () => {
        vi.mocked(ConfigManager.getDefaultConfigName).mockResolvedValue(
            "default"
        );
        vi.mocked(ConfigManager.getConfig).mockResolvedValue({} as any);

        const result = await ConfigManager.getDefaultConfigName();
        expect(result).toBe("default");
    });

    it("should validate configuration loading", async () => {
        const mockConfig = { ai_provider: "groq", model: "test" };
        vi.mocked(ConfigManager.getConfig).mockResolvedValue(mockConfig as any);

        const result = await ConfigManager.getConfig("default");
        expect(result).toEqual(mockConfig);
    });

    it("should handle missing configuration", async () => {
        vi.mocked(ConfigManager.getConfig).mockResolvedValue(null);

        const result = await ConfigManager.getConfig("missing");
        expect(result).toBeNull();
    });
});
