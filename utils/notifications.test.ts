import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SystemAlert } from "../types";
import {
  checkAndTriggerNegativeBalanceAlert,
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

function makeAlert(overrides: Partial<SystemAlert> = {}): SystemAlert {
  return {
    id: "alert-1",
    type: "Budget Alert",
    title: "Negative Balance Alert ⚠️",
    message: "Your available balance has dropped below ₱0.00.",
    date: new Date().toISOString(),
    read: false,
    balanceAtTrigger: -1000,
    updatedAt: 1000,
    ...overrides,
  };
}

const formatAmount = (v: number): string =>
  `₱${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function runSuite(os: "android" | "ios" | "web") {
  describe(`checkAndTriggerNegativeBalanceAlert (Platform.OS=${os})`, () => {
    beforeEach(async () => {
      mockOS = os;
      mockSchedule.mockClear();
      await AsyncStorage.clear();
    });

    it("ACC-01: recovery to exactly 0 deletes unread alerts", async () => {
      await saveAlerts([makeAlert()], USER);

      const result = await checkAndTriggerNegativeBalanceAlert(0, formatAmount, USER);

      expect(result).toEqual({ action: "deleted" });
      expect(await getAlerts(USER)).toHaveLength(0);
    });

    it("ACC-02: non-negative balance with no alerts is a no-op", async () => {
      const result = await checkAndTriggerNegativeBalanceAlert(500, formatAmount, USER);

      expect(result).toEqual({ action: "none" });
      expect(await getAlerts(USER)).toHaveLength(0);
    });

    it("ACC-03: recovery keeps read alerts (history preserved)", async () => {
      await saveAlerts([makeAlert({ read: true })], USER);

      const result = await checkAndTriggerNegativeBalanceAlert(100, formatAmount, USER);

      expect(result).toEqual({ action: "none" });
      const stored = await getAlerts(USER);
      expect(stored).toHaveLength(1);
      expect(stored[0].read).toBe(true);
    });

    it("ACC-04: improvement while negative updates the alert in place", async () => {
      await saveAlerts([makeAlert({ balanceAtTrigger: -1000, updatedAt: 1000 })], USER);

      const result = await checkAndTriggerNegativeBalanceAlert(-200, formatAmount, USER);

      expect(result).toEqual({ action: "updated" });
      const stored = await getAlerts(USER);
      expect(stored).toHaveLength(1);
      expect(stored[0].balanceAtTrigger).toBe(-200);
      expect(stored[0].message).toContain(formatAmount(-200));
      expect(stored[0].read).toBe(false);
    });

    it("ACC-05: unchanged negative balance is a no-op", async () => {
      await saveAlerts([makeAlert({ balanceAtTrigger: -200 })], USER);

      const result = await checkAndTriggerNegativeBalanceAlert(-200, formatAmount, USER);

      expect(result).toEqual({ action: "none" });
      expect(await getAlerts(USER)).toHaveLength(1);
    });

    it("ACC-06: worsening negative balance creates a new alert", async () => {
      await saveAlerts([makeAlert({ balanceAtTrigger: -200 })], USER);

      const result = await checkAndTriggerNegativeBalanceAlert(-800, formatAmount, USER);

      expect(result).toEqual({ action: "created" });
      const stored = await getAlerts(USER);
      expect(stored).toHaveLength(2);
      expect(stored[0].id).toBe("alert-test-uuid");
      expect(stored[0].balanceAtTrigger).toBe(-800);
      expect(stored[0].read).toBe(false);
    });

    it("ACC-07: re-trigger fires a fresh alert after recovery (read history does not suppress)", async () => {
      await saveAlerts([makeAlert({ read: true, balanceAtTrigger: -1000 })], USER);

      const result = await checkAndTriggerNegativeBalanceAlert(-150, formatAmount, USER);

      expect(result).toEqual({ action: "created" });
      const stored = await getAlerts(USER);
      expect(stored).toHaveLength(2);
      expect(stored[0].id).toBe("alert-test-uuid");
      expect(stored[0].balanceAtTrigger).toBe(-150);
    });

    it("ACC-08: OS push only fires on created (never updated/deleted)", async () => {
      await saveAlerts([makeAlert({ balanceAtTrigger: -1000 })], USER);
      await checkAndTriggerNegativeBalanceAlert(-200, formatAmount, USER);
      mockSchedule.mockClear();
      await checkAndTriggerNegativeBalanceAlert(-800, formatAmount, USER);

      if (os === "web") {
        expect(mockSchedule).not.toHaveBeenCalled();
      } else {
        expect(mockSchedule).toHaveBeenCalledTimes(1);
      }

      mockSchedule.mockClear();
      await checkAndTriggerNegativeBalanceAlert(-500, formatAmount, USER);
      expect(mockSchedule).not.toHaveBeenCalled();

      await saveAlerts([makeAlert({ balanceAtTrigger: -1000 })], USER);
      mockSchedule.mockClear();
      await checkAndTriggerNegativeBalanceAlert(100, formatAmount, USER);
      expect(mockSchedule).not.toHaveBeenCalled();
    });
  });
}

runSuite("android");
runSuite("ios");
runSuite("web");