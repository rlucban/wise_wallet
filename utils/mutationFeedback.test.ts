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
            expect(source).toContain('maxWidth: 480, width: "90%", alignSelf: "center", marginHorizontal: 0');
            expect(source).toContain('resultDialog.ok ? "check-circle-outline" : "alert-circle-outline"');
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
            expect(source).toContain('maxWidth: 480, width: "90%", alignSelf: "center", marginHorizontal: 0');
            expect(source).toContain('resultDialog.ok ? "check-circle-outline" : "alert-circle-outline"');
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
