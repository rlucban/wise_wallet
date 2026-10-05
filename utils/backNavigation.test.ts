import * as fs from "fs";
import * as path from "path";
import { safeGoBack, BACK_FALLBACK, BackCapableRouter } from "./backNavigation";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function listAppScreens(dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...listAppScreens(full));
        } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
            out.push(full);
        }
    }
    return out;
}

let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

function makeRouter(canGoBack: boolean): BackCapableRouter {
    return {
        back: jest.fn(),
        replace: jest.fn(),
        canGoBack: () => canGoBack,
    };
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`back navigation guard on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: no raw router.back() remains in any app screen", () => {
            const screens = listAppScreens(path.resolve(__dirname, "..", "app"));
            expect(screens.length).toBeGreaterThan(0);
            const offenders = screens
                .filter((file) => /router\.back\(\)/.test(fs.readFileSync(file, "utf8")))
                .map((file) => path.relative(path.resolve(__dirname, ".."), file));
            expect(offenders).toEqual([]);
        });

        it("ACC-02: history present -> pops once, never replaces", () => {
            const router = makeRouter(true);
            safeGoBack(router);
            expect(router.back).toHaveBeenCalledTimes(1);
            expect(router.replace).not.toHaveBeenCalled();
        });

        it("ACC-03: empty history -> replaces with fallback once, never pops", () => {
            const router = makeRouter(false);
            safeGoBack(router);
            expect(router.replace).toHaveBeenCalledTimes(1);
            expect(router.replace).toHaveBeenCalledWith(BACK_FALLBACK);
            expect(router.back).not.toHaveBeenCalled();
        });

        it("ACC-03b: custom fallback is respected", () => {
            const router = makeRouter(false);
            safeGoBack(router, "/(tabs)");
            expect(router.replace).toHaveBeenCalledWith("/(tabs)");
            expect(router.back).not.toHaveBeenCalled();
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");

describe("SPEC-42 fallback", () => {
    it("BACK_FALLBACK is the app root (DEC-02)", () => {
        expect(BACK_FALLBACK).toBe("/");
        expect(readRepo("app/_layout.tsx")).toContain("router.replace('/')");
    });
});
