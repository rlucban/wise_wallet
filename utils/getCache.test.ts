import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function runSuite(os: "android" | "ios" | "web"): void {
    describe(`SPEC-62 GET memoization on ${os}`, () => {
        it("ACC-62-01: TTL, keys, ok-only store, lazy expiry, cap", () => {
            const client = readRepo("utils/apiClient.ts");
            expect(client).toContain("GET_CACHE_TTL_MS = 60_000");
            expect(client).toContain("GET_CACHE_MAX_ENTRIES = 50");
            // Endpoint-alone keys (SPEC-59 rotates tokens — token keys never hit).
            expect(client).toContain("const cacheKey = formattedEndpoint;");
            expect(client).not.toContain("cacheKey = `${formattedEndpoint}${token}");
            // Ok-only store; 401s never populate.
            expect(client).toContain('method === "GET" && response.ok');
            // Lazy expiry — no timers (open-handle leak class).
            expect(client).not.toMatch(/setTimeout|setInterval/);
            expect(client).toContain("Date.now() - entry.at");
            expect(client).toContain("export function invalidateGetCache");
            expect(client).toContain("export function wipeGetCache");
        });

        it("ACC-62-02: invalidate on mutation, wipe on auth change, skip bypasses", () => {
            const client = readRepo("utils/apiClient.ts");
            expect(client).toContain("invalidateGetCache(firstSegment(formattedEndpoint))");
            expect(client).toContain("skipCache?: boolean");
            expect(client).toContain("!opts.skipCache");
            const auth = readRepo("context/AuthContext.tsx");
            expect((auth.match(/wipeGetCache\(\);/g) ?? []).length).toBe(2);
            const dues = readRepo("app/dues.tsx");
            expect(dues).toContain("onRefresh={() => refetch({ skipCache: true })}");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
