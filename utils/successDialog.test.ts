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

const OTHER_CALLERS = [
    "app/(tabs)/settings.tsx",
    "app/archived-allocations.tsx",
    "app/dues.tsx",
    "app/category-settings.tsx",
    "app/payment-methods.tsx",
    "app/savings.tsx",
];

function runSuite(os: "android" | "ios" | "web") {
    describe(`success dialog pattern on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("SPEC-65 ACC-01: ConfirmDialog success tone, danger default intact", () => {
            const source = readRepo("components/ConfirmDialog.tsx");
            expect(source).toContain('tone = "danger"');
            expect(source).toContain("check-circle-outline");
            expect(source).toContain("theme.colors.primary");
            expect(source).toContain("theme.colors.error");
            expect(source).toContain('tone !== "success"');
            expect(source).toContain("maxWidth: 480");
        });

        it("SPEC-65 ACC-02: delete success dialogs then backs, failure toast retained", () => {
            const source = readRepo("app/transaction-details.tsx");
            expect(source).toContain('tone="success"');
            expect(source).toContain("Deleted Successfully");
            expect(source).toContain("handleSuccessDismiss");
            expect(source).toContain("setSuccessVisible(true)");
            expect(source).not.toContain('showToast("Transaction deleted successfully.")');
            expect(source).toContain("Failed to delete transaction. Please check your connection.");
            expect(source).toContain("isLegacyId");
        });

        it("SPEC-65 ACC-03: edit save success dialogs then backs, failure Alert retained", () => {
            const source = readRepo("app/edit-transaction.tsx");
            expect(source).toContain('tone="success"');
            expect(source).toContain("Updated Successfully");
            expect(source).toContain("handleSuccessDismiss");
            expect(source).toContain("setSuccessVisible(true)");
            expect(source).not.toContain('showToast("Transaction updated successfully.")');
            expect(source).toContain("Failed to save changes. Please check your connection.");
        });

        it("SPEC-65 v1.1 ACC-06: lookup preserves the row behind the success dialog", () => {
            const source = readRepo("app/transaction-details.tsx");
            expect(source).toContain("if (found || !successVisible) setTransaction(found || null)");
            expect(source).toContain("[id, transactions, successVisible]");
            expect(source).toContain("Transaction not found");
        });

        it("SPEC-65 ACC-04: other callers toneless, failure-path toast imports kept", () => {
            for (const file of OTHER_CALLERS) {
                expect(readRepo(file)).not.toContain("tone=");
            }
            expect(readRepo("app/transaction-details.tsx")).toContain("useToast");
            expect(readRepo("app/transaction-details.tsx")).toContain("ConfirmDialog");
            expect(readRepo("app/edit-transaction.tsx")).toContain("ConfirmDialog");
            expect(readRepo("app/edit-transaction.tsx")).not.toContain("useToast");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
