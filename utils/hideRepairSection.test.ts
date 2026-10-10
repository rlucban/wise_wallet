import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

const SCREEN = "app/(tabs)/settings.tsx";

function runSuite(os: "android" | "ios" | "web") {
    describe(`hide repair duplicates section on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: Repair button gated off, JSX intact", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("const SHOW_REPAIR_SECTION = false;");
            expect(source.match(/\{SHOW_REPAIR_SECTION && \(/g) ?? []).toHaveLength(1);
            expect(source).toContain("SPEC-72: Repair section hidden");
            expect(source).toContain('icon="auto-fix"');
            expect(source).toContain("onPress={previewRepair}");
            expect(source).toContain("Repair Transaction Duplicates");
        });

        it("ACC-02: repair flow logic still present", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("previewRepair");
            expect(source).toContain("executeRepair");
            expect(source).toContain("setShowRepairConfirm(true)");
            expect(source).toContain("Repair Duplicates?");
        });

        it("ACC-03: unconditional gate; neighboring rows intact", () => {
            const source = readRepo(SCREEN);
            const gateLine = source
                .split("\n")
                .find((line) => line.includes("{SHOW_REPAIR_SECTION && ("));
            expect(gateLine).toBeDefined();
            expect(gateLine as string).not.toMatch(/Platform|isLocal/);
            expect(source).toContain("Backup Data to Cloud API Now");
            expect(source).toContain("Export Data");
            expect(source).toContain("Clear All Data");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
