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
    describe(`delete validation feedback on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("SPEC-65 ACC-02: handleDelete dialogs success then backs, toasts failure and stays (supersedes SPEC-36 success toast)", () => {
            const source = readRepo("app/transaction-details.tsx");
            expect(source).toContain("useToast");
            expect(source).toContain("await deleteTransaction(transaction.id)");
            expect(source).toContain('tone="success"');
            expect(source).toContain("Deleted Successfully");
            expect(source).toContain("handleSuccessDismiss");
            expect(source).toContain("safeGoBack(router)");
            expect(source).not.toContain('showToast("Transaction deleted successfully.")');
            expect(source).toContain("try {");
            expect(source).toContain("} catch (e) {");
            expect(source).toContain("Delete Transaction?");
        });

        it("SPEC-36 v1.4 ACC-W-10: delete prefers the server message on both branches", () => {
            const source = readRepo("context/TransactionsContext.tsx");
            const prefers = source.match(/status !== 0 && error \? error : "Failed to delete transaction\. Please check your connection\."/g) ?? [];
            expect(prefers.length).toBe(2);
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
