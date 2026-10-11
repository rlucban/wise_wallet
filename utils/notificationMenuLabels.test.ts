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

const SCREEN = "app/notifications.tsx";

function menuBlock(source: string): string {
    const start = source.indexOf("<Menu");
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf("</Menu>", start);
    expect(end).toBeGreaterThan(start);
    return source.slice(start, end);
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`notification menu labels on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: exactly two relabeled items, no Dues, no old labels", () => {
            const menu = menuBlock(readRepo(SCREEN));
            expect(menu.match(/<Menu\.Item/g) ?? []).toHaveLength(2);
            expect(menu).toContain('title="Read all alerts"');
            expect(menu).toContain('title="Clear all alerts"');
            expect(menu.indexOf('title="Read all alerts"')).toBeLessThan(
                menu.indexOf('title="Clear all alerts"')
            );
            expect(menu).not.toContain("Manage Dues");
            expect(menu).not.toContain("Mark All System Alerts as Read");
            expect(menu).not.toContain("Clear System Alerts");
        });

        it("ACC-02: handlers intact behind the new labels", () => {
            const menu = menuBlock(readRepo(SCREEN));
            expect(menu).toMatch(/setMenuVisible\(false\);\s+markAllAsRead\(\)/);
            expect(menu).toMatch(/setMenuVisible\(false\);\s+clearAlerts\(\)/);
        });

        it("ACC-03: router stays referenced elsewhere; menu Platform-free", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("useRouter");
            expect(source).toContain("const router = useRouter();");
            expect(source.match(/router\.push\("\/dues"\)/g) ?? []).toHaveLength(2);
            expect(source).toContain("safeGoBack(router)");
            expect(menuBlock(source)).not.toMatch(/Platform/);
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
