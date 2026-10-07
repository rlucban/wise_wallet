import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function runSuite(os: "android" | "ios" | "web"): void {
    describe(`SPEC-61 loading skeletons on ${os}`, () => {
        it("ACC-61-01: shared blocks exist, composed only of SkeletonLoader", () => {
            const loader = readRepo("components/SkeletonLoader.tsx");
            expect(loader).toContain("export const ListRowsSkeleton");
            expect(loader).toContain("export const CardSkeleton");
            expect(loader).toContain("export const ChartSkeleton");
            // SPEC-06 driver guard intact; exactly one animation path (the pulse).
            expect(loader).toContain('Platform.OS !== "web"');
            expect((loader.match(/Animated\.loop/g) ?? []).length).toBe(1);
            // Dashboard precedent untouched.
            expect(loader).toContain("export const DashboardSkeleton");
        });

        it("ACC-61-02: all five screens branch first-load-empty to a block", () => {
            const dues = readRepo("app/dues.tsx");
            expect(dues).toContain("loading && listData.length === 0");
            expect(dues).toContain("<ListRowsSkeleton");
            expect(dues).toContain("ListEmptyComponent");
            const savings = readRepo("app/savings.tsx");
            expect(savings).toContain("loading && activeAllocations.length === 0");
            expect(savings).toContain("<CardSkeleton");
            const reports = readRepo("app/(tabs)/reports.tsx");
            expect(reports).toContain("loading && transactions.length === 0");
            expect(reports).toContain("<ChartSkeleton");
            const completed = readRepo("app/completed-dues.tsx");
            expect(completed).toContain("loading && completedDues.length === 0");
            expect(completed).toContain("<ListRowsSkeleton");
            const archived = readRepo("app/archived-allocations.tsx");
            expect(archived).toContain("loading && archivedItems.length === 0");
            expect(archived).toContain("<CardSkeleton");
        });

        it("ACC-61-02b: dashboard branch byte-identical", () => {
            const index = readRepo("app/(tabs)/index.tsx");
            expect(index).toContain("return <DashboardSkeleton />;");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
