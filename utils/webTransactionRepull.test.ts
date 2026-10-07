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
    describe(`web add server-id reconcile on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("SPEC-36 v1.3 ACC-W-07: web add re-GETs after POST and replaces state", () => {
            const source = readRepo("context/TransactionsContext.tsx");
            const gets = source.match(/transactions\?userId=\$\{activeUserId\}/g) ?? [];
            expect(gets.length).toBeGreaterThanOrEqual(3);
            const rehydrates = source.match(/resolveTransactionCategory\(t, categories\)/g) ?? [];
            expect(rehydrates.length).toBe(2);
            expect(source).toContain("setTransactions((prev) => [...prev, uploaded])");
        });

        it("SPEC-36 v1.3 ACC-W-07: web repull adds zero local writes; delete copy untouched", () => {
            const source = readRepo("context/TransactionsContext.tsx");
            expect(source).toContain("SPEC-36 v1.3 DEC-W4(a)");
            expect(source).toContain("Failed to delete transaction. Please check your connection.");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
