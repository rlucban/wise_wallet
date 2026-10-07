import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function runSuite(os: "android" | "ios" | "web"): void {
    describe(`SPEC-60 dues/savings-aware insights on ${os}`, () => {
        it("ACC-60-01: memo gate includes dues + savings fingerprints", () => {
            const hook = readRepo("hooks/useInsights.ts");
            // Same join pattern as txKey; deps are strings, never identity.
            expect(hook).toContain("const duesKey = useMemo(");
            expect(hook).toContain("const savingsKey = useMemo(");
            expect(hook).toContain("d.updatedAt");
            expect(hook).toContain("s.balance");
            expect(hook).toContain("[txKey, duesKey, savingsKey, formatAmount]");
            // SPEC-50 refs architecture intact (reads still via refs).
            expect(hook).toContain("savingsRef.current");
            expect(hook).toContain("duesRef.current");
        });

        it("ACC-60-02: dues focus-refetch + pull-to-refresh wired", () => {
            const screen = readRepo("app/dues.tsx");
            expect(screen).toContain("useFocusEffect");
            expect(screen).toContain("refetch();");
            expect(screen).toContain("refreshing={loading}");
            expect(screen).toContain("onRefresh={refetch}");
            const dues = readRepo("hooks/useDues.ts");
            expect(dues).toContain("refetch: fetchDues");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
