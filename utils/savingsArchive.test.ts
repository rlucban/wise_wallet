import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockOS;
    },
  },
}));

function count(src: string, re: RegExp): number {
  return (src.match(re) || []).length;
}

function runSuite(os: "android" | "ios" | "web") {
  describe(`allocation archive guards on ${os}`, () => {
    beforeEach(() => {
      mockOS = os;
    });

    it("G1: archive action persists via updateItem with isArchived:true", () => {
      const src = readRepo("app/savings.tsx");
      expect(count(src, /await updateItem\(id, \{ isArchived: true \}\);/g)).toBe(1);
      expect(src).toContain('setToastMessage("Allocation archived")');
    });

    it("G2: restore action persists via updateItem with isArchived:false", () => {
      const src = readRepo("app/archived-allocations.tsx");
      expect(count(src, /await updateItem\(id, \{ isArchived: false \}\);/g)).toBe(1);
    });

    it("G3: active vs archived lists partition on isArchived", () => {
      expect(readRepo("app/savings.tsx")).toContain("items.filter((item) => !item.isArchived)");
      expect(readRepo("app/archived-allocations.tsx")).toContain("items.filter((item) => !!item.isArchived)");
    });

    it("G4: updateItem merges optimistically on both web and native paths", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(
        count(src, /setItems\(\(prev\) => prev\.map\(\(g\) => \(g\.id === id \? \{ \.\.\.g, \.\.\.updates \} : g\)\)\);/g)
      ).toBe(2);
    });

    it("G5 (SPEC-73 CON-06): updateItem rethrows after logging — failures surface, no false success toast", () => {
      const src = readRepo("hooks/useSavings.ts");
      const updateBlock = src.slice(src.indexOf("const updateItem"));
      expect(updateBlock).toMatch(
        /catch \(error\) \{\s*console\.error\("Error updating savings item:", error\);\s*throw error;\s*\}/
      );
    });

    it("G6 (SPEC-73 CON-04): updateItem syncs a full record, never a partial { ...updates } body", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(src).not.toContain("body: JSON.stringify({ ...updates, userId: activeUserId })");
      expect(src).not.toContain("const syncData = { ...updates, userId: activeUserId };");
      expect(count(src, /updatedAt: current\?\.updatedAt \|\| nowTimestamp\(\)/g)).toBeGreaterThanOrEqual(1);
      expect(count(src, /updatedAt: existing\?\.updatedAt \|\| nowTimestamp\(\)/g)).toBeGreaterThanOrEqual(1);
    });

    it("G7 (SPEC-73 CON-06): syncProcessor surfaces savingsItems 400/404 instead of silent dequeue", () => {
      const src = readRepo("utils/syncProcessor.ts");
      expect(count(src, /item\.entity === 'savingsItems'/g)).toBe(2);
      expect(
        count(src, /return \{ success: false, error: apiResult\.error \|\| `HTTP \$\{apiResult\.status\}` \};/g)
      ).toBeGreaterThanOrEqual(2);
      expect(count(src, /return \{ success: true \};/g)).toBeGreaterThanOrEqual(2); // other entities keep dequeue-on-400/404
    });

    it("G8 (SPEC-73 CON-05): native LWW merge preserves local isArchived / target_amount the remote omits", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(count(src, /remoteItem\.isArchived === undefined/g)).toBe(1);
      expect(count(src, /remoteItem\.target_amount === undefined/g)).toBe(1);
    });

    it("G9 (SPEC-73 CON-05): web refetch applies the field-union guard — no verbatim state replace", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(src).not.toContain("setItems(remoteData);");
      expect(count(src, /remote\.isArchived === undefined \? local\.isArchived/g)).toBe(1);
      expect(count(src, /remote\.target_amount === undefined \? local\.target_amount/g)).toBe(1);
      expect(src).toContain("setItems(guarded);");
    });

    it("G10 (SPEC-74 CON-01): add/update/delete write through itemsRef + _savingsCache", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(count(src, /_savingsCache = \{ userId: activeUserId, items: itemsRef\.current \};/g)).toBe(6);
      expect(count(src, /itemsRef\.current = \[\.\.\.itemsRef\.current, newItem\];/g)).toBe(2);
      expect(count(src, /itemsRef\.current = itemsRef\.current\.map/g)).toBe(2);
      expect(count(src, /itemsRef\.current = itemsRef\.current\.filter/g)).toBe(2);
    });

    it("G11 (SPEC-75 ACC-01/ACC-02): module notifier re-seeds mounted instances from the shared cache", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(count(src, /notifySavingsCacheChanged\(\);/g)).toBe(6);
      expect(count(src, /const _savingsCacheListeners = new Set<\(\) => void>\(\);/g)).toBe(1);
      expect(count(src, /_savingsCacheListeners\.forEach\(\(l\) => l\(\)\);/g)).toBe(1);
      expect(count(src, /_savingsCacheListeners\.add\(listener\);/g)).toBe(1);
      expect(count(src, /_savingsCacheListeners\.delete\(listener\);/g)).toBe(1);
      expect(src).toMatch(
        /if \(_savingsCache\?\.userId === activeUserId\) \{\s*itemsRef\.current = _savingsCache\.items;\s*setItems\(_savingsCache\.items\);\s*\}/
      );
    });
  });
}

runSuite("android");
runSuite("ios");
runSuite("web");
