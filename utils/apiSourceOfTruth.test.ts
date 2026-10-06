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

const CONSUMERS = [
    "components/SummaryCard.tsx",
    "app/add-transaction.tsx",
    "app/dues.tsx",
    "context/TransactionsContext.tsx",
];

function runSuite(os: "android" | "ios" | "web") {
    describe(`api source of truth on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: fetchTransactions never sends on read", () => {
            const source = readRepo("context/TransactionsContext.tsx");
            expect(source).not.toContain("enqueueAndTrigger");
            expect(source).not.toContain("processSyncQueue");
        });

        it("ACC-02: web branches intact (SPEC-36)", () => {
            const source = readRepo("context/TransactionsContext.tsx");
            expect(source).toContain("SPEC-36 CON-W-03");
            const hits = source.match(/Platform\.OS === "web"/g) ?? [];
            expect(hits.length).toBe(4);
        });

        it("ACC-03: local branches intact (SPEC-04)", () => {
            const source = readRepo("context/TransactionsContext.tsx");
            const hits = source.match(/if \(isLocal\)/g) ?? [];
            expect(hits.length).toBe(4);
            const authMode = readRepo("utils/authMode.ts");
            expect(authMode).toContain("offline_token");
            expect(authMode).toContain("local_token");
        });

        it("ACC-04: balance sums use the surviving marker, never title alone", () => {
            for (const file of CONSUMERS) {
                expect(readRepo(file)).toContain("OPENING_BALANCE_CATEGORY_ID");
            }
            for (const file of CONSUMERS) {
                expect(readRepo(file)).not.toContain('t.title !== "Opening Balance"');
            }
        });

        it("ACC-05: mirror never re-stamps server timestamps", () => {
            const source = readRepo("context/TransactionsContext.tsx");
            expect(source).not.toContain("nowTimestamp");
            expect(source).not.toContain("upsertBulk");
            expect(source).toContain("getPrefixedKey('transactions')");
            expect(source).toContain("updateLastSyncedAt");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
