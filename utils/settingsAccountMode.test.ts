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

function runSuite(os: "android" | "ios" | "web") {
    describe(`settings account mode on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: name heuristic is gone", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            expect(source).not.toContain("isUsernameOnly");
            expect(source).not.toContain("isEffectivelyLocal");
        });

        it("ACC-02: copy branches on token isLocal", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            expect(source).toContain('{isLocal ? "Local-only account — stored on this device"');
            expect(source).toContain("isLocal={isLocal}");
        });

        it("ACC-03: switch hidden for Local, web-disabled; OFF copy is No local backup (SPEC-45 D-03)", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            expect(source).toContain("{!isLocal && (");
            expect(source).toContain(
                'onValueChange={handleToggleAutoBackup} disabled={Platform.OS === "web"}'
            );
            expect(source).toContain("No local backup");
            expect(source).not.toContain("Sync off");
            expect(source).not.toContain("Auto-Backup");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");

describe("SPEC-38 web gate", () => {
    it("ACC-04: Backup/Restore hidden on web", () => {
        const source = readRepo("app/(tabs)/settings.tsx");
        const hits = source.match(/!isLocal && Platform\.OS !== "web"/g) ?? [];
        expect(hits.length).toBe(2);
    });
});
