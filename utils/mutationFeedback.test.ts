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
    describe(`mutation feedback dialogs v1.1 on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-04: delete result dialog matches the confirm design, toast gone", () => {
            const source = readRepo("app/transaction-details.tsx");
            // SPEC-85 pinned the inline single-line style; the 2026-10-13 centering work moved
            // it into `styles.dialog` one key per line, so the pins are per-line here now.
            expect(source).toContain("maxWidth: 480,");
            expect(source).toContain('width: "90%",');
            expect(source).toContain('alignSelf: "center",');
            expect(source).toContain("marginHorizontal: 0,");
            expect(source).toContain('resultDialog.ok ? "check-circle-outline" :');
            expect(source).toContain('"Deleted Successfully"');
            expect(source).toContain('"Delete Failed"');
            expect(source).toContain("The transaction has been deleted.");
            expect(source).toContain("catch (e)");
            expect(source).toContain("safeGoBack(router)");
            expect(source).not.toContain("showToast");
            expect(source).not.toContain("ToastContext");
        });

        it("ACC-05: edit result dialog matches, validations intact, toast gone", () => {
            const source = readRepo("app/edit-transaction.tsx");
            // Per-line pins: this file also moved its dialog style into `styles.dialog`.
            expect(source).toContain("maxWidth: 480,");
            expect(source).toContain('width: "90%",');
            expect(source).toContain('alignSelf: "center",');
            expect(source).toContain("marginHorizontal: 0,");
            expect(source).toContain('resultDialog.ok ? "check-circle-outline" :');
            expect(source).toContain('"Saved Successfully"');
            expect(source).toContain('"Save Failed"');
            expect(source).toContain("Your changes have been saved.");
            expect(source).toContain('Alert.alert("Invalid Amount"');
            expect(source).toContain('Alert.alert("Invalid Category"');
            expect(source).not.toContain("showToast");
            expect(source).not.toContain("ToastContext");
        });

        it("ACC-06: lookup keeps the stale row while the result dialog shows", () => {
            const source = readRepo("app/transaction-details.tsx");
            expect(source).toContain("if (!found && resultDialog.visible) return;");
            expect(source).toContain("[id, transactions, resultDialog.visible]");
            expect(source).toContain("Transaction not found");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
