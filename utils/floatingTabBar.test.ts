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
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
