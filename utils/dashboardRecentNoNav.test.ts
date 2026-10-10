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

const SCREEN = "app/(tabs)/index.tsx";

function runSuite(os: "android" | "ios" | "web") {
    describe(`dashboard recent display-only rows on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: no details navigation from the dashboard", () => {
            const source = readRepo(SCREEN);
            expect(source).not.toContain("transaction-details");
            expect(source).not.toContain("onPress={() => router.push(`/transaction-details?id=${item.id}`)}");
        });

        it("ACC-02: row content, style, and list source intact", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("marginHorizontal: 16");
            expect(source).toContain('item.category?.name || "Others"');
            expect(source).toContain("selectRecentTransactions(transactions)");
            expect(source).toContain("[theme, formatAmount]");
        });

        it("ACC-03: other details entries and edit home intact", () => {
            const list = readRepo("components/TransactionList.tsx");
            expect(list).toContain("router.push(`/transaction-details?id=${item.id}`)");
            readRepo("app/transaction-details.tsx");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
