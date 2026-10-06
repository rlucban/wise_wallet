import * as fs from "fs";
import * as path from "path";
import { groupTransactionsByMonth } from "./transactionGroups";
import type { Transaction } from "../types";

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

function tx(id: string, date: string, amount = 100): Transaction {
    return { id, amount, date, type: "expense", updatedAt: 0 };
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`transaction statement groups on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-06a: out-of-order fixtures group into newest-first months", () => {
            const groups = groupTransactionsByMonth([
                tx("a", "2026-08-15T10:00:00"),
                tx("b", "2026-10-06T10:00:00"),
                tx("c", "2026-09-01T10:00:00"),
            ]);
            expect(groups.map((g) => g.key)).toEqual(["2026-10", "2026-09", "2026-08"]);
        });

        it("ACC-06b: items within a month are newest-first; empty input yields no groups", () => {
            const groups = groupTransactionsByMonth([
                tx("early", "2026-10-01T08:00:00"),
                tx("late", "2026-10-06T18:00:00"),
            ]);
            expect(groups.length).toBe(1);
            expect(groups[0].items.map((t) => t.id)).toEqual(["late", "early"]);
            expect(groupTransactionsByMonth([])).toEqual([]);
        });

        it("ACC-07: grouped containers + statement fields; no details navigation (v1.2: rows static)", () => {
            const source = readRepo("app/transactions.tsx");
            expect(source).toContain("groupTransactionsByMonth");
            expect(source).toContain("group.label");
            expect(source).toContain('item.type === "income" ? "+" : "-"');
            expect(source).not.toContain("transaction-details?id=");
        });

        it("ACC-08: no modal or touchables; sole onPress is header back (v1.2: ACC-10)", () => {
            const source = readRepo("app/transactions.tsx");
            for (const token of ["Dialog", "Modal", "TouchableOpacity", "Pressable", "setSelected", "Receipt"]) {
                expect(source).not.toContain(token);
            }
            const presses = source.match(/onPress/g) ?? [];
            expect(presses.length).toBe(1);
            expect(source).toContain("Appbar.BackAction");
        });

        it("ACC-09: Home retarget + details writer intact", () => {
            expect(readRepo("app/(tabs)/index.tsx")).toContain('router.push("/transactions")');
            expect(readRepo("app/transaction-details.tsx")).toContain("/edit-transaction?id=");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
