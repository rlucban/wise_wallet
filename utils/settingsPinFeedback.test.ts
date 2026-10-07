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
    describe(`settings PIN feedback on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("SPEC-49 ACC-09: Clear Data error is inline and centered", () => {
            const source = readSettings();
            const handlerStart = source.indexOf("const handleClearData = async () =>");
            const handlerEnd = source.indexOf("const executeClearData = async () =>", handlerStart);
            const handler = source.slice(handlerStart, handlerEnd);
            const dialogStart = source.indexOf('<Modal visible={showPinPrompt}');
            const dialogEnd = source.indexOf('<Dialog visible={showDeleteConfirmation}', dialogStart);
            const dialog = source.slice(dialogStart, dialogEnd);

            expect(source).toContain('const [pinClearError, setPinClearError] = useState("")');
            expect(handler).toContain('setPinClearError("Incorrect PIN. Please try again.")');
            expect(handler).toContain('setPinInput("")');
            expect(handler).not.toContain('showMessage("error", "Incorrect PIN"');
            expect(dialog).toContain("{pinClearError ? (");
            expect(dialog).toContain('textAlign: "center", alignSelf: "center", width: "100%"');
            expect(source).toContain('setPinClearError(""); setShowPinPrompt(true)');
        });

        it("SPEC-49 ACC-09: Delete Account error is centered below PIN input", () => {
            const source = readSettings();
            const dialogStart = source.indexOf('<Modal visible={showDeleteDialog}');
            const dialogEnd = source.indexOf('<Dialog visible={messageDialog.visible}', dialogStart);
            const dialog = source.slice(dialogStart, dialogEnd);

            expect(dialog).toContain("{deletePinError ? (");
            expect(dialog).toContain('textAlign: "center", alignSelf: "center", width: "100%"');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");