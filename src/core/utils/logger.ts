export class Logger {
    private static verbose: boolean = false;

    static setVerbose(enabled: boolean): void {
        this.verbose = enabled;
    }

    static info(message: string): void {
        console.log(`=> INFO: ${message}`);
    }

    static error(message: string): void {
        console.error(`ERROR: ${message}`);
    }

    static warn(message: string): void {
        console.warn(`WARNING: ${message}`);
    }

    static debug(message: string): void {
        if (this.verbose) {
            console.log(`=>🟥: ${message}`);
        }
    }

    static success(message: string): void {
        console.log(`✅ ${message}`);
    }
}
