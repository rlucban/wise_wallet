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
    describe(`make online dialog shell on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("SPEC-66 ACC-01: PIN + New-Account dialogs use the centered RN shell", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            expect(source).toContain("visible={showPinVerificationDialog}");
            expect(source).toContain("visible={showNewAccountDialog}");
            expect(source).toContain("closePinVerificationDialog");
            expect(source).toContain("transparent");
            expect(source).toContain('animationType="fade"');
            expect(source).toContain("onRequestClose");
            expect(source).toContain("onPress={() => {}}");
            expect(source).toContain("maxWidth: 480");
            expect(source).not.toContain("<Dialog visible={showPinVerificationDialog}");
            expect(source).not.toContain("<Dialog visible={showNewAccountDialog}");
        });

        it("SPEC-66 ACC-02: flow, inline error, and other dialogs retained", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            expect(source).toContain("verifyPinForSync");
            expect(source).toContain("Verify & Sync");
            expect(source).toContain("createNewAccountAndMigrate");
            expect(source).toContain("Create New & Migrate");
            expect(source).toContain("setVerificationError");
            expect(source).toContain("verificationError");
            expect(source).toContain("visible={messageDialog.visible}");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
