import * as fs from "fs";
import * as path from "path";
import { getTabBarMetrics } from "./tabBarMetrics";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function runSuite(os: "android" | "ios" | "web"): void {
    describe(`SPEC-52 floating tab bar on ${os}`, () => {
        it("ACC-01: pill geometry, in-flow, SPEC-32 values intact", () => {
            const layout = readRepo("app/(tabs)/_layout.tsx");
            expect(layout).toContain("marginHorizontal: 16");
            expect(layout).toContain("marginBottom: 12");
            expect(layout).toContain("borderTopWidth: 0");
            expect(layout).not.toContain("borderTopColor");
            expect(layout).not.toContain('position: "absolute"');
            expect(layout).not.toContain("position:'absolute'");
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
            // Accessibility + test pass-through preserved.
            expect(layout).toContain("accessibilityLabel={accessibilityLabel}");
            expect(layout).toContain("accessibilityState={accessibilityState}");
            expect(layout).toContain('accessibilityRole={accessibilityRole ?? "button"}');
            expect(layout).toContain("testID={testID}");
        });

        it("ACC-12: dark pill uses the MD3 tonal lift, theme file untouched", () => {
            const layout = readRepo("app/(tabs)/_layout.tsx");
            expect(layout).toContain(
                "backgroundColor: theme.dark ? theme.colors.surfaceContainerHigh : theme.colors.surface"
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
            // 68 + insets.bottom, halved: 34 / 46 / 51.
            for (const inset of [0, 24, 34]) {
                expect(getTabBarMetrics(inset).height / 2).toBe((68 + inset) / 2);
            }
            expect(getTabBarMetrics(0).height / 2).toBe(34);
            expect(getTabBarMetrics(24).height / 2).toBe(46);
            expect(getTabBarMetrics(34).height / 2).toBe(51);
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
