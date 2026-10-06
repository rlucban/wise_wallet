import * as fs from "fs";
import * as path from "path";
import { resolveTransactionCategory } from "./transactionCategory";
import { OTHERS_EXPENSE_ID, OTHERS_INCOME_ID } from "./categoryOptions";
import type { Category } from "../types";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

// Seed-aligned fixtures (ids cite utils/db.ts:57-67 GLOBAL_CATEGORIES;
// synthetic Others ids cite utils/categoryOptions.ts OTHERS_*_ID).
const SALARY_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b16";
const FREELANCE_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b17";

const FOOD: Category = { id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11", name: "Food", type: "expense", updatedAt: 0 };
const SALARY: Category = { id: SALARY_ID, name: "Salary", type: "income", updatedAt: 0 };
const FREELANCE: Category = { id: FREELANCE_ID, name: "Freelance", type: "income", updatedAt: 0 };
const OTHERS_EXPENSE: Category = { id: OTHERS_EXPENSE_ID, name: "Others", type: "expense", updatedAt: 0 };
const OTHERS_INCOME: Category = { id: OTHERS_INCOME_ID, name: "Others", type: "income", updatedAt: 0 };

const CATS: Category[] = [FOOD, SALARY, FREELANCE, OTHERS_EXPENSE, OTHERS_INCOME];

let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

function runSuite(os: "android" | "ios" | "web") {
    describe(`transaction category persistence on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: online POST bodies derive categoryId from the selected category id (web + native)", () => {
            const src = readRepo("context/TransactionsContext.tsx");
            const derived = src.match(/categoryId: uploaded\.category\?\.id \?\? null/g) || [];
            expect(derived).toHaveLength(2);
            expect(src).not.toMatch(/categoryId:\s*["'][^"']+["']/);
        });

        it("ACC-01b: PUT bodies send categoryId only when updates carry a category (web + native)", () => {
            const src = readRepo("context/TransactionsContext.tsx");
            const cond = src.match(/if \(updates\.category !== undefined\) updateBody\.categoryId = updates\.category \? updates\.category\.id : null;/g) || [];
            expect(cond).toHaveLength(2);
        });

        it("ACC-02: web branch carries web-depth placement, native carries native-depth", () => {
            const src = readRepo("context/TransactionsContext.tsx");
            expect(src).toContain("\n                    body: JSON.stringify({ ...uploaded, categoryId:");
            expect(src).toContain("\n                body: JSON.stringify({ ...uploaded, categoryId:");
        });

        it("ACC-03: categoryId appears only on the 4 online sites; local write path intact", () => {
            const src = readRepo("context/TransactionsContext.tsx");
            const hits = src.match(/categoryId/g) || [];
            expect(hits).toHaveLength(4);
            expect(src).toContain("await txRepo.upsert(newTransaction);");
        });

        it("ACC-04a: server-echoed nested category wins", () => {
            const echo: Category = { id: "srv-1", name: "Salary", type: "income", updatedAt: 1 };
            expect(resolveTransactionCategory({ category: echo, categoryId: "stale", type: "income" }, CATS)).toBe(echo);
        });

        it("ACC-04b: flat categoryId resolves Salary and Freelance", () => {
            expect(resolveTransactionCategory({ categoryId: SALARY_ID, type: "income" }, CATS)).toEqual(SALARY);
            expect(resolveTransactionCategory({ categoryId: FREELANCE_ID, type: "income" }, CATS)).toEqual(FREELANCE);
        });

        it("ACC-04c: synthetic b18/b19 Others IDs resolve against the seed-aligned list", () => {
            expect(resolveTransactionCategory({ categoryId: OTHERS_INCOME_ID, type: "income" }, CATS)).toEqual(OTHERS_INCOME);
            expect(resolveTransactionCategory({ categoryId: OTHERS_EXPENSE_ID, type: "expense" }, CATS)).toEqual(OTHERS_EXPENSE);
        });

        it("ACC-04d: unknown / null / missing / empty categoryId falls back without throwing", () => {
            const rows = [
                { categoryId: "no-such-id", type: "income" as const },
                { categoryId: null, type: "income" as const },
                { type: "income" as const },
                { categoryId: "", type: "expense" as const },
            ];
            for (const row of rows) {
                expect(resolveTransactionCategory(row, CATS)).toEqual({
                    id: "uncategorized",
                    name: "Others",
                    type: row.type,
                    updatedAt: 0,
                });
            }
        });

        it("ACC-04e: empty categories list keeps the fallback (DEC-03)", () => {
            expect(resolveTransactionCategory({ categoryId: SALARY_ID, type: "income" }, [])).toEqual({
                id: "uncategorized",
                name: "Others",
                type: "income",
                updatedAt: 0,
            });
        });

        it("ACC-04f: null nested category falls through to lookup; missing type defaults to expense", () => {
            expect(resolveTransactionCategory({ category: null, categoryId: FREELANCE_ID, type: "income" }, CATS)).toEqual(FREELANCE);
            expect(resolveTransactionCategory({ categoryId: "no-such-id" }, CATS)).toEqual({
                id: "uncategorized",
                name: "Others",
                type: "expense",
                updatedAt: 0,
            });
        });

        it("ACC-07a: web fetch resolves through Categories state, native through catRepo", () => {
            const src = readRepo("context/TransactionsContext.tsx");
            expect(src).toContain("resolveTransactionCategory(t, categories)");
            expect(src).toContain("resolveTransactionCategory(t, cats)");
            expect(src).toContain("\n                        setTransactions(remoteData.map((t)");
        });

        it("ACC-07b: useCategoriesData consumed once; catRepo uses stay at 4 (none in web branch)", () => {
            const src = readRepo("context/TransactionsContext.tsx");
            expect(src).toContain('import { useCategoriesData } from "./CategoriesContext";');
            expect(src).toContain("const { categories } = useCategoriesData();");
            const catRepoUses = src.match(/catRepo/g) || [];
            expect(catRepoUses).toHaveLength(4);
        });

        it("ACC-07c: fetch deps include categories (re-fetch on categories load)", () => {
            const src = readRepo("context/TransactionsContext.tsx");
            expect(src).toContain("[activeUserId, txRepo, isLocal, refreshFromApi, categories]");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
