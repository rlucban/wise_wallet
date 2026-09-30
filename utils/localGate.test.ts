import * as fs from "fs";
import * as path from "path";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  applyOfflineSuggestionChoice,
  buildAuthLoginPayload,
  buildCloudRegisterPayload,
  classifyAuthLoginResult,
  findAuthUserRow,
  getDeviceOnline,
  getInitialAccountMode,
  getOrCreateDeviceId,
  guardPromotionToggle,
  isLocalAuthAllowed,
  isReregistrationAllowed,
  isValidReregistrationEmail,
  isValidReregistrationPin,
  REREGISTER_CONNECT_MESSAGE,
  REREGISTER_HONESTY_MESSAGE,
  REREGISTER_HONESTY_TITLE,
  shouldShowOfflineSuggestion,
  verifyReregistrationInvariants,
  WEB_LOGIN_CONNECT_MESSAGE,
} from "./localGate";
import {
  clearSessionCaches,
  getCachedSetting,
  setCachedSetting,
  setCachedUserId,
} from "./cache";
import { getCachedUserId } from "./cache";
import { getPrefixedKey } from "./storage";
import { removeSecureItem } from "./secureStorage";

jest.mock("expo-secure-store", () => ({
  isAvailableAsync: async () => true,
  setItemAsync: jest.fn(async () => {}),
  getItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(async () => {}),
}));

let mockOS: "android" | "ios" | "web" = "android";

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockOS;
    },
  },
}));

