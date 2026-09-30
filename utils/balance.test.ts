import * as fs from "fs";
import * as path from "path";
import {
  OPENING_BALANCE_TITLE,
  computeAvailableBalance,
  computeBalance,
  computeBalanceSums,
  isOpeningBalanceTransaction,
} from "./balance";
import type { BalanceTransaction } from "./balance";

let mockOS: "android" | "ios" | "web" = "android";

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockOS;
    },
  },
}));

const opening = (amount: number): BalanceTransaction => ({
  title: OPENING_BALANCE_TITLE,
  amount,
  type: "income",
});

const income = (amount: number): BalanceTransaction => ({ type: "income", amount });
const expense = (amount: number): BalanceTransaction => ({ type: "expense", amount });

describe.each(["android", "ios", "web"] as const)("balance SPEC-37 on %s", (platform) => {
  beforeEach(() => {
    mockOS = platform;
  });

  // The helper is pure with no Platform.OS branch (CON-02), so the platform
  // matrix asserts identical results everywhere — that identity IS the
  // Android/iOS/Web guarantee, asserted rather than assumed.
  describe("ACC-01: Opening row excluded from income, surfaced as openingIncome", () => {
    test("opening row lands in openingIncome, not income; expense sum unchanged", () => {
      const sums = computeBalanceSums([opening(1000), income(5000), expense(300)]);
      expect(sums.openingIncome).toBe(1000);
      expect(sums.income).toBe(5000);
      expect(sums.expense).toBe(300);
    });

    test("expense sum matches a plain type==='expense' sum", () => {
      const txns: BalanceTransaction[] = [opening(1000), expense(300), expense(200)];
      const plain = txns.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      expect(computeBalanceSums(txns).expense).toBe(plain);
    });

    test("an expense titled 'Opening Balance' is still counted as expense (legacy parity)", () => {
      const sums = computeBalanceSums([{ type: "expense", amount: 250, title: OPENING_BALANCE_TITLE }]);
      expect(sums.expense).toBe(250);
      expect(sums.openingIncome).toBe(0);
    });

    test("isOpeningBalanceTransaction matches only the exact title", () => {
      expect(isOpeningBalanceTransaction(opening(1))).toBe(true);
      expect(isOpeningBalanceTransaction({ type: "income", amount: 1, title: "opening balance" })).toBe(false);
      expect(isOpeningBalanceTransaction(income(1))).toBe(false);
    });
  });

  describe("ACC-02: regression — opening balance is not doubled", () => {
    test("initialBalance 1000 + opening row 1000 = 1000, not 2000", () => {
      const total = computeBalance({ initialBalance: 1000, transactions: [opening(1000)] });
      expect(total).toBe(1000);
    });

    test("realistic mix: opening 1000 + salary 5000 - expense 300 = 5700", () => {
      const total = computeBalance({
        initialBalance: 1000,
        transactions: [opening(1000), income(5000), expense(300)],
      });
      expect(total).toBe(5700);
    });

    test("available balance subtracts reserved from the same total", () => {
      const total = computeAvailableBalance({
        initialBalance: 1000,
        transactions: [opening(1000), expense(200)],
        reserved: 300,
      });
      expect(total).toBe(500);
    });
  });

  describe("ACC-03: no opening row (new accounts / api-only plane)", () => {
    test("equals initialBalance + income - expense over all rows", () => {
      const total = computeBalance({
        initialBalance: 1000,
        transactions: [income(5000), expense(300), expense(200)],
      });
      expect(total).toBe(5500);
    });

    test("no transactions at all = initialBalance", () => {
      expect(computeBalance({ initialBalance: 1000, transactions: [] })).toBe(1000);
    });

    test("negative balance still reachable", () => {
      expect(computeBalance({ initialBalance: 100, transactions: [expense(400)] })).toBe(-300);
    });
  });

  describe("ACC-04: reserved is a parameter and defaults to 0", () => {
    test("omitting reserved matches passing 0 (add-allocation shape)", () => {
      const txns = [income(1000), expense(100)];
      expect(computeAvailableBalance({ initialBalance: 0, transactions: txns })).toBe(
        computeAvailableBalance({ initialBalance: 0, transactions: txns, reserved: 0 })
      );
      expect(computeAvailableBalance({ initialBalance: 0, transactions: txns })).toBe(900);
    });

    test("reserved is subtracted once", () => {
      expect(
        computeAvailableBalance({ initialBalance: 1000, transactions: [], reserved: 250 })
      ).toBe(750);
    });
  });

  describe("ACC-05: pinned limitation — api-only orphan row is still counted", () => {
    // The server has no transaction `title` column, so a legacy Cloud+ON
    // account's opening row comes back titleless and is indistinguishable from
    // a real income. Those accounts stay doubled by design (DEC-03, CON-06).
    test("titleless income equal to initialBalance is counted (documented, not a regression)", () => {
      const total = computeBalance({
        initialBalance: 1000,
        transactions: [{ type: "income", amount: 1000 }],
      });
      expect(total).toBe(2000);
    });
  });

  describe("ACC-06: pinned false positive — user row titled 'Opening Balance'", () => {
    test("a user-created income with that exact title is still excluded", () => {
      const total = computeBalance({
        initialBalance: 0,
        transactions: [{ type: "income", amount: 750, title: OPENING_BALANCE_TITLE }],
      });
      expect(total).toBe(0);
    });
  });

  describe("ACC-07: robustness — never throws, always finite", () => {
    test("string amounts (Supabase NUMERIC) are parsed", () => {
      expect(computeBalance({ initialBalance: "1000", transactions: [{ type: "income", amount: "12.50" }] }))
        .toBe(1012.5);
    });

    test("missing, null and NaN amounts contribute 0", () => {
      const sums = computeBalanceSums([
        { type: "income" },
        { type: "expense", amount: null },
        { type: "income", amount: "abc" },
      ]);
      expect(sums.income).toBe(0);
      expect(sums.expense).toBe(0);
      expect(Number.isFinite(sums.income)).toBe(true);
    });

    test("missing initialBalance and missing reserved are 0, not NaN", () => {
      const total = computeAvailableBalance({ transactions: [income(100)] });
      expect(total).toBe(100);
      expect(Number.isFinite(total)).toBe(true);
    });

    test("null list, undefined entries and unknown types are tolerated", () => {
      expect(() =>
        computeBalanceSums([undefined as unknown as BalanceTransaction, income(10)])
      ).not.toThrow();
      expect(computeBalanceSums(null as unknown as BalanceTransaction[]).income).toBe(0);
      expect(computeBalanceSums([{ type: "transfer", amount: 999 }]).income).toBe(0);
    });
  });

  describe("ACC-08: source scan — no balance formula is hand-rolled anymore", () => {
    const read = (relative: string): string =>
      fs.readFileSync(path.resolve(__dirname, "..", relative), "utf-8");

    const CALL_SITES = [
      "components/SummaryCard.tsx",
      "app/add-transaction.tsx",
      "app/savings.tsx",
      "app/add-allocation.tsx",
      "app/dues.tsx",
      "context/TransactionsContext.tsx",
    ];

    for (const file of CALL_SITES) {
      test(`${file} no longer inlines the title-based exclusion`, () => {
        expect(read(file)).not.toContain('title !== "Opening Balance"');
      });

      test(`${file} routes through utils/balance`, () => {
        expect(read(file)).toMatch(/computeAvailableBalance|computeBalance/);
      });
    }

    test("onboarding no longer creates an Opening Balance transaction", () => {
      const src = read("app/onboarding.tsx");
      expect(src).not.toContain("addTransaction(");
      expect(src).not.toContain("b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19");
      expect(src).toContain("completeSetup");
    });

    test("no leftover 'Opening Balance' literal outside the helper", () => {
      const offenders = CALL_SITES.filter((file) => read(file).includes(OPENING_BALANCE_TITLE));
      expect(offenders).toEqual([]);
    });
  });
});
