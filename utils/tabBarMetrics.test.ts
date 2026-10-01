import fs from "fs";
import path from "path";
import {
    getTabBarMetrics,
    ICON_HEIGHT,
    LABEL_FONT_SIZE,
    LABEL_LINE_HEIGHT_RATIO,
    TAB_BAR_CONTENT_HEIGHT,
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
            height: 68,
            paddingTop: 4,
            paddingBottom: 0,
            usableHeight: 54,
            requiredHeight: 43,
            fits: true,
        });
    });

    it("adds a 24px inset to the height and the padding, leaving usableHeight alone", () => {
        expect(getTabBarMetrics(24)).toEqual({
            height: 92,
            paddingTop: 4,
            paddingBottom: 24,
            usableHeight: 54,
            requiredHeight: 43,
            fits: true,
        });
    });

    it("adds a 34px home-indicator inset to the height and the padding", () => {
        expect(getTabBarMetrics(34)).toEqual({
            height: 102,
            paddingTop: 4,
            paddingBottom: 34,
            usableHeight: 54,
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
        expect(TAB_BAR_CONTENT_HEIGHT).toBe(68);
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
        // size. 2.0 is outside the CON-01 range precisely so this boundary stays pinned.
        const m = getTabBarMetrics(0, 2.0);
        expect(m.fits).toBe(false);
        expect(m.height).toBe(TAB_BAR_CONTENT_HEIGHT);
    });
});

// ACC-03 / CON-04 — identical numbers on every platform. Each case asserts against the
// same literal expectation, so any per-platform branch in the helper would show up as a
// mismatch rather than as three agreeing copies of a bug.
describe("getTabBarMetrics (ACC-03)", () => {
    const EXPECTED_AT_1_5 = {
        height: 102,
        paddingTop: 4,
        paddingBottom: 34,
        usableHeight: 54,
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
                    height: 102,
                    paddingTop: 4,
                    paddingBottom: 34,
                    usableHeight: 54,
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

// ACC-05 / CON-02 / CON-05 / CON-06 / CON-07 — the layout consumes the helper correctly.
describe("app/(tabs)/_layout.tsx source (ACC-05)", () => {
    const source = fs.readFileSync(LAYOUT_PATH, "utf-8");

    it("reads insets from react-native-safe-area-context", () => {
        expect(source).toContain('from "react-native-safe-area-context"');
        expect(source).toContain("useSafeAreaInsets()");
    });

    it("does not add its own SafeAreaProvider (CON-03)", () => {
        expect(source).not.toContain("<SafeAreaProvider");
    });

    it("drops the old hardcoded bar metrics", () => {
        expect(source).not.toMatch(/height:\s*60\b/);
        expect(source).not.toMatch(/paddingBottom:\s*8\b/);
        expect(source).not.toMatch(/paddingTop:\s*8\b/);
    });

    it("does not pass a fontScale (CON-05)", () => {
        expect(source).toMatch(/getTabBarMetrics\(\s*insets\.bottom\s*\)/);
        expect(source).not.toMatch(/getTabBarMetrics\(\s*insets\.bottom\s*,/);
    });

    it("keeps only the three style fields out of the helper result", () => {
        const destructure = source.match(
            /const\s*\{([^}]*)\}\s*=\s*getTabBarMetrics\(/
        );
        expect(destructure).not.toBeNull();
        const fields = (destructure?.[1] ?? "")
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean)
            .sort();
        expect(fields).toEqual(["height", "paddingBottom", "paddingTop"]);
    });

    it("keeps the tab bar theme values (CON-06)", () => {
        expect(source).toContain("tabBarActiveTintColor: theme.colors.primary");
        expect(source).toContain("tabBarInactiveTintColor: theme.colors.outline");
        expect(source).toContain("backgroundColor: theme.colors.surface");
        expect(source).toContain("borderTopWidth: 1");
        expect(source).toContain("borderTopColor: theme.colors.surfaceVariant");
        expect(source).toContain("elevation: 0");
    });

    it("keeps the label typography (CON-07)", () => {
        expect(source).toContain("fontSize: 12");
        expect(source).toContain('fontWeight: "600"');
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

    it("does not lock font scaling (CON-08)", () => {
        expect(source).not.toContain("tabBarAllowFontScaling");
    });
});