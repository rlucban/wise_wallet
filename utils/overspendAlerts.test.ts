import AsyncStorage from "@react-native-async-storage/async-storage";
import * as fs from "fs";
import * as path from "path";
import type { SystemAlert, Transaction } from "../types";
import {
  OVERSPENDING_ALERT_TITLE,
  checkAndTriggerOverspendAlerts,
  clearWebAlertStoreForTests,
  evaluateCategoryOverspend,
  getManilaMonthKey,
  getSystemAlerts as getAlerts,
  saveSystemAlerts as saveAlerts,
} from "./notifications";

const mockSchedule = jest.fn();
let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

jest.mock("expo-constants", () => ({
    __esModule: true,
    default: { appOwnership: null },
}));

jest.mock("expo-notifications", () => ({
    __esModule: true,
    setNotificationHandler: jest.fn(),
    scheduleNotificationAsync: jest.fn((..._args: unknown[]) => mockSchedule(..._args)),
    setNotificationChannelAsync: jest.fn(),
    AndroidImportance: { HIGH: 4 },
}));

jest.mock("./uuid", () => ({
    generateUUID: () => "alert-test-uuid",
}));

const USER = "test-user";
const NOW_OCT = Date.UTC(2026, 9, 15);
const NOW_JAN = Date.UTC(2026, 0, 15);

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
    return {
        id: "tx-1",
        amount: 100,
        type: "expense",
        date: new Date(NOW_OCT).toISOString(),
        category: { id: "food", name: "Food", type: "expense", updatedAt: 0 },
        updatedAt: 0,
        ...overrides,
    };
}

function makeCatTx(name: string, id: string, amount: number): Transaction {
    return makeTx({
        id: `tx-${id}`,
        amount,
        category: { id, name, type: "expense", updatedAt: 0 },
    });
}

