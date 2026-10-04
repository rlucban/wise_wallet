import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function sliceFunction(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("SPEC-36 web invariants (source-text guards)", () => {
  describe("ACC-W-01 (pinned Online)", () => {
    it("NetworkContext skips the probe on web at both levels", () => {
      const source = readRepo("context/NetworkContext.tsx");
      const hits = source.match(/Platform\.OS === "web"/g) ?? [];
      expect(hits.length).toBeGreaterThanOrEqual(2);
      expect(source).toContain("pinned Online");
    });

    it("OfflineIndicator returns null on web", () => {
      const source = readRepo("app/_layout.tsx");
      expect(source).toContain('if (Platform.OS === "web")');
    });

    it("settings Offline text, card color, and Check button are web-guarded", () => {
      const source = readRepo("app/(tabs)/settings.tsx");
      const hits = source.match(/!isOnline && Platform\.OS !== "web"/g) ?? [];
      expect(hits.length).toBe(3);
    });

    it("login offline strip is web-gated", () => {
      const source = readRepo("app/login.tsx");
      expect(source).toContain('offlineNotice && Platform.OS !== "web"');
    });
  });

  describe("ACC-W-02 (never Local + force-migrate)", () => {
    it("register forces online and hard-blocks local creation on web", () => {
      const source = readRepo("app/register.tsx");
      expect(source).toContain('isWeb ? "online" : accountMode');
      expect(source).toContain("Local-only accounts cannot be created on web");
    });

    it("legacy web local logins route into migration", () => {
      const source = readRepo("app/login.tsx");
      expect(source).toContain("handleLegacyLocalAuth");
      expect(source).toContain("Online Upgrade Required");
      expect(source).toContain('router.replace("/(tabs)/settings")');
    });
  });

  describe("ACC-W-03 (full API-direct on web)", () => {
    const providers = [
      "context/TransactionsContext.tsx",
      "context/CategoriesContext.tsx",
      "hooks/useSavings.ts",
      "hooks/useDues.ts",
      "context/UserProfileContext.tsx",
    ];

    it.each(providers)("%s branches on web with direct API calls", (file) => {
      const source = readRepo(file);
      expect(source).toContain('Platform.OS === "web"');
      expect(source).toContain("authFetch(");
    });

    it("web writers fail openly with connection copy", () => {
      for (const file of providers) {
        expect(readRepo(file)).toContain("Please check your connection.");
      }
    });

    it("alerts persist to session memory on web, never storage", () => {
      const source = readRepo("utils/notifications.ts");
      expect(source).toContain("webAlertStore");
      expect(source).toContain("clearWebAlertStoreForTests");
    });

    it("no local seeding on web auth paths", () => {
      expect(readRepo("app/login.tsx")).toContain('if (Platform.OS !== "web")');
      expect(readRepo("app/register.tsx")).toContain("isWeb ? [] :");
    });

    it("no local seeding at startup on web", () => {
      expect(readRepo("app/_layout.tsx")).toContain("no local seeding on web");
    });
  });

  describe("ACC-W-04 (caller conformance)", () => {
    it("verifyPinForSync always attempts the endpoint with no offline gate", () => {
      const source = readRepo("app/(tabs)/settings.tsx");
      const fn = sliceFunction(source, "const verifyPinForSync", "const proceedWithBackupEnable");
      expect(fn).toContain("fetch(`${API_URL}/auth/login`");
      expect(fn).not.toContain("isOnline");
      expect(fn).not.toContain("Offline");
    });
  });

  describe("SPEC-30 v2.2 (web refresh keeps session)", () => {
    it("ACC-W-05: ColdStartSessionGuard effect returns on web before the latch and logout", () => {
      const source = readRepo("app/_layout.tsx");
      const guard = sliceFunction(source, "function ColdStartSessionGuard()", "// SPEC-36");
      expect(guard).toContain('if (Platform.OS === "web") return;');
      const webCheck = guard.indexOf('if (Platform.OS === "web") return;');
      expect(webCheck).toBeLessThan(guard.indexOf("clearedRef.current = true;"));
      expect(webCheck).toBeLessThan(guard.indexOf("logout();"));
      // no component-level early return above the hooks (react-hooks/rules-of-hooks)
      expect(guard).not.toContain("return null; //");
    });
  });
});
