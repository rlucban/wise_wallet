import * as fs from "fs";
import * as path from "path";

function readSettings(): string {
    return fs.readFileSync(path.resolve(__dirname, "..", "app/(tabs)/settings.tsx"), "utf8");
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
    describe(`settings dialog centering on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("SPEC-66 ACC-04: three specified dialogs use centered RN shells", () => {
            const source = readSettings();
            const shells = [
                ["showDeleteDialog", "closeDeleteDialog"],
                ["showPinPrompt", "closeClearDataPinPrompt"],
                ["showChangePasscodeDialog", "closeChangePasscodeDialog"],
            ] as const;

            for (const [visibleState, dismissHandler] of shells) {
                const start = source.indexOf(`<Modal visible={${visibleState}}`);
                const end = source.indexOf("</Modal>", start);
                const shell = source.slice(start, end + "</Modal>".length);

                expect(start).toBeGreaterThanOrEqual(0);
                expect(end).toBeGreaterThan(start);
                expect(shell).toContain("transparent animationType=\"fade\"");
                expect(shell).toContain(`onRequestClose={${dismissHandler}}`);
                expect(shell).toContain(`onPress={${dismissHandler}}`);
                expect(shell).toContain("onPress={() => {}}");
                expect(shell).toContain('justifyContent: "center"');
                expect(shell).toContain('alignItems: "center"');
                expect(shell).toContain('width: "90%"');
                expect(shell).toContain("maxWidth: 480");
                expect(shell).not.toContain(`<Dialog visible={${visibleState}}`);
            }
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");