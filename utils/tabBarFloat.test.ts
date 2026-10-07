import * as fs from "fs";
import * as path from "path";
import { getTabBarMetrics } from "./tabBarMetrics";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function runSuite(os: "android" | "ios" | "web"): void {
    describe(`SPEC-52 floating tab bar on ${os}`, () => {
        it("ACC-01: pill geometry, overlay, SPEC-32 values intact", () => {
            const layout = readRepo("app/(tabs)/_layout.tsx");
            expect(layout).toContain("marginHorizontal: 16");
            expect(layout).toContain("marginBottom: 32");
            expect(layout).toContain("borderTopWidth: 0");
            expect(layout).not.toContain("borderTopColor");
            // SPEC-56: overlay (reverses the old in-flow rule).
            expect(layout).toContain('position: "absolute"');
            const positions = layout.match(/position: "absolute"/g) ?? [];
            expect(positions.length).toBe(1);
            // SPEC-32 metric wiring untouched.
            expect(layout).toContain("useSafeAreaInsets()");
            expect(layout).toContain("getTabBarMetrics(insets.bottom)");
            expect(layout).toContain("tabBarLabelStyle");
            expect(layout).toContain("fontSize: 12");
        });

        it("ACC-03: platform shadow selection, web emits no shadow props", () => {
            const layout = readRepo("app/(tabs)/_layout.tsx");
            expect(layout).toContain("Platform.select({");
            expect(layout).toContain("shadowColor");
            expect(layout).toContain("shadowRadius: 16");
            expect(layout).toContain("shadowOpacity: 0.25");
            expect(layout).toContain("height: 6");
            expect(layout).toContain("elevation: 8");
            expect(layout).toContain("default: {},");
            expect(layout).not.toContain("boxShadow");
        });

        it("ACC-11: eased press, JS driver, a11y passthrough", () => {
            const layout = readRepo("app/(tabs)/_layout.tsx");
            expect(layout).toContain("tabBarButton:");
            expect(layout).toContain("AnimatedTabButton");
            expect(layout).toContain("Animated.timing");
            expect(layout).toContain("Easing.out(Easing.quad)");
            expect(layout).toContain("useNativeDriver: false");
            expect(layout).toContain("dip(0.85, 120)");
            expect(layout).toContain("dip(1, 180)");
            // Library-faithful passthrough (BottomTabBarButtonProps shape).
            expect(layout).toContain("testID={testID}");
            expect(layout).toContain("role={role}");
            expect(layout).toContain("aria-label={ariaLabel}");
            expect(layout).toContain("style={style}");
        });

        it("ACC-12: dark pill uses the M3-baseline lift literal, theme file untouched", () => {
            const layout = readRepo("app/(tabs)/_layout.tsx");
            expect(layout).toContain(
                'theme.dark ? "#2B2930" : theme.colors.surface'
            );
            expect(layout).not.toContain("isDarkMode");
            const theme = readRepo("context/ThemeContext.tsx");
            expect(theme).toContain("...MD3DarkTheme");
            expect(theme).toContain("...MD3LightTheme");
        });

        it("ACC-13: capsule radius = height / 2 at every inset", () => {
            const layout = readRepo("app/(tabs)/_layout.tsx");
            expect(layout).toContain("borderRadius: height / 2");
            expect(layout).not.toContain("borderRadius: 24");
            // 78 + insets.bottom, halved: 39 / 51 / 56.
            for (const inset of [0, 24, 34]) {
                expect(getTabBarMetrics(inset).height / 2).toBe((78 + inset) / 2);
            }
            expect(getTabBarMetrics(0).height / 2).toBe(39);
            expect(getTabBarMetrics(24).height / 2).toBe(51);
            expect(getTabBarMetrics(34).height / 2).toBe(56);
        });

        it("SPEC-56: overlay clearance on all tab screens + FAB", () => {
            expect(readRepo("app/(tabs)/index.tsx")).toContain("paddingBottom: 160");
            expect(readRepo("app/(tabs)/index.tsx")).toContain("bottom: 160");
            expect(readRepo("app/(tabs)/index.tsx")).not.toContain("bottom: 20");
            expect(readRepo("app/(tabs)/reports.tsx")).toContain("paddingBottom: 160");
            expect(readRepo("app/(tabs)/learning.tsx")).toContain("paddingBottom: 160");
            expect(readRepo("app/(tabs)/learning-detail.tsx")).toContain("paddingBottom: 160");
            expect(readRepo("app/(tabs)/settings.tsx")).toContain("paddingBottom: 160");
        });

        it("SPEC-54 guards preserved: no blur dep, no web-only props", () => {
            const layout = readRepo("app/(tabs)/_layout.tsx");
            expect(layout).not.toContain("expo-blur");
            expect(layout).not.toContain("backdropFilter");
            expect(layout).not.toContain("boxShadow");
            expect(layout).not.toContain("TabBarVeil");
            expect(layout).not.toContain("tabBarBackground");
            expect(layout).not.toContain("expo-linear-gradient");
            const pkg = readRepo("package.json");
            expect(pkg).not.toContain("expo-blur");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
