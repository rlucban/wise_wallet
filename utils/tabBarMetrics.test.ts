import fs from "fs";
import path from "path";
import {
    getTabBarMetrics,
    ICON_HEIGHT,
    LABEL_FONT_SIZE,
    LABEL_LINE_HEIGHT_RATIO,
    TAB_BAR_CONTENT_HEIGHT,
    TAB_BAR_NATIVE_CONTENT_HEIGHT,
    TAB_BAR_PADDING_TOP,
    TAB_ITEM_PADDING,
} from "./tabBarMetrics";

let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

const METRICS_PATH = path.resolve(__dirname, "tabBarMetrics.ts");
const LAYOUT_PATH = path.resolve(__dirname, "..", "app", "(tabs)", "_layout.tsx");

const INSETS_CASES = [0, 24, 34];
const FONT_SCALES = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5];

// ACC-01 — height and padding are inset-derived, not constants.
// Expected values are spelled out as literals on purpose: they pin the arithmetic, so a
// future platform-conditional or metric change fails here instead of silently re-clipping
// the labels on device.
describe("getTabBarMetrics (ACC-01)", () => {
    it("returns the documented shape for insets.bottom=0", () => {
        expect(getTabBarMetrics(0)).toEqual({
            height: 78,
            paddingTop: 4,
            paddingBottom: 0,
            usableHeight: 64,
            requiredHeight: 43,
            fits: true,
        });
    });

    it("adds a 24px inset to the height and the padding, leaving usableHeight alone", () => {
        expect(getTabBarMetrics(24)).toEqual({
            height: 102,
            paddingTop: 4,
            paddingBottom: 24,
            usableHeight: 64,
            requiredHeight: 43,
            fits: true,
        });
    });

    it("adds a 34px home-indicator inset to the height and the padding", () => {
        expect(getTabBarMetrics(34)).toEqual({
            height: 112,
            paddingTop: 4,
            paddingBottom: 34,
            usableHeight: 64,
            requiredHeight: 43,
            fits: true,
        });
    });

    it("returns every documented field", () => {
        expect(Object.keys(getTabBarMetrics(0)).sort()).toEqual([
            "fits",
            "height",
            "paddingBottom",
            "paddingTop",
            "requiredHeight",
            "usableHeight",
        ]);
    });

    it("subtracts the bar padding and both item paddings from usableHeight", () => {
        const m = getTabBarMetrics(24);
        expect(m.usableHeight).toBe(
            m.height - m.paddingTop - m.paddingBottom - TAB_ITEM_PADDING * 2
        );
    });

    it("exposes the library-derived constants it sizes against", () => {
        expect(TAB_BAR_CONTENT_HEIGHT).toBe(78);
        expect(TAB_BAR_NATIVE_CONTENT_HEIGHT).toBe(64);
        expect(TAB_BAR_PADDING_TOP).toBe(4);
        expect(ICON_HEIGHT).toBe(28);
        expect(TAB_ITEM_PADDING).toBe(5);
        expect(LABEL_FONT_SIZE).toBe(12);
        expect(LABEL_LINE_HEIGHT_RATIO).toBe(1.2);
    });
});

// ACC-02 — the icon+label block must fit at every font scale we require.
describe("getTabBarMetrics (ACC-02)", () => {
    const FIT_CASES = INSETS_CASES.flatMap((insetsBottom) =>
        FONT_SCALES.map((fontScale) => ({ insetsBottom, fontScale }))
    );

    it.each(FIT_CASES)(
        "fits with insets.bottom=$insetsBottom at fontScale=$fontScale",
        ({ insetsBottom, fontScale }) => {
            const m = getTabBarMetrics(insetsBottom, fontScale);
            expect(m.requiredHeight).toBe(
                ICON_HEIGHT + Math.ceil(LABEL_FONT_SIZE * LABEL_LINE_HEIGHT_RATIO * fontScale)
            );
            expect(m.fits).toBe(true);
            expect(m.usableHeight).toBeGreaterThanOrEqual(m.requiredHeight);
        }
    );

    it("keeps real headroom, not just a hair, at the extremes", () => {
        expect(getTabBarMetrics(0, 1.0).usableHeight).toBeGreaterThan(
            getTabBarMetrics(0, 1.0).requiredHeight
        );
        expect(getTabBarMetrics(34, 1.5).usableHeight).toBeGreaterThan(
            getTabBarMetrics(34, 1.5).requiredHeight
        );
    });

    it("defaults fontScale to 1", () => {
        expect(getTabBarMetrics(24)).toEqual(getTabBarMetrics(24, 1));
    });

    it("reports fits=false rather than silently resizing when the bar is too short", () => {
        // DEC-07: the failure mode is a failing test, not a bar that jumps with the font
        // size. 3.0 is outside the CON-01 range precisely so this boundary stays pinned.
        // (SPEC-55 CON-55-05: at height 78, fontScale 2.0 now fits — 57 ≤ 64 — so the
        // boundary moved from 2.0 to 3.0, where required = 72 > 64.)
        const m = getTabBarMetrics(0, 3.0);
        expect(m.fits).toBe(false);
        expect(m.height).toBe(TAB_BAR_CONTENT_HEIGHT);
    });
});

