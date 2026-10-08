/**
 * Bottom tab bar geometry for the stacked (label-below-icon) layout.
 *
 * Why this module exists (SPEC-32): expo-router's bundled bottom-tabs fork draws a
 * fixed 28px-tall icon box above a one-line label whenever the tab bar is not in
 * "compact" mode. Compact mode is only entered on iPhone in landscape, so a portrait
 * phone always stacks the label under a 28px icon. If the tab bar is not tall enough to
 * hold both, the label is laid out past the bar's bounds and clipped away on native —
 * which is why the labels were visible on web (where the label is drawn beside the icon
 * and nothing overflows) but invisible on Android and iOS.
 *
 * The three layout constants below are read off the installed library, so they carry a
 * cite to their upstream file and line. An expo-router upgrade that moves them shows up
 * as a reviewable diff here, and the test suite fails instead of the labels silently
 * disappearing again.
 */

/**
 * Default/Web height of the tab bar excluding the bottom safe-area inset.
 *
 * Sized so the stacked icon+label block clears `usableHeight` with real margin:
 * `usableHeight = 78 - 4 - (5 * 2) = 64` against `requiredHeight = 28 + 15 = 43` at the
 * default font scale (21px spare), and 50 at fontScale 1.5 (14px spare).
 *
 * SPEC-55 (CON-55-04): Web/default height is 78. SPEC-68 selects the compact
 * native height below while retaining this value on Web.
 */
export const TAB_BAR_CONTENT_HEIGHT = 78;

/** Compact Android/iOS content height selected by the tab layout (SPEC-68 v1.1). */
export const TAB_BAR_NATIVE_CONTENT_HEIGHT = 64;

/** Space between the bar's top border and the tab item's own box. */
export const TAB_BAR_PADDING_TOP = 4;

/**
 * Height of the icon box expo-router reserves per tab.
 *
 * Source: `TabBarIcon.js:13` (`ICON_SIZE_TALL = 28`), applied by the non-compact branch
 * of `TabBarIcon.js:19-23` via the `wrapperUikit` style (`TabBarIcon.js:62-65`).
 */
export const ICON_HEIGHT = 28;

/**
 * Padding expo-router applies on all sides of a single tab item in the bottom
 * non-horizontal layout.
 *
 * Source: `BottomTabItem.js:140-144` (`tabVerticalUiKit`, `padding: 5`). Charged twice:
 * once for the top edge and once for the bottom edge.
 */
export const TAB_ITEM_PADDING = 5;

/**
 * Font size of the tab label.
 *
 * Source: `app/(tabs)/_layout.tsx` `tabBarLabelStyle.fontSize`, which SPEC-32
 * CON-07 freezes. Keep the two in step.
 */
export const LABEL_FONT_SIZE = 12;

/**
 * Ratio used to turn the label's font size into a line box. The label renders as a
 * single-line `Text` (`elements/Label/Label.js:8`, `numberOfLines: 1`), so its height is
 * one line box.
 */
export const LABEL_LINE_HEIGHT_RATIO = 1.2;

export interface TabBarMetrics {
  /** Value for `tabBarStyle.height`. */
  height: number;
  /** Value for `tabBarStyle.paddingTop`. */
  paddingTop: number;
  /** Value for `tabBarStyle.paddingBottom` — the bottom safe-area inset. */
  paddingBottom: number;
  /** Vertical space one tab item's content may occupy. */
  usableHeight: number;
  /** Vertical space the icon plus the one-line label need. */
  requiredHeight: number;
  /** `usableHeight >= requiredHeight`. When false the label is clipped on native. */
  fits: boolean;
}

/**
 * Resolves the tab bar's height and vertical padding.
 *
 * `insetsBottom` is the bottom safe-area inset (home indicator / gesture bar). It is
 * non-zero on edge-to-edge Android and on notched iOS, and zero on web. The optional
 * `contentHeight` selects the native compact or Web/default bar height; the function
 * remains platform-agnostic and pure.
 *
 * `fontScale` is an explicit argument rather than a read of the system font scale so the
 * result stays deterministic under test. Callers use the default; the parameter exists so
 * the fit invariant can be checked across the scaling range Android actually applies.
 */
export function getTabBarMetrics(
    insetsBottom: number,
    fontScale = 1,
    contentHeight = TAB_BAR_CONTENT_HEIGHT
): TabBarMetrics {
    const height = contentHeight + insetsBottom;
    const paddingTop = TAB_BAR_PADDING_TOP;
    const paddingBottom = insetsBottom;
    const usableHeight =
        height - paddingTop - paddingBottom - TAB_ITEM_PADDING * 2;
    const requiredHeight =
        ICON_HEIGHT + Math.ceil(LABEL_FONT_SIZE * LABEL_LINE_HEIGHT_RATIO * fontScale);

    return {
        height,
        paddingTop,
        paddingBottom,
        usableHeight,
        requiredHeight,
        fits: usableHeight >= requiredHeight,
    };
}