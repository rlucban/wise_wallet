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

const SCREEN = "app/completed-dues.tsx";

function runSuite(os: "android" | "ios" | "web") {
    describe(`completed dues overall list v1.1 on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-04: no segments, no filter state, sorted-all list", () => {
            const source = readRepo(SCREEN);
            expect(source).not.toContain("SegmentedButtons");
            expect(source).not.toContain("setFilter");
            expect(source).not.toContain("This Week");
            expect(source).not.toContain("This Month");
            expect(source).toContain("dues.filter((d) => d.completed).sort(");
            expect(source).toContain("TOTAL COMPLETED");
            expect(source).not.toContain("TOTAL COMPLETED (");
        });

        it("ACC-05: no orphaned machinery; live overall total", () => {
            const source = readRepo(SCREEN);
            expect(source).not.toContain("startOfWeek");
            expect(source).not.toContain("startOfMonth");
            expect(source).not.toContain("endOfWeek");
            expect(source).not.toContain("endOfMonth");
            expect(source).not.toContain("useState");
            expect(source).toContain("totalCompletedAmount");
        });

        it("ACC-06: sort, skeleton, refresh, rows, empty intact; no Platform branch", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("new Date(b.date).getTime() - new Date(a.date).getTime()");
            expect(source).toContain("loading && completedDues.length === 0");
            expect(source).toContain("<ListRowsSkeleton");
            expect(source).toContain("onRefresh={refetch}");
            expect(source).toContain("No completed dues");
            expect(source).not.toContain("Platform");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
