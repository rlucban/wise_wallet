import { authFetch } from "./apiClient";

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