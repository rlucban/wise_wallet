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

function blockOf(source: string): string {
    const anchor = source.indexOf("visible={showConflictDialog}");
    if (anchor < 0) throw new Error("sync conflict dialog missing");
    const start = source.lastIndexOf("<NativeModal", anchor);
    if (start < 0) throw new Error("sync conflict dialog missing");
    return source.slice(start, source.indexOf("</NativeModal>", anchor));
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`sync conflict dialog centered on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: modal chrome wraps the dialog", () => {
            const block = blockOf(readRepo(SCREEN));
            expect(block).toContain("<NativeModal");
            expect(block).toContain("transparent");
            expect(block).toContain('animationType="fade"');
            expect(block).toContain('presentationStyle="overFullScreen"');
            expect(block).toContain("onRequestClose={() => setShowConflictDialog(false)}");
            expect(block).toContain('backgroundColor: "rgba(0, 0, 0, 0.32)"');
            expect(block).toContain("onPress={() => setShowConflictDialog(false)}");
            expect(block).toContain("<KeyboardAvoidingView");
            expect(block).toContain('behavior={Platform.OS === "ios" ? "padding" : "height"}');
            expect(block).toContain("<ScrollView");
            expect(block).toContain("flexGrow: 1");
            expect(block).toContain('keyboardShouldPersistTaps="handled"');
            expect(block).toContain("</ScrollView>");
            expect(block).toContain("</KeyboardAvoidingView>");
            expect(block).toContain("<Surface");
        });

        it("ACC-02: title, copy, column layout, and actions intact", () => {
            const block = blockOf(readRepo(SCREEN));
            expect(block).toContain("Sync Conflict");
            expect(block).toContain("We found data for your account on the server.");
            expect(block).toContain("flexDirection: 'column'");
            expect(block).toContain("Merge (Last Write Wins)");
            expect(block).toContain("handleMergeLWW");
            expect(block).toContain("Keep Local Only");
            expect(block).toContain("handleManualBackup");
            expect(block).toContain("Keep Cloud Only");
            expect(block).toContain("performRestore");
            expect(block).toContain(">Cancel</Button>");
        });

        it("ACC-03: scope confined", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("visible={showPinVerificationDialog}");
            expect(source).toContain("visible={showNewAccountDialog}");
            expect(source).toContain("visible={showBackupDialog}");
            expect(source).toContain("handleMergeLWW");
            expect(source).toContain("performRestore");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