function makeOverspendAlert(overrides: Partial<SystemAlert> = {}): SystemAlert {
    return {
        id: "overspend-1",
        type: "Budget Alert",
        title: OVERSPENDING_ALERT_TITLE,
        message: "High expenses detected in Food this month.",
        date: new Date(NOW_OCT).toISOString(),
        read: false,
        categoryId: "food",
        monthKey: "2026-10",
        updatedAt: NOW_OCT,
        ...overrides,
    };
}

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`category overspend alerts v1.1 on ${os}`, () => {
        beforeEach(async () => {
            mockOS = os;
            mockSchedule.mockClear();
            clearWebAlertStoreForTests();
            await AsyncStorage.clear();
        });

        it("ACC-04: income-basis breach, initial handling, denom gate", () => {
            const atHalf = [makeTx({ amount: 2000 })];
            expect(evaluateCategoryOverspend(atHalf, 4000, 0, NOW_OCT).breached.map((b) => b.name)).toEqual([
                "Food",
            ]);
            expect(evaluateCategoryOverspend([makeTx({ amount: 1999 })], 4000, 0, NOW_OCT).breached).toEqual([]);
            expect(evaluateCategoryOverspend(atHalf, 0, 4000, NOW_OCT).breached.map((b) => b.name)).toEqual([
                "Food",
            ]);
            expect(evaluateCategoryOverspend(atHalf, 0, -100, NOW_OCT).breached).toEqual([]);
            expect(evaluateCategoryOverspend(atHalf, 0, 0, NOW_OCT).breached).toEqual([]);
        });

        it("ACC-04: top-1 selection, tie-break, Manila boundary, unattributed", () => {
            const two = [makeCatTx("Shopping", "shopping", 5000), makeCatTx("Bills", "bills", 3000)];
            expect(evaluateCategoryOverspend(two, 4000, 0, NOW_OCT).breached.map((b) => b.name)).toEqual([
                "Shopping",
            ]);
            const tied = [makeCatTx("Shopping", "shopping", 3000), makeCatTx("Bills", "bills", 3000)];
            expect(evaluateCategoryOverspend(tied, 4000, 0, NOW_OCT).breached.map((b) => b.name)).toEqual([
                "Bills",
            ]);
            expect(getManilaMonthKey(Date.parse("2025-12-31T16:30:00Z"))).toBe("2026-01");
            const janTx = makeTx({ date: "2025-12-31T16:30:00Z", amount: 3000 });
            expect(evaluateCategoryOverspend([janTx], 4000, 0, NOW_JAN).breached.map((b) => b.name)).toEqual([
                "Food",
            ]);
            const nameless = makeTx({ amount: 9000, category: undefined });
            expect(evaluateCategoryOverspend([nameless], 4000, 0, NOW_OCT).breached).toEqual([]);
        });

        it("ACC-05: two breachers yield exactly one alert, the top", async () => {
            const txs = [makeCatTx("Shopping", "shopping", 5000), makeCatTx("Bills", "bills", 3000)];
            const result = await checkAndTriggerOverspendAlerts(txs, 4000, 0, USER, NOW_OCT);

            expect(result).toEqual({ created: 1, updated: 0, deleted: 0 });
            const stored = await getAlerts(USER);
            expect(stored).toHaveLength(1);
            expect(stored[0]).toMatchObject({
                type: "Budget Alert",
                title: "Overspending Alert",
                message: "High expenses detected in Shopping this month.",
                read: false,
                categoryId: "shopping",
                monthKey: "2026-10",
            });
            expect(mockSchedule).not.toHaveBeenCalled();
        });

        it("ACC-05: alert migrates on overtake; stale months purge", async () => {
            await saveAlerts(
                [
                    makeOverspendAlert({ id: "overspend-bills", categoryId: "bills", message: "High expenses detected in Bills this month." }),
                    makeOverspendAlert({ id: "overspend-shopping", categoryId: "shopping", message: "High expenses detected in Shopping this month." }),
                ],
                USER
            );
            const txs = [makeCatTx("Shopping", "shopping", 5000), makeCatTx("Bills", "bills", 100)];
            const result = await checkAndTriggerOverspendAlerts(txs, 4000, 0, USER, NOW_OCT);

            expect(result).toEqual({ created: 0, updated: 1, deleted: 1 });
            const stored = await getAlerts(USER);
            expect(stored).toHaveLength(1);
            expect(stored[0].categoryId).toBe("shopping");

            await saveAlerts([makeOverspendAlert({ monthKey: "2026-09" })], USER);
            const purged = await checkAndTriggerOverspendAlerts([], 4000, 0, USER, NOW_OCT);
            expect(purged).toEqual({ created: 0, updated: 0, deleted: 1 });
            expect(await getAlerts(USER)).toHaveLength(0);
        });

        it("ACC-05: SPEC-10 alerts survive; empty denominator hands off", async () => {
            const negative = makeOverspendAlert({
                id: "neg-1",
                title: "Negative Balance Alert ⚠️",
                message: "Your available balance has dropped below ₱0.00.",
                categoryId: undefined,
                monthKey: undefined,
            });
            await saveAlerts([negative], USER);
            const txs = [makeCatTx("Shopping", "shopping", 5000)];
            const result = await checkAndTriggerOverspendAlerts(txs, 4000, 0, USER, NOW_OCT);
            expect(result).toEqual({ created: 1, updated: 0, deleted: 0 });
            expect((await getAlerts(USER)).map((a) => a.title)).toEqual([
                "Overspending Alert",
                "Negative Balance Alert ⚠️",
            ]);

            await saveAlerts([makeOverspendAlert()], USER);
            const handoff = await checkAndTriggerOverspendAlerts(txs, 0, 0, USER, NOW_OCT);
            expect(handoff).toEqual({ created: 0, updated: 0, deleted: 1 });
            expect(await getAlerts(USER)).toHaveLength(0);
        });

        it("ACC-03/05: wiring, SPEC-10 intact, additive-only types", () => {
            const txContext = readRepo("context/TransactionsContext.tsx");
            expect(txContext).toContain("checkOverspending(transactions, monthlyIncome, initialBalance)");
            expect(txContext).toContain("const monthlyIncome = transactions");
            expect(txContext).not.toContain("checkOverspending(transactions, balance)");
            const alertsContext = readRepo("context/SystemAlertsContext.tsx");
            expect(alertsContext).toContain("checkAndTriggerNegativeBalanceAlert(balance, formatAmount, activeUserId)");
            expect(alertsContext).toContain(
                "checkOverspending: (transactions: Transaction[], monthlyIncome: number, initialBalance: number) => Promise<OverspendEvaluation>;"
            );
            expect(alertsContext).toContain(
                "async (transactions: Transaction[], monthlyIncome: number, initialBalance: number): Promise<OverspendEvaluation>"
            );
            const types = readRepo("types/index.ts");
            expect(types).toContain("categoryId?: string");
            expect(types).toContain("monthKey?: string");
            const utils = readRepo("utils/notifications.ts");
            expect(utils).toContain("initialBalance > 0 ? initialBalance : 0");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
