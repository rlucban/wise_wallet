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
    describe(`edit-save validation feedback on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("SPEC-65 ACC-03: handleSave dialogs success then backs, alerts the resolved error (supersedes SPEC-36 success toast)", () => {
            const source = readRepo("app/edit-transaction.tsx");
            expect(source).not.toContain("useToast");
            expect(source).toContain("await updateTransaction(id, {");
            expect(source).toContain('tone="success"');
            expect(source).toContain("Updated Successfully");
            expect(source).toContain("handleSuccessDismiss");
            expect(source).toContain("safeGoBack(router)");
            expect(source).not.toContain('showToast("Transaction updated successfully.")');
            expect(source).toContain("} catch (e) {");
            expect(source).toContain("e instanceof Error ? e.message");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
