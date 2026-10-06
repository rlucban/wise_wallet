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
    describe(`transaction history on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: See All pushes /transactions, not /reports", () => {
            const source = readRepo("app/(tabs)/index.tsx");
            expect(source).toContain('router.push("/transactions")');
            expect(source).not.toContain('router.push("/reports")');
        });

        it("ACC-02: history screen has titled header + safeGoBack, no raw back", () => {
            const source = readRepo("app/transactions.tsx");
            expect(source).toContain('title="Transaction History"');
            expect(source).toContain("Appbar.BackAction");
            expect(source).toContain("safeGoBack(router)");
            expect(source).not.toContain("router.back()");
        });

        it("ACC-03: full history via month groups; tap opens receipt modal, not details (v1.1: ACC-07 governs)", () => {
            const source = readRepo("app/transactions.tsx");
            expect(source).toContain("groupTransactionsByMonth");
            expect(source).toContain("Transaction Receipt");
            expect(source).not.toContain("slice(0, 6)");
            expect(source).not.toContain("/transaction-details?id=");
        });

        it("ACC-04: Stack registers transactions; existing screens intact", () => {
            const source = readRepo("app/_layout.tsx");
            expect(source).toContain('<Stack.Screen name="transactions"');
            expect(source).toContain('<Stack.Screen name="transaction-details"');
            expect(source).toContain('<Stack.Screen name="(tabs)"');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
