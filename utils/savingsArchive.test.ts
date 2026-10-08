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

    it("G5 (defect pin): updateItem catch swallows — no rethrow, so failure still toasts success", () => {
      const src = readRepo("hooks/useSavings.ts");
      // Present today: log-only catch. The future fix inverts this test to require a throw.
      expect(src).toContain('console.error("Error updating savings item:", error);');
      const updateBlock = src.slice(src.indexOf("const updateItem"));
      expect(updateBlock).not.toMatch(/catch \(error\) \{\s*console\.error\([^;]*;\s*throw error;/);
    });

    it("G6: web sends the flag but replaces state verbatim on refetch (drop reverts optimism)", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(src).toContain("body: JSON.stringify({ ...updates, userId: activeUserId })");
      expect(src).toContain("setItems(remoteData);");
    });
  });
}

runSuite("android");
runSuite("ios");
runSuite("web");
