import * as fs from "fs";
import * as path from "path";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("./apiClient", () => ({
  authFetch: jest.fn(),
}));

jest.mock("./syncProcessor", () => ({
  processSyncQueue: jest.fn(async () => {}),
}));

import { authFetch } from "./apiClient";
import { processSyncQueue } from "./syncProcessor";
import * as syncQueue from "./syncQueue";
import {
  resolveDataPlane,
  isAutoBackupOn,
  normalizeUserProfileResponse,
  apiCreate,
  apiUpdate,
  apiDelete,
  apiList,
  migrateToApiOnly,
  purgeUserEntityKeys,
  hasLegacyEntityKeys,
  switchToOfflineMode,
  readAutoBackupFlagFor,
} from "./apiOnly";
import { setCachedUserId } from "./cache";

const mockAuthFetch = authFetch as jest.MockedFunction<typeof authFetch>;
const mockDrain = processSyncQueue as jest.MockedFunction<typeof processSyncQueue>;
const enqueueSpy = jest
  .spyOn(syncQueue, "enqueueSync")
  .mockResolvedValue(undefined);

let mockOS: "android" | "ios" | "web" = "android";

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockOS;
    },
  },
}));

function okBody(data: unknown) {
  return { ok: true, status: 200, data };
}

describe.each(["android", "ios", "web"] as const)(
  "apiOnly SPEC-34 on %s",
  (platform) => {
    beforeEach(() => {
      mockOS = platform;
      jest.clearAllMocks();
      setCachedUserId(null);
      return AsyncStorage.clear();
    });

    test("ACC-01: mode router follows the CON-01 matrix", () => {
      // Local → local-persist everywhere.
      expect(
        resolveDataPlane({ platformOs: platform, isLocal: true, autoBackup: true })
      ).toBe("local-persist");
      expect(
        resolveDataPlane({ platformOs: platform, isLocal: true, autoBackup: false })
      ).toBe("local-persist");
      if (platform === "web") {
        // Web Cloud → api-only even when OFF.
        expect(
          resolveDataPlane({ platformOs: platform, isLocal: false, autoBackup: true })
        ).toBe("api-only");
        expect(
          resolveDataPlane({ platformOs: platform, isLocal: false, autoBackup: false })
        ).toBe("api-only");
      } else {
        expect(
          resolveDataPlane({ platformOs: platform, isLocal: false, autoBackup: true })
        ).toBe("api-only");
        expect(
          resolveDataPlane({ platformOs: platform, isLocal: false, autoBackup: false })
        ).toBe("local-persist");
      }
      // Store-fallback rule: explicit 'false' wins, else profile, else ON.
      expect(isAutoBackupOn("false", true)).toBe(false);
      expect(isAutoBackupOn(null, false)).toBe(false);
      expect(isAutoBackupOn(null, true)).toBe(true);
      expect(isAutoBackupOn(null, undefined)).toBe(true);
    });

    test("ACC-02: api-only writes perform zero entity writes and zero enqueues", async () => {
      mockAuthFetch.mockResolvedValue(okBody({ id: "t1" }));
      const setItemSpy = AsyncStorage.setItem as jest.Mock;

      await apiCreate("transactions", { id: "t1", amount: 5 }, "U");
      await apiUpdate("transactions", "t1", { amount: 6 }, "U");
      await apiDelete("transactions", "t1");
      await apiList("transactions", "U");

      const entityWrites = setItemSpy.mock.calls.filter((c) =>
        String(c[0]).startsWith("user_")
      );
      expect(entityWrites).toHaveLength(0);
      expect(enqueueSpy).not.toHaveBeenCalled();
      expect(mockAuthFetch).toHaveBeenCalled();
    });

    test("ACC-02b: apiOnly module never references the enqueue path", () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "apiOnly.ts"),
        "utf-8"
      );
      expect(content).not.toContain("enqueueSync");
    });

    test("ACC-03: migration fetches first, pushes, then purges; aborts cleanly", async () => {
      const ops: string[] = [];
      const local = {
        transactions: [{ id: "local-only" }, { id: "both" }],
        categories: [],
        dues: [],
        savingsItems: [],
        profile: { name: "a@b.co" },
      };
      const remote = {
        transactions: [{ id: "both" }],
        categories: [],
        dues: [],
        savingsItems: [],
        profile: null,
      };
      const result = await migrateToApiOnly({
        readLocalSnapshot: async () => {
          ops.push("readLocal");
          return local;
        },
        drainOutbox: async () => {
          ops.push("drain");
          await mockDrain();
        },
        fetchRemote: async () => {
          ops.push("fetchRemote");
          return { ok: true, remote };
        },
        uploadEntry: async (entity, item) => {
          ops.push(`post:${entity}:${String(item["id"])}`);
          return true;
        },
        uploadProfile: async () => {
          ops.push("put:profile");
          return true;
        },
        purgeLocal: async () => {
          ops.push("purge");
        },
      });

      expect(result).toEqual({ ok: true });
      expect(mockDrain).toHaveBeenCalledTimes(1);
      // Fetch-then-push order: GET precedes the first POST, purge is last.
      expect(ops.indexOf("fetchRemote")).toBeLessThan(
        ops.indexOf("post:transactions:local-only")
      );
      expect(ops[ops.length - 1]).toBe("purge");
      // Already-on-server id is never re-posted.
      expect(ops).not.toContain("post:transactions:both");
    });

    test("ACC-03b: failed fetch aborts with no purge and no uploads", async () => {
      const ops: string[] = [];
      const result = await migrateToApiOnly({
        readLocalSnapshot: async () => ({
          transactions: [{ id: "t1" }],
          categories: [],
          dues: [],
          savingsItems: [],
          profile: null,
        }),
        drainOutbox: async () => {},
        fetchRemote: async () => {
          ops.push("fetchRemote");
          return {
            ok: false,
            remote: {
              transactions: [],
              categories: [],
              dues: [],
              savingsItems: [],
              profile: null,
            },
          };
        },
        uploadEntry: async () => {
          ops.push("post");
          return true;
        },
        uploadProfile: async () => true,
        purgeLocal: async () => {
          ops.push("purge");
        },
      });
      expect(result.ok).toBe(false);
      expect(ops).toEqual(["fetchRemote"]);
    });

    test("ACC-03c: purge deletes only the entering user's entity keys", async () => {
      await AsyncStorage.setItem("user_U_transactions", "[1]");
      await AsyncStorage.setItem("user_U_settings", "{}");
      await AsyncStorage.setItem("user_OTHER_transactions", "[9]");
      await AsyncStorage.setItem("master_users", "[]");
      await AsyncStorage.setItem("localDeviceId", "dev-1");

      expect(await hasLegacyEntityKeys("U")).toBe(true);
      expect(await hasLegacyEntityKeys("NOBODY")).toBe(false);
      await purgeUserEntityKeys("U");

      await expect(AsyncStorage.getItem("user_U_transactions")).resolves.toBeNull();
      await expect(AsyncStorage.getItem("user_U_settings")).resolves.toBeNull();
      await expect(AsyncStorage.getItem("user_OTHER_transactions")).resolves.toBe("[9]");
      await expect(AsyncStorage.getItem("master_users")).resolves.toBe("[]");
      await expect(AsyncStorage.getItem("localDeviceId")).resolves.toBe("dev-1");
    });

    test("ACC-04: profile normalizer handles array and object shapes", () => {
      const arr = [
        { userId: "other", name: "x" },
        { userId: "U", name: "a@b.co", initialBalance: 15 },
      ];
      expect(normalizeUserProfileResponse(arr, "U")).toEqual(arr[1]);
      expect(
        normalizeUserProfileResponse([{ name: "solo" }], "U")
      ).toEqual({ name: "solo" });
      expect(
        normalizeUserProfileResponse({ userId: "U", name: "obj" }, "U")
      ).toEqual({ userId: "U", name: "obj" });
      expect(normalizeUserProfileResponse([], "U")).toBeNull();
      expect(normalizeUserProfileResponse(null, "U")).toBeNull();
      expect(normalizeUserProfileResponse([{ id: 1 }], "U")).toBeNull();
    });

    test("ACC-09: OFF-while-offline switch performs zero fetch", async () => {
      const g = globalThis as unknown as { fetch?: unknown };
      const originalFetch = g.fetch;
      const fetchSpy = jest.fn().mockRejectedValue(new Error("must not fetch"));
      g.fetch = fetchSpy;
      try {
        const profileCalls: Array<{ autoBackup: boolean }> = [];
        const flagCalls: string[] = [];
        await switchToOfflineMode({
          setProfileFlag: async (v) => {
            profileCalls.push(v);
          },
          setStoredFlag: async (v) => {
            flagCalls.push(v);
          },
        });
        expect(profileCalls).toEqual([{ autoBackup: false }]);
        expect(flagCalls).toEqual(["false"]);
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        g.fetch = originalFetch;
      }
    });

    test("ACC-10: per-user flag read scopes to the given id, missing defaults ON", async () => {
      await AsyncStorage.setItem(
        "user_U_settings",
        JSON.stringify({ autoBackup: "false" })
      );
      setCachedUserId("OTHER");
      await expect(readAutoBackupFlagFor("U")).resolves.toBe(false);
      await expect(readAutoBackupFlagFor("FRESH")).resolves.toBe(true);
      setCachedUserId(null);
    });
  }
);
