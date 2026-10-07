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

function runSuite(os: "android" | "ios" | "web") {
    describe(`floating pill tab bar on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: layout wires the custom tabBar prop", () => {
            const source = readRepo("app/(tabs)/_layout.tsx");
            expect(source).toContain("tabBar={FloatingTabBar}");
            expect(source).toContain("FloatingTabBar");
        });

        it("ACC-02: active tab resolves from navigation state by route key", () => {
            const source = readRepo("components/FloatingTabBar.tsx");
            expect(source).toContain("state.routes[state.index]");
            expect(source).toContain("route.key === focusedKey");
            expect(source).toContain('route.name !== "learning-detail"');
            expect(source).toContain("<FloatingTabBarThemed");
        });

        it("ACC-03: single + wire to the add-transaction route", () => {
            const source = readRepo("components/FloatingTabBar.tsx");
            const hits = source.match(/router\.push\("\/add-transaction"\)/g) ?? [];
            expect(hits.length).toBe(1);
        });

        it("ACC-04: tab icon names unchanged", () => {
            const source = readRepo("components/FloatingTabBar.tsx");
            for (const icon of ["home-variant", "chart-bar", "school", "cog"]) {
                expect(source).toContain(`"${icon}"`);
            }
        });

        it("ACC-05: no new dependency or native-only import", () => {
            const source = readRepo("components/FloatingTabBar.tsx");
            expect(source).not.toContain("NativeModules");
            expect(source).not.toContain("require(");
            expect(readRepo("package.json")).not.toContain("@react-navigation/bottom-tabs");
        });

        it("ACC-07: Home in-screen FAB gone; tab bar + is the sole trigger", () => {
            const source = readRepo("app/(tabs)/index.tsx");
            expect(source).not.toContain("FAB");
            expect(source).not.toContain("add-transaction");
        });

        it("SPEC-53 v1.1 ACC-11: floating pill back, in-flow, zero overlay", () => {
            const source = readRepo("components/FloatingTabBar.tsx");
            expect(source).toContain("maxWidth: 560");
            expect(source).toContain("CONTAINER_RADIUS");
            expect(source).toContain("boxShadow");
            expect(source).not.toContain("position:");
            expect(source).not.toContain('"absolute"');
            expect(source).not.toContain("bottom:");
            expect(source).not.toContain("borderTopWidth");
            const plusHits = source.match(/router\.push\("\/add-transaction"\)/g) ?? [];
            expect(plusHits.length).toBe(1);
        });

        it("SPEC-53 v1.1 + wire: separate circular button right of the pill", () => {
            const source = readRepo("components/FloatingTabBar.tsx");
            const hits = source.match(/router\.push\("\/add-transaction"\)/g) ?? [];
            expect(hits.length).toBe(1);
            expect(source).toContain("marginLeft: 12");
            expect(source).not.toContain("marginRight");
        });

        it("SPEC-53 v1.1 tokens intact: icons, imports, SPEC-32 offset", () => {
            const source = readRepo("components/FloatingTabBar.tsx");
            for (const icon of ["home-variant", "chart-bar", "school", "cog"]) {
                expect(source).toContain(`"${icon}"`);
            }
            expect(source).not.toContain("NativeModules");
            expect(source).not.toContain("require(");
            expect(source).toContain("getTabBarMetrics");
            expect(source).toContain("metrics.paddingBottom");
            expect(source).toContain("PILL_RADIUS");
        });

        it("SPEC-53 v1.2 ACC-12: taller bar, everything else intact", () => {
            const source = readRepo("components/FloatingTabBar.tsx");
            const tallPads = source.match(/paddingVertical: 12/g) || [];
            expect(tallPads).toHaveLength(2);
            expect(source).not.toMatch(/paddingVertical: 8/);
            expect(source).toContain("size={22}");
            expect(source).toContain("fontSize: 12");
            expect(source).toContain("maxWidth: 560");
            expect(source).toContain("PILL_RADIUS");
        });

        it("SPEC-53 v1.4 ACC-16: surface bar + transparent active (supersedes v1.3 ACC-14)", () => {
            const source = readRepo("components/FloatingTabBar.tsx");
            expect(source).toContain("backgroundColor: theme.colors.surface");
            expect(source).not.toContain("backgroundColor: theme.colors.primary");
            expect(source).toContain('backgroundColor: "transparent"');
            expect(source).not.toContain("theme.colors.primaryContainer");
            expect(source).toContain("theme.colors.onSurfaceVariant");
            expect(source).toContain("focused ? theme.colors.primary :");
            expect(source).toContain("containerColor={theme.colors.primary}");
            expect(source).toContain("iconColor={theme.colors.onPrimary}");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
