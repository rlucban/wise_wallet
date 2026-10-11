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
    const anchor = source.indexOf("visible={showPinVerificationDialog}");
    if (anchor < 0) throw new Error("verify dialog missing");
    const start = source.lastIndexOf("<NativeModal", anchor);
    if (start < 0) throw new Error("verify dialog missing");
    return source.slice(start, source.indexOf("</NativeModal>", anchor));
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`make online dialog centered on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: modal chrome wraps the dialog", () => {
            const block = blockOf(readRepo(SCREEN));
            expect(block).toContain("<NativeModal");
            expect(block).toContain("transparent");
            expect(block).toContain('animationType="fade"');
            expect(block).toContain('presentationStyle="overFullScreen"');
            expect(block).toContain("onRequestClose={() => setShowPinVerificationDialog(false)}");
            expect(block).toContain('backgroundColor: "rgba(0, 0, 0, 0.32)"');
            expect(block).toContain("onPress={() => setShowPinVerificationDialog(false)}");
            expect(block).toContain("<KeyboardAvoidingView");
            expect(block).toContain('behavior={Platform.OS === "ios" ? "padding" : "height"}');
            expect(block).toContain("<ScrollView");
            expect(block).toContain("flexGrow: 1");
            expect(block).toContain('keyboardShouldPersistTaps="handled"');
            expect(block).toContain("</ScrollView>");
            expect(block).toContain("</KeyboardAvoidingView>");
            expect(block).toContain("<Surface");
        });

        it("ACC-02: titles, copy, inputs, and actions intact", () => {
            const block = blockOf(readRepo(SCREEN));
            expect(block).toContain('{isLocal ? "Make Online" : "Verify Account PIN"}');
            expect(block).toContain("cannot be reverted back to local-only");
            expect(block).toContain('label="Current PIN"');
            expect(block).toContain("setPinVerificationInput");
            expect(block).toContain("setVerificationError");
            expect(block).toContain(">Cancel</Button>");
            expect(block).toContain("Verify & Sync");
            expect(block).toContain("verifyPinForSync");
        });

        it("ACC-03: scope confined", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("visible={showBackupDialog}");
            expect(source).toContain("visible={showConflictDialog}");
            expect(source).toContain("visible={showNewAccountDialog}");
            expect(source).toContain("performRestore");
            expect(source).toContain("handleMergeLWW");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
