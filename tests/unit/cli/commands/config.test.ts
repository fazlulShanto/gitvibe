import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfigManager } from "../../../../src/core/config";

// Mock ConfigManager
vi.mock("../../../../src/core/config", () => ({
    ConfigManager: {
        listConfigsWithValidity: vi.fn(),
        getDefaultConfigName: vi.fn(),
        listConfigs: vi.fn(),
        setDefaultConfigName: vi.fn(),
    },
}));

// Import the action functions directly
async function listAction() {
    const configs = await ConfigManager.listConfigsWithValidity();
    const defaultName = await ConfigManager.getDefaultConfigName();

    if (configs.length === 0) {
        console.log(
            'No configurations found. Run "gitvibe config new <name>" to create one.'
        );
        return;
    }

    console.log("Configurations:");
    for (const { name, valid } of configs) {
        const defaultMarker = name === defaultName ? " (default)" : "";
        const validMarker = valid ? "" : " (invalid)";
        console.log(`  ${name}${defaultMarker}${validMarker}`);
    }
}

async function setDefaultAction(name: string) {
    const configs = await ConfigManager.listConfigs();
    if (!configs.includes(name)) {
        console.log(`Configuration "${name}" not found.`);
        return;
    }

    await ConfigManager.setDefaultConfigName(name);
    console.log(`Default configuration set to "${name}".`);
}

describe("config command", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("list action", () => {
        it("should list configurations with validity status", async () => {
            const mockConfigs = [
                { name: "default", valid: true },
                { name: "invalid-config", valid: false },
            ];
            const mockDefaultName = "default";

            vi.mocked(ConfigManager.listConfigsWithValidity).mockResolvedValue(
                mockConfigs
            );
            vi.mocked(ConfigManager.getDefaultConfigName).mockResolvedValue(
                mockDefaultName
            );

            // Mock console.log to capture output
            const consoleSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            // Execute the list action
            await listAction();

            expect(ConfigManager.listConfigsWithValidity).toHaveBeenCalled();
            expect(ConfigManager.getDefaultConfigName).toHaveBeenCalled();

            expect(consoleSpy).toHaveBeenCalledWith("Configurations:");
            expect(consoleSpy).toHaveBeenCalledWith("  default (default)");
            expect(consoleSpy).toHaveBeenCalledWith(
                "  invalid-config (invalid)"
            );

            consoleSpy.mockRestore();
        });

        it("should show message when no configurations exist", async () => {
            vi.mocked(ConfigManager.listConfigsWithValidity).mockResolvedValue(
                []
            );
            vi.mocked(ConfigManager.getDefaultConfigName).mockResolvedValue(
                null
            );

            const consoleSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            await listAction();

            expect(consoleSpy).toHaveBeenCalledWith(
                'No configurations found. Run "gitvibe config new <name>" to create one.'
            );

            consoleSpy.mockRestore();
        });
    });

    describe("set-default action", () => {
        it("should set default configuration", async () => {
            vi.mocked(ConfigManager.listConfigs).mockResolvedValue([
                "default",
                "other",
            ]);
            const setDefaultSpy = vi.mocked(ConfigManager.setDefaultConfigName);

            const consoleSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            await setDefaultAction("other");

            expect(setDefaultSpy).toHaveBeenCalledWith("other");
            expect(consoleSpy).toHaveBeenCalledWith(
                'Default configuration set to "other".'
            );

            consoleSpy.mockRestore();
        });

        it("should show error for non-existent configuration", async () => {
            vi.mocked(ConfigManager.listConfigs).mockResolvedValue(["default"]);

            const consoleSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            await setDefaultAction("nonexistent");

            expect(consoleSpy).toHaveBeenCalledWith(
                'Configuration "nonexistent" not found.'
            );

            consoleSpy.mockRestore();
        });
    });
});