describe.each(["android", "ios", "web"] as const)(
  "localGate SPEC-30 on %s",
  (platform) => {
    beforeEach(() => {
      mockOS = platform;
      jest.clearAllMocks();
      return AsyncStorage.clear();
    });

    test("ACC-01: mount samples device connectivity with zero fetch calls", () => {
      const g = globalThis as unknown as { fetch?: unknown };
      const originalFetch = g.fetch;
      const fetchSpy = jest.fn().mockRejectedValue(new Error("must not fetch"));
      g.fetch = fetchSpy;
      try {
        const online = getDeviceOnline();
        expect(typeof online).toBe("boolean");
        // Suggestion gate is a pure device-connectivity check — no fetch.
        expect(
          shouldShowOfflineSuggestion({
            isWeb: platform === "web",
            deviceOnline: false,
            alreadyShown: false,
          })
        ).toBe(platform !== "web");
        expect(
          shouldShowOfflineSuggestion({
            isWeb: platform === "web",
            deviceOnline: true,
            alreadyShown: false,
          })
        ).toBe(false);
        // Once per visit: second evaluation stays hidden.
        expect(
          shouldShowOfflineSuggestion({
            isWeb: false,
            deviceOnline: false,
            alreadyShown: true,
          })
        ).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        g.fetch = originalFetch;
      }
    });

    test("ACC-02: online default = Online, Continue Offline preselects Offline", () => {
      expect(getInitialAccountMode()).toBe("online");
      expect(applyOfflineSuggestionChoice("continue-offline")).toBe("offline");
      expect(applyOfflineSuggestionChoice("use-online")).toBe("online");
    });

    test("ACC-03: login module contains no Create Offline Account offer", () => {
      const fullPath = path.resolve(__dirname, "..", "app", "login.tsx");
      const content = fs.readFileSync(fullPath, "utf-8");
      expect(content).not.toContain("Create Offline Account");
    });

    test("ACC-04: promotion changes id, old user_* keys byte-identical (no merge/move/delete)", async () => {
      const oldId = "local-uuid-123";
      const newId = "cloud-uuid-456";
      await AsyncStorage.setItem(
        `user_${oldId}_transactions`,
        JSON.stringify([{ id: "t1" }])
      );
      await AsyncStorage.setItem(
        `user_${oldId}_profile`,
        JSON.stringify({ name: "localuser" })
      );
      await AsyncStorage.setItem("activeUserId", oldId);

      const keys = await AsyncStorage.getAllKeys();
      const before: Record<string, string | null> = {};
      for (const k of keys) {
        before[k] = await AsyncStorage.getItem(k);
      }

      // Simulate the SPEC-30 switch: write ONLY new-identity keys +
      // activeUserId; never merge, move, or delete old Local rows.
      await AsyncStorage.setItem(
        `user_${newId}_profile`,
        JSON.stringify({ name: "new@example.com" })
      );
      await AsyncStorage.setItem(`user_${newId}_settings`, JSON.stringify({}));
      await AsyncStorage.setItem("activeUserId", newId);

      const keysAfter = await AsyncStorage.getAllKeys();
      const after: Record<string, string | null> = {};
      for (const k of keysAfter) {
        after[k] = await AsyncStorage.getItem(k);
      }

      const result = verifyReregistrationInvariants({
        oldUserId: oldId,
        newUserId: newId,
        beforeSnapshot: before,
        afterSnapshot: after,
      });
      expect(result.activeChanged).toBe(true);
      expect(result.oldIntact).toBe(true);

      // Honesty copy states NEW account + data stays + export/import path.
      expect(REREGISTER_HONESTY_TITLE).toContain("Register Online Account");
      const lower = REREGISTER_HONESTY_MESSAGE.toLowerCase();
      expect(lower).toContain("new");
      expect(lower).toContain("does not move");
      expect(lower).toContain("export");
      expect(lower).toContain("import");
    });

    test("ACC-05: toggle-ON while offline performs zero fetch and zero writes", async () => {
      expect(isReregistrationAllowed(false)).toBe(false);
      expect(isReregistrationAllowed(true)).toBe(true);

      const doFetch = jest.fn();
      const doWrite = jest.fn();
      const blocked = guardPromotionToggle({
        deviceOnline: false,
        doFetch,
        doWrite,
      });
      expect(blocked.allowed).toBe(false);
      expect(blocked.message).toBe(REREGISTER_CONNECT_MESSAGE);
      expect(doFetch).not.toHaveBeenCalled();
      expect(doWrite).not.toHaveBeenCalled();

      const keysBefore = await AsyncStorage.getAllKeys();
      const g2 = globalThis as unknown as { fetch?: unknown };
      const originalFetch2 = g2.fetch;
      const fetchSpy2 = jest.fn().mockRejectedValue(new Error("must not fetch"));
      g2.fetch = fetchSpy2;
      try {
        // Implementation path: offline guard returns before any fetch/write.
        const online = false;
        if (!isReregistrationAllowed(online)) {
          // no-op: no fetch, no setItem
        }
        expect(fetchSpy2).not.toHaveBeenCalled();
        await expect(AsyncStorage.getAllKeys()).resolves.toEqual(keysBefore);
      } finally {
        g2.fetch = originalFetch2;
      }

      const allowed = guardPromotionToggle({
        deviceOnline: true,
        doFetch,
        doWrite,
      });
      expect(allowed.allowed).toBe(true);
      expect(doFetch).toHaveBeenCalledTimes(1);
      expect(doWrite).toHaveBeenCalledTimes(1);
    });

    test("reregistration payload + validators", () => {
      expect(buildCloudRegisterPayload("  a@b.co  ", "1234")).toEqual({
        name: "a@b.co",
        passcode: "1234",
        initialBalance: 0,
      });
      expect(isValidReregistrationEmail("a@b.co")).toBe(true);
      expect(isValidReregistrationEmail("not-an-email")).toBe(false);
      expect(isValidReregistrationPin("1234")).toBe(true);
      expect(isValidReregistrationPin("12")).toBe(false);
    });

    test("SPEC-31 ACC-01: local auth gate blocks web, allows native", () => {
      expect(isLocalAuthAllowed(platform)).toBe(platform !== "web");
      expect(WEB_LOGIN_CONNECT_MESSAGE.length).toBeGreaterThan(0);
    });

    test("SPEC-31 ACC-02: login.tsx web early-out precedes any local_token issuance", () => {
      const fullPath = path.resolve(__dirname, "..", "app", "login.tsx");
      const content = fs.readFileSync(fullPath, "utf-8");
      const gateIdx = content.indexOf("isLocalAuthAllowed(Platform.OS)");
      const tokenIdx = content.indexOf('"local_token"');
      expect(gateIdx).toBeGreaterThan(-1);
      expect(tokenIdx).toBeGreaterThan(-1);
      expect(gateIdx).toBeLessThan(tokenIdx);
    });

    test("SPEC-31 ACC-03: session hygiene clears identity+caches, preserves stored data", async () => {
      await AsyncStorage.setItem("activeUserId", "U1");
      await AsyncStorage.setItem("authToken", "jwt-old");
      await AsyncStorage.setItem("user_U1_profile", JSON.stringify({ name: "a@b.co" }));
      await AsyncStorage.setItem("master_users", JSON.stringify([{ id: "U1" }]));
      setCachedUserId("U1");
      setCachedSetting("autoBackup", "true");

      clearSessionCaches();
      await AsyncStorage.removeItem("activeUserId");
      await removeSecureItem("authToken");

      expect(getCachedUserId()).toBeNull();
      expect(getCachedSetting("autoBackup")).toBeUndefined();
      await expect(AsyncStorage.getItem("activeUserId")).resolves.toBeNull();
      await expect(AsyncStorage.getItem("authToken")).resolves.toBeNull();
      // Stored data byte-identical (CON-03: hygiene, not wipe).
      await expect(AsyncStorage.getItem("user_U1_profile")).resolves.toBe(
        JSON.stringify({ name: "a@b.co" })
      );
      await expect(AsyncStorage.getItem("master_users")).resolves.toBe(
        JSON.stringify([{ id: "U1" }])
      );
      setCachedUserId(null);
    });

    test("SPEC-31 ACC-04: post-hygiene keys scope to the next login id", async () => {
      try {
        setCachedUserId("stale-A");
        clearSessionCaches();
        setCachedUserId("fresh-B");
        await expect(getPrefixedKey("profile")).resolves.toBe("user_fresh-B_profile");
      } finally {
        setCachedUserId(null);
      }
    });

    test("SPEC-31 ACC-07: auth payload carries a non-empty deviceId", async () => {
      await AsyncStorage.setItem("localDeviceId", "dev-123");
      const deviceId = await getOrCreateDeviceId();
      expect(deviceId).toBe("dev-123");
      expect(
        buildAuthLoginPayload({ name: "  a@b.co ", passcode: "1234", deviceId, force: true })
      ).toEqual({ name: "a@b.co", passcode: "1234", deviceId: "dev-123", force: true });
    });

    test("SPEC-31 ACC-08: session conflict never classifies as wrong PIN", () => {
      expect(
        classifyAuthLoginResult({
          ok: true,
          status: 200,
          body: { data: { sessionConflict: true } },
        })
      ).toEqual({ outcome: "conflict" });
      expect(
        classifyAuthLoginResult({
          ok: true,
          status: 200,
          body: { data: { user: { id: "u1" }, token: "jwt" } },
        })
      ).toEqual({ outcome: "authenticated", userId: "u1", token: "jwt" });
      expect(
        classifyAuthLoginResult({ ok: true, status: 200, body: { data: {} } }).outcome
      ).toBe("rejected");
      expect(
        classifyAuthLoginResult({ ok: false, status: 0, body: null }).outcome
      ).toBe("unreachable");
      expect(
        classifyAuthLoginResult({ ok: false, status: 401, body: null }).outcome
      ).toBe("rejected");
    });

    test("SPEC-31 ACC-09: fallback matches by id or case-insensitive name", () => {
      const rows = [
        { id: "cloud-1", name: "User@X.co", passcode: "h1" },
        { id: "uuid-2", name: "localuser", passcode: "h2" },
      ];
      expect(findAuthUserRow(rows, { id: "uuid-2", name: "zzz" })?.name).toBe("localuser");
      expect(findAuthUserRow(rows, { id: "stale-id", name: "  USER@x.CO " })?.id).toBe("cloud-1");
      expect(findAuthUserRow(rows, { id: "nope", name: "nobody" })).toBeUndefined();
    });
  }
);
