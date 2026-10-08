import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function runSuite(os: "android" | "ios" | "web"): void {
    describe(`SPEC-69 custom floating tab bar on ${os}`, () => {
        it("ACC-01: every tab screen leaves bottom clearance", () => {
            expect(readRepo("app/(tabs)/index.tsx")).toContain("paddingBottom: 110");
            expect(readRepo("app/(tabs)/settings.tsx")).toContain("paddingBottom: 110");
            expect(readRepo("app/(tabs)/reports.tsx")).toContain("paddingBottom: 110");
            expect(readRepo("app/(tabs)/learning.tsx")).toContain("paddingBottom: 110");
        });

        it("ACC-02: pill interior spacing + active-pill styling", () => {
            const bar = readRepo("components/FloatingTabBar.tsx");
            expect(bar).toContain("gap: 4");
            expect(bar).toContain("paddingHorizontal: 10");
            expect(bar).toContain("paddingVertical: 8");
            expect(bar).toContain('backgroundColor: "#E8DEF8"');
            expect(bar).toContain("borderRadius: 20");
            expect(bar).toContain("paddingHorizontal: 4");
            expect(bar).toContain("numberOfLines={1}");
            expect(bar).toContain("fontSize: 11");
        });

        it("ACC-03: FAB docked beside the pill in a row", () => {
            const bar = readRepo("components/FloatingTabBar.tsx");
            expect(bar).toContain('flexDirection: "row"');
            expect(bar).toContain('alignItems: "center"');
            expect(bar).toContain("gap: 12");
            expect(bar).toContain("<FAB");
        });

        it("ACC-04: layout delegates to FloatingTabBar; old bar styling gone", () => {
            const layout = readRepo("app/(tabs)/_layout.tsx");
            expect(layout).toContain("FloatingTabBar");
            expect(layout).toContain("tabBar={(props) => <FloatingTabBar");
            expect(layout).not.toContain("tabBarStyle");
            expect(layout).not.toContain("tabBarButton");
            expect(layout).not.toContain("AnimatedTabButton");
            expect(layout).not.toContain("useSafeAreaInsets");
        });

        it("ACC-05: tab titles, icons, and hidden route preserved", () => {
            const layout = readRepo("app/(tabs)/_layout.tsx");
            expect(layout).toContain('title: "Home"');
            expect(layout).toContain('title: "Reports"');
            expect(layout).toContain('title: "Learning"');
            expect(layout).toContain('title: "Settings"');
            expect(layout).toContain('name="home-variant"');
            expect(layout).toContain('name="chart-bar"');
            expect(layout).toContain('name="school"');
            expect(layout).toContain('name="cog"');
            expect(layout).toContain("href: null");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
