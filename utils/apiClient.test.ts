import { authFetch, resetAuthSessionWarningLatch, setAuthFailureCallback } from "./apiClient";

const mockGetSecureItem = jest.fn<Promise<string | null>, []>();
jest.mock("./secureStorage", () => ({
    getSecureItem: () => mockGetSecureItem(),
    removeSecureItem: jest.fn<Promise<void>, []>(),
}));
jest.mock("./db", () => ({ API_URL: "https://api.test/api" }));

let mockFetch: jest.Mock;

function respondWith(body: unknown, status = 200) {
    mockFetch.mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        // Matches the DOM signature `json(): Promise<any>` — typing it as
        // `Promise<unknown>` makes `body = await response.json()` in
        // apiClient.ts fail TS2322 (`unknown` → `Record<string, unknown>`).
        json: async (): Promise<any> => body,
        text: async (): Promise<string> => JSON.stringify(body),
    });
}

beforeEach(() => {
    mockFetch = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = mockFetch;
    mockGetSecureItem.mockResolvedValue("token");
});

describe("SPEC-40 envelope unwrap", () => {
    it.each(["transactions", "categories", "dues", "savingsItems"])(
        "ACC-01: unwraps data.%s", async (key) => {
            const payload = [{ id: "1" }];
            respondWith({ status: "success", results: 1, data: { [key]: payload } });
            const { ok, data } = await authFetch(`/${key}`);
            expect(ok).toBe(true);
            expect(data).toEqual(payload);
        }
    );

    it("ACC-02: unwraps data.profile", async () => {
        const profile = { id: "p1", isFirstRun: false, name: "Nina" };
        respondWith({ status: "success", data: { profile } });
        const { data } = await authFetch("/userProfiles");
        expect(data).toEqual(profile);
    });

    it("ACC-03: leaves storage/upload {url} untouched", async () => {
        const body = { status: "success", data: { url: "https://cdn/x.jpg" } };
        respondWith(body);
        const { data } = await authFetch("/storage/upload");
        expect(data).toEqual({ url: "https://cdn/x.jpg" });
    });

    it("ACC-04: does not unwrap an unknown wrapper key", async () => {
        const body = { status: "success", data: { payments: [{ id: "1" }] } };
        respondWith(body);
        const { data } = await authFetch("/payments");
        expect(data).toEqual({ payments: [{ id: "1" }] });
    });

    it("ACC-05: leaves non-success bodies and multi-key payloads unchanged", async () => {
        respondWith({ status: "error", message: "nope" });
        expect((await authFetch("/x")).data).toEqual({ status: "error", message: "nope" });

        const multi = { status: "success", data: { a: 1, b: 2 } };
        respondWith(multi);
        // The envelope's `data` is extracted (pre-existing behavior), then the
        // 2-key payload is left intact by the single-key guard (ACC-04).
        expect((await authFetch("/x")).data).toEqual({ a: 1, b: 2 });
    });

    it("ACC-03b: returns a bare array as-is", async () => {
        respondWith({ status: "success", data: [{ id: "1" }] });
        expect((await authFetch("/x")).data).toEqual([{ id: "1" }]);
    });
});

describe("SPEC-43 / T-05 error message fallback", () => {
    it("prefers body.error when present", async () => {
        respondWith({ status: "error", error: "boom", message: "nope" }, 400);
        const res = await authFetch("/transactions/1");
        expect(res.ok).toBe(false);
        expect(res.status).toBe(400);
        expect(res.error).toBe("boom");
    });

    it("falls back to body.message (server shape) before HTTP status", async () => {
        respondWith({ status: "error", message: "Transaction validation failed: paymentMethod min(1)" }, 400);
        const res = await authFetch("/transactions/1");
        expect(res.ok).toBe(false);
        expect(res.error).toContain("paymentMethod");
    });

    it("falls back to HTTP status when neither field exists", async () => {
        respondWith({ status: "error" }, 400);
        const res = await authFetch("/transactions/1");
        expect(res.error).toBe("HTTP 400");
    });

    it("leaves non-JSON bodies unchanged", async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 400,
            json: async (): Promise<any> => { throw new Error("bad json"); },
            text: async (): Promise<string> => "Bad Request",
        });
        const res = await authFetch("/transactions/1");
        expect(res.error).toContain("Non-JSON response");
    });
});

describe("SPEC-44 / 401 warning dedupe", () => {
    let warnSpy: jest.SpyInstance;
    beforeEach(() => {
        resetAuthSessionWarningLatch();
        warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterEach(() => warnSpy.mockRestore());

    it.each(["android", "ios", "web"])(
        "ACC-01: first 401 warns, immediate second 401 stays silent (%s)",
        async () => {
            respondWith({ status: "error", message: "unauthorized" }, 401);
            await authFetch("/a");
            await authFetch("/b");
            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(warnSpy).toHaveBeenCalledWith(
                "401 Unauthorized - clearing auth credentials"
            );
        }
    );

    it.each(["android", "ios", "web"])(
        "ACC-02: after latch reset, the next 401 warns again (%s)",
        async () => {
            respondWith({ status: "error", message: "unauthorized" }, 401);
            await authFetch("/a");
            resetAuthSessionWarningLatch();
            await authFetch("/b");
            expect(warnSpy).toHaveBeenCalledTimes(2);
        }
    );

    it.each(["android", "ios", "web"])(
        "ACC-03: side effects (credential clear + auth failure) fire on every 401 (%s)",
        async () => {
            const onAuthFailure = jest.fn();
            setAuthFailureCallback(onAuthFailure);
            const secure = jest.requireMock("./secureStorage") as {
                removeSecureItem: jest.Mock;
            };
            respondWith({ status: "error", message: "unauthorized" }, 401);
            await authFetch("/a");
            await authFetch("/b");
            expect(onAuthFailure).toHaveBeenCalledTimes(2);
            expect(onAuthFailure).toHaveBeenCalledWith("session_ended");
            expect(secure.removeSecureItem).toHaveBeenCalledTimes(2);
            setAuthFailureCallback(() => {});
        }
    );
});