import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function runSuite(os: "android" | "ios" | "web"): void {
    describe(`SPEC-54 tab bar veil + float on ${os}`, () => {
        it("ACC-01: veil wired, gradient spec, pointer-safe", () => {
            const layout = readRepo("app/(tabs)/_layout.tsx");
            expect(layout).toContain("tabBarBackground: () => <TabBarVeil />");
            expect(layout).toContain("function TabBarVeil()");
            expect(layout).toContain('from "expo-linear-gradient"');
            expect(layout).toContain('colors={["transparent", "transparent", surface]}');
            expect(layout).toContain("locations={[0, 0.45, 1]}");
            expect(layout).toContain("opacity: 0.18");
            expect(layout).toContain('name="blur"');
            expect(layout).toContain('name="blur-off"');
            expect(layout).toContain('pointerEvents="none"');
            expect(layout).toContain("StyleSheet.absoluteFill");
            expect(layout).toContain('overflow: "hidden"');
        });

        it("ACC-02: floats higher, SPEC-52 v1.1 values intact", () => {
            const layout = readRepo("app/(tabs)/_layout.tsx");
            expect(layout).toContain("marginBottom: 20");
            expect(layout).toContain("marginHorizontal: 16");
            expect(layout).toContain("borderRadius: height / 2");
            expect(layout).toContain(
                "backgroundColor: theme.dark ? theme.colors.surfaceContainerHigh : theme.colors.surface"
            );
            expect(layout).toContain("elevation: 8");
            expect(layout).toContain("dip(0.85, 120)");
            expect(layout).toContain("dip(1, 180)");
            expect(layout).toContain("getTabBarMetrics(insets.bottom)");
            expect(layout).toContain("fontSize: 12");
        });

        it("ACC-03: no blur dep, no web-only props, no stray imports", () => {
            const layout = readRepo("app/(tabs)/_layout.tsx");
            expect(layout).not.toContain("expo-blur");
            expect(layout).not.toContain("backdropFilter");
            expect(layout).not.toContain("boxShadow");
            const pkg = readRepo("package.json");
            expect(pkg).not.toContain("expo-blur");
            // Only the three allow-listed new imports.
            const imports = layout.match(/^import .*from ".*";$/gm) ?? [];
            const allowed = [
                "expo-linear-gradient",
                "react-native",
                "react-native-vector-icons/MaterialCommunityIcons",
                "react-native-paper",
                "react-native-safe-area-context",
                "expo-router",
                "../../utils/tabBarMetrics",
            ];
            for (const line of imports) {
                const match = line.match(/from "([^"]+)"/);
                if (!match) continue;
                expect(allowed).toContain(match[1]);
            }
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");