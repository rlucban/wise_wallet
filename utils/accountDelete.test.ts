jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA256" },
  digestStringAsync: async (_alg: unknown, s: string) => `sha256:${s}`,
}));

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///docs/",
  readAsStringAsync: async () => "",
  writeAsStringAsync: async () => {},
  deleteAsync: jest.fn(async () => {}),
  EncodingType: { Base64: "base64", UTF8: "utf8" },
}));

import {
  collectReceiptFiles,
  filterQueueKeepOthers,
  isEmailShapedName,
  parseVerifyLoginResponse,
  purgeUserDeviceData,
  resolveDeleteOutcome,
} from "./accountDelete";
import type { SyncQueueItem } from "./syncQueue";
import { getSyncQueue, saveSyncQueue } from "./syncQueue";
import { getItem, setItem } from "./storage";
import { getCachedSetting, setCachedSetting } from "./cache";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const mockDeleteAsync = FileSystem.deleteAsync as unknown as jest.Mock;

function queueItem(
  id: string,
  data?: Record<string, unknown>
): SyncQueueItem {
  return {
    id,
    entity: "transactions",
    operation: "create",
    entityId: id,
    data,
    timestamp: 1,
    retryCount: 0,
  };
}

describe.each(["android", "ios", "web"] as const)("accountDelete on %s", (platform) => {
  beforeEach(() => {
    expect(["android", "ios", "web"]).toContain(platform);
    jest.clearAllMocks();
    return AsyncStorage.clear();
  });

  test("ACC-04/05 arbiter: email-shaped names are server-authoritative", () => {
    expect(isEmailShapedName("user@example.com")).toBe(true);
    expect(isEmailShapedName("  USER@Example.COM  ")).toBe(true);
    expect(isEmailShapedName("john")).toBe(false);
    expect(isEmailShapedName("john doe")).toBe(false);
    expect(isEmailShapedName("not-an-email")).toBe(false);
  });

  test("ACC-01 helper: verify-login body yields fresh credentials", () => {
    expect(
      parseVerifyLoginResponse({ data: { user: { id: "u1" }, token: "jwt-new" } })
    ).toEqual({ userId: "u1", token: "jwt-new" });
    expect(parseVerifyLoginResponse({ data: { user: { id: "u1" } } })).toBeNull();
    expect(parseVerifyLoginResponse({ ok: false })).toBeNull();
    expect(parseVerifyLoginResponse(null)).toBeNull();
  });

  test("ACC-03: success copy only on server confirmation", () => {
    expect(resolveDeleteOutcome(true)).toBe("server");
    expect(resolveDeleteOutcome(false)).toBe("local-only");
  });

  test("receipt collector keeps file:// originals + import copies, skips remote", () => {
    const files = collectReceiptFiles(
      [
        { id: "t1", receiptUrl: "file:///a.jpg" },
        { id: "t2", receiptUrl: "https://cdn/x.jpg" },
        { id: "t3" },
      ],
      "file:///docs/"
    );
    expect(files).toEqual([
      "file:///a.jpg",
      "file:///docs/receipt_t1.jpg",
      "file:///docs/receipt_t2.jpg",
      "file:///docs/receipt_t3.jpg",
    ]);
    expect(collectReceiptFiles([{ id: "t1" }], null)).toEqual([]);
  });

  test("queue filter drops only the deleted user's items", () => {
    const kept = filterQueueKeepOthers(
      [
        queueItem("a", { userId: "U" }),
        queueItem("b", { userId: "other" }),
        queueItem("c"),
      ],
      "U"
    );
    expect(kept.map((i) => i.id)).toEqual(["b", "c"]);
  });

  test("ACC-06/11: purge removes ghosts, queue items, caches, files — preserves others", async () => {
    const email = "gone@example.com";
    await setItem("master_users", [
      { id: "cloud-U", name: email, passcode: "x" },
      { id: "uuid-ghost", name: email, passcode: "x" },
      { id: "other", name: "stays", passcode: "x" },
    ]);
    await setItem("user_cloud-U_profile", { name: email });
    await setItem("user_cloud-U_transactions", [{ id: "t1" }]);
    await setItem("user_other_transactions", [{ id: "t9" }]);
    await saveSyncQueue([
      queueItem("u-item", { userId: "cloud-U" }),
      queueItem("o-item", { userId: "other" }),
      queueItem("legacy"),
    ]);
    await AsyncStorage.setItem("last_synced_at", "123");
    await AsyncStorage.setItem("localDeviceId", "dev-1");
    setCachedSetting("autoBackup", "true");

    const result = await purgeUserDeviceData(
      "cloud-U",
      [{ id: "t1", receiptUrl: "file:///r.jpg" }],
      "file:///docs/"
    );

    // ghosts gone (both rows sharing the name), other user intact
    const users = await getItem<Array<{ id: string; name: string }>>("master_users", []);
    expect(users.map((u) => u.id)).toEqual(["other"]);
    // per-user keys gone
    await expect(getItem("user_cloud-U_transactions", null)).resolves.toBeNull();
    await expect(getItem("user_cloud-U_profile", null)).resolves.toBeNull();
    // other user's keys intact
    await expect(getItem("user_other_transactions", null)).resolves.toEqual([{ id: "t9" }]);
    // queue: U's item gone, other's + legacy kept
    const queue = await getSyncQueue();
    expect(queue.map((i) => i.id).sort()).toEqual(["legacy", "o-item"]);
    // timestamp + caches reset, device id preserved
    await expect(AsyncStorage.getItem("last_synced_at")).resolves.toBeNull();
    expect(getCachedSetting("autoBackup")).toBeUndefined();
    await expect(AsyncStorage.getItem("localDeviceId")).resolves.toBe("dev-1");
    // receipt files deleted (original + import copy)
    expect(mockDeleteAsync).toHaveBeenCalledWith("file:///r.jpg", { idempotent: true });
    expect(mockDeleteAsync).toHaveBeenCalledWith("file:///docs/receipt_t1.jpg", {
      idempotent: true,
    });
    expect(result.deletedFiles).toBe(2);
  });
});
