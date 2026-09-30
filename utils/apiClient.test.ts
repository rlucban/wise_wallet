jest.mock("./db", () => ({
  API_URL: "http://localhost:3000",
}));

jest.mock("expo-secure-store", () => ({
  __esModule: true,
  isAvailableAsync: async () => false,
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

import { authFetch, setAuthFailureCallback } from "./apiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

const mockFetch = jest.fn();

function res401(body: Record<string, unknown> = {}) {
  return {
    ok: false,
    status: 401,
    headers: { get: () => "" },
    json: async () => body,
    text: async () => "",
  };
}

describe.each(["android", "ios", "web"] as const)("apiClient 401 handling on %s", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(res401());
    (global as unknown as { fetch: unknown }).fetch = mockFetch;
    setAuthFailureCallback(() => {});
    return AsyncStorage.clear();
  });

  // SPEC-38 D-02 — this case asserted the blanket "session_ended" reason, which
  // is the defect (it claimed a kick for every 401). An unrecognised body now
  // fails safe to `auth_failed` and still wipes credentials.
  test("ACC-02a: unsuppressed 401 wipes credentials + fires auth_failed, not a kick claim", async () => {
    await AsyncStorage.setItem("authToken", "tok");
    await AsyncStorage.setItem("activeUserId", "u1");
    const seen: Array<string | undefined> = [];
    setAuthFailureCallback((reason?: string) => {
      seen.push(reason);
    });

    const result = await authFetch("auth/account", { method: "DELETE" });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(seen).toEqual(["auth_failed"]);
    await expect(AsyncStorage.getItem("authToken")).resolves.toBeNull();
    await expect(AsyncStorage.getItem("activeUserId")).resolves.toBeNull();
  });

  test("ACC-38: an expiry 401 reports token_expired, never session_revoked", async () => {
    mockFetch.mockResolvedValue(
      res401({ status: "fail", message: "Your token has expired, please log in again" })
    );
    const seen: Array<string | undefined> = [];
    setAuthFailureCallback((reason?: string) => {
      seen.push(reason);
    });

    await authFetch("transactions");

    expect(seen).toEqual(["token_expired"]);
    expect(seen).not.toContain("session_revoked");
  });

  test("ACC-38: a revocation 401 (post P-04) reports session_revoked", async () => {
    mockFetch.mockResolvedValue(
      res401({ status: "fail", message: "Session ended on another device" })
    );
    const seen: Array<string | undefined> = [];
    setAuthFailureCallback((reason?: string) => {
      seen.push(reason);
    });

    await authFetch("transactions");

    expect(seen).toEqual(["session_revoked"]);
  });

  test("ACC-38: error text comes from `message`, the key this server returns", async () => {
    mockFetch.mockResolvedValue(
      res401({ status: "fail", message: "Invalid token, please log in again" })
    );

    const result = await authFetch("transactions");

    expect(result.error).toBe("Invalid token, please log in again");
  });

  test("ACC-02b: suppressed 401 keeps credentials, fires nothing, returns result", async () => {
    await AsyncStorage.setItem("authToken", "tok");
    await AsyncStorage.setItem("activeUserId", "u1");
    const seen: Array<string | undefined> = [];
    setAuthFailureCallback((reason?: string) => {
      seen.push(reason);
    });

    const result = await authFetch("auth/account", {
      method: "DELETE",
      suppressAuthFailure: true,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(seen).toHaveLength(0);
    await expect(AsyncStorage.getItem("authToken")).resolves.toBe("tok");
    await expect(AsyncStorage.getItem("activeUserId")).resolves.toBe("u1");
  });
});
