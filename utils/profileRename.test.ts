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
    describe(`settings rename display name on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: pencil IconButton gated on !isLocal", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            expect(source).toContain('icon="pencil-outline"');
            const gate = source.indexOf("{!isLocal && (");
            const pencil = source.indexOf('icon="pencil-outline"');
            expect(gate).toBeGreaterThanOrEqual(0);
            expect(pencil).toBeGreaterThan(gate);
        });

        it("ACC-02: dialog has prefilled TextInput bound to profile name", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            expect(source).toContain('showRenameDialog');
            expect(source).toContain('setRenameInput(profile?.name || "")');
            expect(source).toContain("value={renameInput}");
            expect(source).toContain("Change Name");
        });

        it("ACC-03: save handler trims and guards empty", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            expect(source).toContain("const next = renameInput.trim();");
            expect(source).toContain("if (!next) return;");
            const guard = source.indexOf("if (!next) return;");
            const write = source.indexOf("await updateProfile({ name: next });");
            expect(write).toBeGreaterThan(guard);
        });

        it("ACC-04: save handler awaits updateProfile in try/catch and reports via showMessage", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            const handler = source.slice(
                source.indexOf("const handleSaveRename"),
                source.indexOf("const executeDelete")
            );
            expect(handler).toContain("await updateProfile({ name: next });");
            expect(handler).toContain('showMessage("success", "Name Updated"');
            expect(handler).toContain('showMessage("error", "Update Failed"');
            expect(handler).toContain("try {");
            expect(handler).toContain("catch (e)");
        });

        it("ACC-05: rename path adds no login-identity write", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            const handler = source.slice(
                source.indexOf("const handleSaveRename"),
                source.indexOf("const executeDelete")
            );
            expect(handler).not.toContain("authName");
            expect(handler).not.toContain("master_users");
            expect(handler).not.toContain("addUser");
        });

        it("ACC-06: updateProfile signature unchanged and no new context action", () => {
            const context = readRepo("context/UserProfileContext.tsx");
            const settings = readRepo("app/(tabs)/settings.tsx");
            expect(context).toContain("updateProfile: (updates: Partial<UserProfile>) => Promise<void>;");
            expect(context).not.toContain("renameProfile");
            expect(settings).not.toContain("renameProfile");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
