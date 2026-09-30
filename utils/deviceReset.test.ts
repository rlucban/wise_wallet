jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA256" },
  digestStringAsync: async (_alg: unknown, s: string) => `sha256:${s}`,
}));

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///docs/",
  readAsStringAsync: async () => "",
  writeAsStringAsync: async () => {},
  deleteAsync: jest.fn(async () => {}),
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  readDirectoryAsync: jest.fn(async () => []),
  EncodingType: { Base64: "base64", UTF8: "utf8" },
}));

jest.mock("expo-secure-store", () => ({
  isAvailableAsync: async () => true,
  setItemAsync: jest.fn(async () => {}),
  getItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(async () => {}),
}));

import * as fs from "fs";
import * as path from "path";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import { resetDeviceData } from "./deviceReset";
import { isAdminToggleOn } from "./featureFlags";
import {
  getCachedUserId,
  setCachedUserId,
  setCachedSetting,
  getCachedSetting,
} from "./cache";
import { setItem } from "./storage";

const mockDeleteAsync = FileSystem.deleteAsync as unknown as jest.Mock;
const mockSecureDelete = SecureStore.deleteItemAsync as unknown as jest.Mock;

describe.each(["android", "ios", "web"] as const)(
  "deviceReset SPEC-35 on %s",
  (platform) => {
    const savedEnv = process.env.EXPO_PUBLIC_ADMIN_TOGGLE;

    beforeEach(() => {
      expect(["android", "ios", "web"]).toContain(platform);
      jest.clearAllMocks();
      setCachedUserId(null);
      delete process.env.EXPO_PUBLIC_ADMIN_TOGGLE;
      return AsyncStorage.clear();
    });

    afterEach(() => {
      if (savedEnv === undefined) {
        delete process.env.EXPO_PUBLIC_ADMIN_TOGGLE;
      } else {
        process.env.EXPO_PUBLIC_ADMIN_TOGGLE = savedEnv;
      }
    });

    test("ACC-01: flag is off unless exactly \"true\"", () => {
      delete process.env.EXPO_PUBLIC_ADMIN_TOGGLE;
      expect(isAdminToggleOn()).toBe(false);
      process.env.EXPO_PUBLIC_ADMIN_TOGGLE = "false";
      expect(isAdminToggleOn()).toBe(false);
      process.env.EXPO_PUBLIC_ADMIN_TOGGLE = "TRUE";
      expect(isAdminToggleOn()).toBe(false);
      process.env.EXPO_PUBLIC_ADMIN_TOGGLE = "1";
      expect(isAdminToggleOn()).toBe(false);
      process.env.EXPO_PUBLIC_ADMIN_TOGGLE = "true";
      expect(isAdminToggleOn()).toBe(true);
    });

    test("ACC-02: login gates reset UI on the flag identifier", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "..", "app", "login.tsx"),
        "utf-8"
      );
      expect(content).toContain("isAdminToggleOn()");
      // Exactly one real wipe call site (the confirmed path); cancel paths
      // only dismiss dialogs.
      const calls = content.match(/resetDeviceData\(/g) || [];
      expect(calls).toHaveLength(1);
    });

    test("ACC-03b: stored token + server ok deletes the account, one DELETE only", async () => {
      const mockSecureGet = SecureStore.getItemAsync as unknown as jest.Mock;
      mockSecureGet.mockResolvedValueOnce("jwt-xyz");
      const g = globalThis as unknown as { fetch?: unknown };
      const originalFetch = g.fetch;
      const fetchMock = jest.fn(async () => ({
        ok: true,
        status: 200,
        headers: { get: () => "" },
        clone: () => ({ json: async () => ({}) }),
        json: async () => ({ status: "success", data: {} }),
      }));
      g.fetch = fetchMock;
      try {
        await AsyncStorage.setItem(
          "master_users",
          JSON.stringify([{ id: "U", name: "a@b.co", passcode: "x" }])
        );
        const result = await resetDeviceData();
        expect(result.serverDeleted).toBe(true);
        const fetchCalls = fetchMock.mock.calls as unknown as Array<
          [string, { method?: string }?]
        >;
        const deleteCalls = fetchCalls.filter((c) =>
          String(c[0]).includes("auth/account")
        );
        expect(deleteCalls).toHaveLength(1);
        expect(deleteCalls[0]?.[1]?.method).toBe("DELETE");
        const loginCalls = fetchCalls.filter((c) =>
          String(c[0]).includes("auth/login")
        );
        expect(loginCalls).toHaveLength(0);
        await expect(AsyncStorage.getItem("master_users")).resolves.toBeNull();
      } finally {
        g.fetch = originalFetch;
      }
    });

    test("ACC-03c: rejected server delete still wipes the device", async () => {
      const mockSecureGet = SecureStore.getItemAsync as unknown as jest.Mock;
      mockSecureGet.mockResolvedValueOnce("jwt-stale");
      const g = globalThis as unknown as { fetch?: unknown };
      const originalFetch = g.fetch;
      g.fetch = jest.fn(async () => ({
        ok: false,
        status: 401,
        headers: { get: () => "" },
        clone: () => ({ json: async () => ({}) }),
        json: async () => ({ error: "unauthorized" }),
      }));
      try {
        await AsyncStorage.setItem(
          "master_users",
          JSON.stringify([{ id: "U", name: "a@b.co", passcode: "x" }])
        );
        const result = await resetDeviceData();
        expect(result.serverDeleted).toBe(false);
        await expect(AsyncStorage.getItem("master_users")).resolves.toBeNull();
      } finally {
        g.fetch = originalFetch;
      }
    });

    test("ACC-03: wipe clears everything except the preserve list, zero fetch", async () => {
      const g = globalThis as unknown as { fetch?: unknown };
      const originalFetch = g.fetch;
      const fetchSpy = jest.fn().mockRejectedValue(new Error("must not fetch"));
      g.fetch = fetchSpy;
      try {
        await AsyncStorage.setItem(
          "master_users",
          JSON.stringify([{ id: "U", name: "a@b.co", passcode: "x" }])
        );
        await AsyncStorage.setItem(
          "user_U_transactions",
          JSON.stringify([{ id: "t1", receiptUrl: "file:///r.jpg" }])
        );
        await AsyncStorage.setItem("user_U_profile", JSON.stringify({}));
        await AsyncStorage.setItem("last_synced_at", "123");
        await AsyncStorage.setItem("localDeviceId", "dev-1");
        await AsyncStorage.setItem("system_reset_epoch", "7");
        await AsyncStorage.setItem("authToken", "jwt-old");
        setCachedUserId("U");
        setCachedSetting("autoBackup", "true");
        await setItem("user_U_settings", { autoBackup: "true" });

        const result = await resetDeviceData();

        await expect(AsyncStorage.getItem("master_users")).resolves.toBeNull();
        await expect(
          AsyncStorage.getItem("user_U_transactions")
        ).resolves.toBeNull();
        await expect(AsyncStorage.getItem("user_U_profile")).resolves.toBeNull();
        await expect(AsyncStorage.getItem("last_synced_at")).resolves.toBeNull();
        await expect(AsyncStorage.getItem("authToken")).resolves.toBeNull();
        expect(mockSecureDelete).toHaveBeenCalledWith("authToken");
        expect(getCachedUserId()).toBeNull();
        expect(getCachedSetting("autoBackup")).toBeUndefined();
        // Preserve list byte-identical.
        await expect(AsyncStorage.getItem("localDeviceId")).resolves.toBe("dev-1");
        await expect(AsyncStorage.getItem("system_reset_epoch")).resolves.toBe("7");
        // Receipt original + import copy attempted, counted once each.
        expect(mockDeleteAsync).toHaveBeenCalledWith("file:///r.jpg", {
          idempotent: true,
        });
        expect(mockDeleteAsync).toHaveBeenCalledWith("file:///docs/receipt_t1.jpg", {
          idempotent: true,
        });
        expect(result.deletedFiles).toBe(2);
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        g.fetch = originalFetch;
        setCachedUserId(null);
      }
    });
  }
);