// ACC-03 / CON-04 — identical numbers on every platform. Each case asserts against the
// same literal expectation, so any per-platform branch in the helper would show up as a
// mismatch rather than as three agreeing copies of a bug.
describe("getTabBarMetrics (ACC-03)", () => {
    const EXPECTED_AT_1_5 = {
        height: 112,
        paddingTop: 4,
        paddingBottom: 34,
        usableHeight: 64,
        requiredHeight: 50,
        fits: true,
    };

    function runSuite(os: "android" | "ios" | "web") {
        describe(`Platform.OS=${os}`, () => {
            beforeEach(() => {
                mockOS = os;
            });

            it("matches the same literal metrics at fontScale 1", () => {
                expect(getTabBarMetrics(34)).toEqual({
                    height: 112,
                    paddingTop: 4,
                    paddingBottom: 34,
                    usableHeight: 64,
                    requiredHeight: 43,
                    fits: true,
                });
            });

            it("matches the same literal metrics at fontScale 1.5", () => {
                expect(getTabBarMetrics(34, 1.5)).toEqual(EXPECTED_AT_1_5);
            });

            it("fits across the required font-scale range", () => {
                for (const fontScale of FONT_SCALES) {
                    expect(getTabBarMetrics(24, fontScale).fits).toBe(true);
                }
            });

            it("uses compact native content height and preserves Web height", () => {
                const contentHeight = os === "web"
                    ? TAB_BAR_CONTENT_HEIGHT
                    : TAB_BAR_NATIVE_CONTENT_HEIGHT;
                const metrics = getTabBarMetrics(34, undefined, contentHeight);

                expect(metrics.height).toBe(contentHeight + 34);
                expect(metrics.paddingBottom).toBe(34);
                expect(metrics.usableHeight).toBe(contentHeight - 14);
                expect(getTabBarMetrics(34, 1.5, contentHeight).fits).toBe(true);
                expect(metrics.height - 34).toBe(os === "web" ? 78 : 64);
            });
        });
    }

    runSuite("android");
    runSuite("ios");
    runSuite("web");
});

// ACC-04 — no platform branching or global font-scale read inside the helper.
describe("utils/tabBarMetrics.ts source (ACC-04)", () => {
    const source = fs.readFileSync(METRICS_PATH, "utf-8");

    it("does not import react-native", () => {
        expect(source).not.toMatch(/from\s+["']react-native["']/);
        expect(source).not.toMatch(/require\(\s*["']react-native["']\s*\)/);
    });

    it("does not branch on Platform.OS or Platform.select", () => {
        expect(source).not.toContain("Platform.OS");
        expect(source).not.toContain("Platform.select");
    });

    it("does not read PixelRatio or the system font scale", () => {
        expect(source).not.toContain("PixelRatio");
        expect(source).not.toContain("getFontScale");
    });
});

// ACC-05 — SPEC-69 supersedes the old tabBarMetrics consumer wiring in _layout.tsx.
// The helper remains for reference; the layout now renders FloatingTabBar via `tabBar`.
describe("app/(tabs)/_layout.tsx source (ACC-05)", () => {
    const source = fs.readFileSync(LAYOUT_PATH, "utf-8");

    it("delegates to the custom FloatingTabBar", () => {
        expect(source).toContain("FloatingTabBar");
        expect(source).toContain("tabBar={(props) => <FloatingTabBar");
    });

    it("keeps every tab title, icon, and the hidden route (CON-07)", () => {
        expect(source).toContain('title: "Home"');
        expect(source).toContain('title: "Reports"');
        expect(source).toContain('title: "Learning"');
        expect(source).toContain('title: "Settings"');
        expect(source).toContain('name="home-variant"');
        expect(source).toContain('name="chart-bar"');
        expect(source).toContain('name="school"');
        expect(source).toContain('name="cog"');
        expect(source).toContain("href: null");
    });
});