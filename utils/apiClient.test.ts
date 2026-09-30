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

function res401() {
  return {
    ok: false,
    status: 401,
    headers: { get: () => "" },
    json: async () => ({}),
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

  test("ACC-02a: unsuppressed 401 wipes credentials + fires session_ended", async () => {
    await AsyncStorage.setItem("authToken", "tok");
    await AsyncStorage.setItem("activeUserId", "u1");
    const seen: Array<string | undefined> = [];
    setAuthFailureCallback((reason?: string) => {
      seen.push(reason);
    });

    const result = await authFetch("auth/account", { method: "DELETE" });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(seen).toEqual(["session_ended"]);
    await expect(AsyncStorage.getItem("authToken")).resolves.toBeNull();
    await expect(AsyncStorage.getItem("activeUserId")).resolves.toBeNull();
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
