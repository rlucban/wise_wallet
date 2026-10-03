# Spec 32: Bottom Tab Bar Label Visibility (Android/iOS)

| Field | Value |
|---|---|
| ID | SPEC-32 |
| Title | Bottom Tab Bar Label Visibility + Safe-Area Padding |
| Status | **FINAL** v1.0 (2026-10-01, per user call "Implement"). v0.1 amended during implementation — see History. Implementable. |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/_layout.tsx` — `tabBarStyle` height/padding; new `utils/tabBarMetrics.ts` + `utils/tabBarMetrics.test.ts` |
| Non-goals | Tab titles, icons, tab order, or `href: null` on `learning-detail`; `tabBarLabelStyle` typography; the tab-bar **theme colors** (`tabBarActiveTintColor`, `tabBarInactiveTintColor`, `backgroundColor`, `borderTopWidth`, `borderTopColor`, `elevation`); pinning `tabBarLabelPosition` (web keeps its side-by-icon layout — see DEC-05); `app/_layout.tsx`; any screen body; `package.json`; storage, API contract, or sync |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: v0.1 (2026-10-01, DRAFT). Written from a static read of
> `expo-router@~57.0.24`'s bundled bottom-tabs fork (`node_modules/expo-router/build/react-navigation/bottom-tabs/`).
> User calls already folded in: (1) fix = size-aware height via `useSafeAreaInsets()`;
> (2) scope = labels **and** safe-area padding, not labels only.
>
> v1.0 (2026-10-01, FINAL per user call "Implement") — one normative tightening, found while
> writing D-02: v0.1's D-02/ACC-05 said the layout should *spread* the whole
> `getTabBarMetrics(insets.bottom)` object into `tabBarStyle`. That would also inject the
> diagnostic fields `usableHeight`, `requiredHeight`, and `fits` into the style object,
> where they are not style props. **D-02 and ACC-05 now require destructuring exactly
> `height`, `paddingTop`, and `paddingBottom`.** No numeric constant, no computed value,
> and no acceptance threshold changed: `getTabBarMetrics` still returns all six fields
> (ACC-01 unchanged) and the fit arithmetic is identical.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be
interpreted as described in RFC 2119. Informative prose is non-normative unless restated
as a requirement.

## 1. Context

### 1.1 Symptom

On Android and iOS the four tab labels — Home, Reports, Learning, Settings — are **absent**;
only icons render. In a desktop browser the labels **are** visible. The tab bar is otherwise
functional (icons tint, taps navigate, the active tab highlights).

### 1.2 Root cause (verified in the installed library source)

expo-router 57 ships its **own** fork of React Navigation's bottom tabs, not the upstream
package (`@react-navigation/bottom-tabs` is not a direct dependency; the fork lives at
`node_modules/expo-router/build/react-navigation/bottom-tabs/`). Three facts combine to
produce the symptom.

**(a) Web and mobile take different label-layout branches.**
`shouldUseHorizontalLabels` (`views/BottomTabBar.js:53-83`) decides whether the label sits
**beside** the icon (`horizontal = true`) or **below** it:

| Case | Branch taken | Result |
|---|---|---|
| Web / desktop (`dimensions.width >= 768`) | `:63-78` — `maxTabWidth = 4 × DEFAULT_MAX_TAB_ITEM_WIDTH = 500 <= width` | `horizontal = true` → label **beside** icon → always fits |
| Phone portrait (`width < 768`) | `:80-81` — `dimensions.width > dimensions.height` → `false` | `horizontal = false` → label **below** icon |

**(b) In the stacked branch the content does not fit the bar's height.**
`app/(tabs)/_layout.tsx:18-20` hardcodes `height: 60`, `paddingTop: 8`, `paddingBottom: 8`:

```
content box              = height − paddingTop − paddingBottom = 60 − 8 − 8 = 44
per-item padding         = 5 × 2                               (BottomTabItem.js:140-144,
                                                              tabVerticalUiKit padding: 5)
usable height            = 44 − 10                             = 34
required height          = icon 28 + label ~15                 = 43
```

The 28px icon is not a choice — it is hardcoded. `TabBarIcon.js:19-23` picks
`ICON_SIZE_TALL = 28` (`:13`, wrapper `:62-69`) whenever `size !== 'compact'`, and
`isCompact` (`BottomTabBar.js:84-99`) returns `true` **only** for iPhone in landscape with
horizontal labels (`:95-97`). A portrait phone therefore always gets the full-height icon.
The label is a `numberOfLines={1}` `Text` (`elements/Label/Label.js:8`) at
`fontSize: 12` (`app/(tabs)/_layout.tsx:24`) ≈ 15px tall.

43 required vs 34 available ≈ **9px overflow** → the label is laid out below the bar's
bounds and clipped. Web survives because react-native-web renders `Text` into a `<div>`
with default `overflow: visible`, so the overflowing label still paints (typically
overlapping the content above it).

**(c) `tabBarStyle` silently defeats the library's own safe-area handling.**
`BottomTabBar.js` composes the bar style as
`[..., { height: tabBarHeight, paddingBottom: insets.bottom, paddingTop: insets.top }, tabBarStyle]`
— `:251-255` then **`:257`**. `tabBarStyle` is applied **last and therefore wins**, so:

- the hardcoded `height: 60` overrides the computed `tabBarHeight`, and
  `getTabBarHeight` (`:100-112`) short-circuits on it anyway (`:103-106`);
- the hardcoded `paddingBottom: 8` **replaces `insets.bottom`** (`:252`), so on a notched
  iPhone the label sits under the home indicator — a second, independent reason it is
  invisible on device.

The library's **default** height would not have saved us: `TABBAR_HEIGHT_UIKIT = 49`
(`:47`) yields `49 − 10 = 39 < 43`, so simply deleting the `height` override still overflows.
The height must be made size-aware, not merely removed.

### 1.3 Why a pure helper is required (not just an inline style)

The fix is a small arithmetic expression, but the load-bearing constants are **library
internals** (28px icon, 5px item padding) and the whole defect is an arithmetic invariant.
Per AGENTS.md §1.10 this must be machine-checkable, and the repo's jest config is
`roots: ['<rootDir>/utils']` (`jest.config.js`) — it cannot render anything under `app/`.
Extracting the arithmetic into `utils/tabBarMetrics.ts` makes the invariant testable and
turns a silent future regression (an expo-router bump that changes `ICON_SIZE_TALL`) into a
failing test instead of an invisible bug.

### 1.4 Rollback

Revert `app/(tabs)/_layout.tsx` and delete `utils/tabBarMetrics.ts` +
`utils/tabBarMetrics.test.ts`. No storage, API, or route change is involved, so rollback is
a clean code revert at any time.

## 2. Constraints (normative)

- **CON-01 — Labels MUST fit.** With the shipped `tabBarStyle`, `usableHeight` MUST be
  greater than or equal to `requiredHeight` for `fontScale` 1.0 through 1.5 on Android,
  iOS, and Web, where `usableHeight = height − paddingTop − paddingBottom − (2 ×
  TAB_ITEM_PADDING)` and `requiredHeight = ICON_HEIGHT + ceil(LABEL_FONT_SIZE ×
  LABEL_LINE_HEIGHT_RATIO × fontScale)`.
- **CON-02 — Height MUST be inset-aware.** `tabBarStyle.height` MUST equal
  `TAB_BAR_CONTENT_HEIGHT + insets.bottom` and `tabBarStyle.paddingBottom` MUST equal
  `insets.bottom`, both read from `useSafeAreaInsets()`. The hardcoded `height: 60`,
  `paddingBottom: 8`, and `paddingTop: 8` MUST be removed. `paddingBottom` MUST NOT be a
  constant, so the home-indicator inset is never clobbered again.
- **CON-03 — Safe-area provider.** `app/(tabs)/_layout.tsx` MUST NOT add its own
  `<SafeAreaProvider>`. `expo-router`'s `ExpoRoot` already supplies one above the app tree
  (`ExpoRoot.js:78-84`), and a nested provider would re-measure insets against the wrong
  frame.
- **CON-04 — Platform-agnostic.** `getTabBarMetrics` MUST contain **no** `Platform.OS`
  branch, `Platform.select`, or web/native conditional. The same numbers MUST be produced on
  Android, iOS, and Web; the platform difference is absorbed entirely by `insets.bottom`
  (non-zero on edge-to-edge Android and notched iOS, zero on Web).
- **CON-05 — `fontScale` is a parameter, not a global read.** `getTabBarMetrics` MUST NOT
  import `PixelRatio` or read the system font scale at call time; `fontScale` is an
  explicit argument defaulting to `1`, so the function stays pure and deterministic under
  jest. `app/(tabs)/_layout.tsx` MUST call it with the default and MUST NOT read the system
  font scale.
- **CON-06 — Theme colors preserved.** `tabBarActiveTintColor`, `tabBarInactiveTintColor`,
  `tabBarStyle.backgroundColor`, `borderTopWidth`, `borderTopColor`, and `elevation` MUST
  remain exactly as they are today (`app/(tabs)/_layout.tsx:12-17,21`). Only `height`,
  `paddingTop`, and `paddingBottom` change.
- **CON-07 — Labels, order, and typography unchanged.** All four `title` values
  (`"Home"`, `"Reports"`, `"Learning"`, `"Settings"`), their `tabBarIcon` renderers, the
  screen order, `learning-detail`'s `href: null`, and `tabBarLabelStyle`
  (`fontSize: 12`, `fontWeight: "600"`) MUST be byte-identical. The fix is geometric only.
- **CON-08 — No font-scaling lock.** `tabBarAllowFontScaling` MUST NOT be set to `false`.
  Clamping text scaling to fit a fixed-height bar is an accessibility regression, and
  CON-01's headroom covers the 1.0–1.5 range instead. (Note: expo-router already clamps to
  `false` on iOS 13+ for the large-content-viewer interaction — `BottomTabItem.js:12,17` —
  so the Android case is the one CON-01 must cover.)
- **CON-09 — No new dependency.** `react-native-safe-area-context@~5.7.0` is already a direct
  dependency (`package.json:50`) and MUST be used as-is. `package.json` and
  `package-lock.json` MUST be unchanged.
- **CON-10 — Expo Go and Vercel safe.** No new native module, no top-level native import, no
  Node-only API, no secrets. `expo export --platform web` MUST still succeed.
- **CON-11 — No lint weakening.** `eslint.config.js` untouched; `utils/themeColors.test.js`
  untouched; no new `any`; no new `@typescript-eslint` suppression.
- **CON-12 — Verification gates.** `npm test`, `npm run lint`, and `npx tsc --noEmit` MUST be
  clean. (The user runs the commands; the agent does not — AGENTS.md §1.3.)

## 3. Goal

Tab labels are visible on Android and iOS exactly as they already are on Web, with no
layout overflow and no regression to the iOS home-indicator inset, using a single
platform-agnostic, unit-tested geometry helper.

### 3.1 Platform matrix

| Platform | Objective (machine-checkable) | Subjective (reviewer observation) |
|---|---|---|
| **Android** | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05 | ACC-06, ACC-07, ACC-08, ACC-09 |
| **iOS** | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05 | ACC-06, ACC-07, ACC-08, ACC-09 |
| **Web** | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05 | ACC-06, ACC-07, ACC-08 |

### 3.2 Acceptance criteria (Objective — machine-checkable)

| ID | Platform | Criterion | How checked |
|---|---|---|---|
| **ACC-01** | all | `getTabBarMetrics(insetsBottom, fontScale)` returns `{ height, paddingTop, paddingBottom, usableHeight, requiredHeight, fits }` with `height === TAB_BAR_CONTENT_HEIGHT + insetsBottom` and `paddingBottom === insetsBottom`, for `insetsBottom` of 0, 24, and 34. | jest, exact values |
| **ACC-02** | all | `fits === true` for every `fontScale` in 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, and for every `insetsBottom` in ACC-01. | jest, loop |
| **ACC-03** | all | `getTabBarMetrics` yields **identical** metric objects under `Platform.OS` mocked to `android`, `ios`, and `web` (CON-04). | jest, `describe.each` over `Platform.OS` |
| **ACC-04** | all | `utils/tabBarMetrics.ts` contains no `Platform.OS`, no `Platform.select`, no `PixelRatio`, and no `react-native` import; `app/(tabs)/_layout.tsx` passes no `fontScale` argument (CON-04, CON-05). | jest, source read |
| **ACC-05** | all | `app/(tabs)/_layout.tsx` contains no literal `height: 60`, `paddingBottom: 8`, or `paddingTop: 8`; it calls `useSafeAreaInsets()` and destructures `height`, `paddingTop`, and `paddingBottom` from `getTabBarMetrics(insets.bottom)` into `tabBarStyle`, with none of the diagnostic fields (`usableHeight`, `requiredHeight`, `fits`) present in the style object; the six theme values of CON-06, all four `title` strings, all `tabBarIcon` renderers, `learning-detail`'s `href: null`, and `tabBarLabelStyle` are unchanged (CON-06, CON-07). | jest, source read |

Web note: `insets.bottom` is `0`, so `height === TAB_BAR_CONTENT_HEIGHT`. At widths
`>= 768` web keeps the side-by-icon layout (`:63-78`), whose requirement is
`max(ICON_HEIGHT, labelHeight) = 28 <= usableHeight`, satisfied by a wide margin. At
narrow web widths (`< 768`) web switches to the stacked branch and is then covered by
CON-01 exactly like native — a bonus fix, not a goal. ACC-09 (Expo Go) is native-only.

### 3.3 Acceptance criteria (Subjective — reviewer observation, per platform)

| ID | Platform | Test procedure | Pass condition |
|---|---|---|---|
| **ACC-06** | all | Launch the app and look at the bottom tab bar. | All four labels — Home, Reports, Learning, Settings — are readable beneath their icons. None is clipped, truncated, overlapping the bar's top border, or overlapping the screen content above it. |
| **ACC-07** | Android/iOS | Same as ACC-06, on a device with a gesture-navigation bar and again on one with 3-button navigation; repeat with the system font size at default and at the largest step. | Labels remain fully visible in all four combinations. Nothing is hidden behind the system navigation bar or the home indicator. |
| **ACC-08** | all | Compare the tab bar before and after the change. | Bar height grows only by the safe-area inset. Icon size, label font size and weight, active/inactive tint, background, and top border are visually unchanged. |
| **ACC-09** | Android/iOS | Run in Expo Go. | No red box at any point. `useSafeAreaInsets()` resolves normally (no "No safe area value available" warning in the log). |

### 3.4 Decisions

- **DEC-01 — Fix the height, don't shrink the icon.** The alternative (drop `height`, set
  `tabBarIconStyle: 24`, `tabBarLabelStyle.fontSize: 10`) fits the library default 49px but
  yields only ~2px of margin and visibly shrinks both icon and text. Raising the bar to a
  size-aware height preserves the current design intent (user call).
- **DEC-02 — Height is `TAB_BAR_CONTENT_HEIGHT + insets.bottom`.** Not a constant. This is
  the only construction that satisfies CON-01 and CON-02 at once: any constant height that
  clears the 43px requirement on an inset-0 device will be excessively tall on a notched
  iPhone, and the reverse makes the label hide under the home indicator.
- **DEC-03 — `TAB_BAR_CONTENT_HEIGHT = 68`, not 64.** With `paddingTop = 4` and
  `TAB_ITEM_PADDING = 5`, `usableHeight = TAB_BAR_CONTENT_HEIGHT − 4 − 10`. The table:

  | `TAB_BAR_CONTENT_HEIGHT` | `usableHeight` | margin @ scale 1.0 | margin @ scale 1.5 | margin @ scale 2.0 |
  |---|---|---|---|---|
  | 64 | 50 | 7 | **0** | −7 (fails) |
  | **68** | **54** | **11** | **4** | −3 (fails) |

  64 was the figure first proposed to the user. It leaves literally zero margin at
  `fontScale 1.5` — Android does not clamp label scaling (`BottomTabItem.js:12,17`) — so any
  change to the font metrics or the library's constants would re-break the labels. 68 keeps
  real margin while staying inside the normal Material bottom-bar range. Both fail at
  `fontScale 2.0`, which CON-01 deliberately does not require; ACC-02's loop stops at 1.5 so
  the boundary is pinned by a test rather than left to chance.
- **DEC-04 — Padding is symmetric around the icon+label block.** `paddingTop = 4` plus the
  item's own `5` gives 9px above the icon; below the label the item's 5 plus the bar edge
  gives ~5px. Vertical centering is left to the library so a future metric change cannot
  silently de-center the block.
- **DEC-05 — Web keeps its side-by-icon layout.** Pinning `tabBarLabelPosition:
  'below-icon'` would make web and native identical, but it was rejected: it is a
  cross-platform visual redesign of the web UI, which is outside the scope this spec was
  approved for. ACC-01 covers both branches' arithmetic, so both fit. Revisiting web
  parity is a separate spec.
- **DEC-06 — Pure helper in `utils/`, not inline in the layout.** Required by CON-01/ACC-02
  being machine-checkable under `roots: ['<rootDir>/utils']` (§1.3). The helper owns the
  library-derived constants (`ICON_HEIGHT`, `TAB_ITEM_PADDING`, `LABEL_FONT_SIZE`,
  `LABEL_LINE_HEIGHT_RATIO`) with a comment citing the upstream file and line for each, so
  an expo-router upgrade that moves them shows up as a reviewable diff.
- **DEC-07 — `fits` is returned but not used to branch.** `getTabBarMetrics` reports whether
  the bar fits rather than silently resizing. Auto-resizing would make the bar height vary
  with the user's font size, which reads as a layout jump; a stable bar plus a failing test
  (ACC-02) is the desired failure mode.
- **DEC-08 — Labels are not restored by raising `tabBarAllowFontScaling`.** See CON-08.

## 4. Deliverables

- **D-01 — `utils/tabBarMetrics.ts` (new).** Pure, dependency-free module (no `react-native`
  import) exporting: `TAB_BAR_CONTENT_HEIGHT = 68`, `TAB_BAR_PADDING_TOP = 4`,
  `ICON_HEIGHT = 28`, `TAB_ITEM_PADDING = 5`, `LABEL_FONT_SIZE = 12`,
  `LABEL_LINE_HEIGHT_RATIO = 1.2`, the `TabBarMetrics` interface
  (`height`, `paddingTop`, `paddingBottom`, `usableHeight`, `requiredHeight`, `fits`), and
  `getTabBarMetrics(insetsBottom: number, fontScale?: number): TabBarMetrics`. Each
  library-derived constant MUST carry a comment citing its upstream source file and line
  (`TabBarIcon.js:13`, `BottomTabItem.js:140-144`, and `app/(tabs)/_layout.tsx:24`).
  Satisfies CON-01, CON-02, CON-04, CON-05, DEC-03..DEC-07.
- **D-02 — `app/(tabs)/_layout.tsx`.** Import `useSafeAreaInsets` from
  `react-native-safe-area-context` and `getTabBarMetrics` from `../utils/tabBarMetrics`.
  `getTabBarMetrics(insets.bottom)`, destructuring **only** `height`, `paddingTop`, and
  `paddingBottom` into `tabBarStyle` (the other three returned fields are diagnostics and
  MUST NOT reach the style object — v1.0 History). The six theme values, all four `title`s,
  all `tabBarIcon`s, `learning-detail`'s `href: null`, and `tabBarLabelStyle` are untouched
  (CON-06, CON-07). No `<SafeAreaProvider>` is added (CON-03) and `fontScale` is not passed
  (CON-05).
- **D-03 — `utils/tabBarMetrics.test.ts` (new).** Jest coverage of ACC-01..ACC-05:
  exact-value assertions for `insetsBottom` 0 / 24 / 34; the ACC-02 `fontScale` loop
  1.0→1.5 asserting `fits === true`; a `describe.each` over `Platform.OS` ∈
  `android` / `ios` / `web` (mocked) asserting identical metric objects across platforms
  (ACC-03); source-text assertions for ACC-04 and ACC-05 reading both new/changed files with
  `fs.readFileSync`. Parameterizing by `Platform.OS` is what makes ACC-03 meaningful; the
  mock MUST be per-`describe` so the module under test is re-required, and the file MUST
  stay in `utils/` to satisfy the `roots` constraint.
- **D-04 — Documentation.** Append the implementation entry to `docs/savepoint.md` and a
  `Current status` bullet to `AGENTS.md` §3 (AGENTS.md §1.8), noting the §1.4 rollback and
  that the fix is geometric-only (no behavior, storage, or API change).
- **D-05 — Verification.** Report the user's `npm test`, `npm run lint`, and
  `npx tsc --noEmit` output against CON-12. ACC-06..ACC-09 are user-run; the agent does not
  execute CLIs (AGENTS.md §1.3).

## Glossary

| Term | Meaning |
|---|---|
| Tab label | The `Text` rendered by `BottomTabItem`'s `renderLabel`, showing `options.title`. |
| `horizontal` | `BottomTabBar`'s per-tab boolean: `true` = label beside the icon, `false` = label below it. Decided by `shouldUseHorizontalLabels`. |
| Compact mode | Expo-router's smaller tab-bar variant; **only** entered on iPhone in landscape (`BottomTabBar.js:95-97`), so portrait phones always get the 28px icon. |
| `usableHeight` | Vertical space a single tab item's content may occupy: bar height minus the bar's own vertical padding minus the item's `padding: 5` on each side. |
| `requiredHeight` | Vertical space the icon plus the one-line label need at a given `fontScale`. |
| `fits` | `usableHeight >= requiredHeight`. When false, the label is laid out outside the bar and is clipped on native. |
| Safe-area inset | `insets.bottom` — the home-indicator / gesture-bar region at the screen bottom, supplied by `react-native-safe-area-context` under expo-router's `SafeAreaProvider`. |
| Stack overflow (this defect) | Required content height exceeding `usableHeight`; distinct from JavaScript call-stack overflow. |

## References

- `app/(tabs)/_layout.tsx:12-26` — `tabBarStyle` / `tabBarLabelStyle` under change (D-02); `:29-70` — unchanged titles and icons (CON-07)
- `node_modules/expo-router/build/react-navigation/bottom-tabs/views/BottomTabBar.js:47-49` — `TABBAR_HEIGHT_UIKIT = 49`, `TABBAR_HEIGHT_UIKIT_COMPACT = 32`; `:51` — `DEFAULT_MAX_TAB_ITEM_WIDTH = 125` (§1.2a); `:53-83` — `shouldUseHorizontalLabels`; `:63-78` — web/tablet branch; `:80-81` — phone portrait branch; `:84-99` — `isCompact`, `:95-97` iPhone-landscape-only; `:100-112` — `getTabBarHeight`, `:103-106` custom-height short-circuit; `:251-255` — `height: tabBarHeight` + inset padding; `:257` — `tabBarStyle` applied last (wins) (§1.2c)
- `.../bottom-tabs/views/BottomTabItem.js:12,17` — `SUPPORTS_LARGE_CONTENT_VIEWER` / `allowFontScaling` default (CON-08); `:49-79` — `renderLabel`; `:62-78` — `Label` render; `:96` — item `overflow`; `:130` — icon + label fragment; `:140-144` — `tabVerticalUiKit` `padding: 5` (§1.2b)
- `.../bottom-tabs/views/TabBarIcon.js:11-17` — icon size constants; `:19-23` — `iconSize` selection; `:62-69` — `wrapperUikit` 31×28 (§1.2b)
- `.../react-navigation/elements/Label/Label.js:8` — `numberOfLines: 1` (§1.2b)
- `node_modules/expo-router/build/ExpoRoot.js:78-84` — expo-router's own `SafeAreaProvider` (CON-03, D-02)
- `jest.config.js` — `roots: ['<rootDir>/utils']`, `testEnvironment: 'node'` (§1.3, D-03)
- `package.json:50` — `react-native-safe-area-context@~5.7.0` (CON-09)
- `AGENTS.md` §1.1 (spec-first), §1.3 (agent runs no CLIs), §1.4 (breaking changes + rollback), §1.5 (cross-platform), §1.7 (Expo Go), §1.8 (docs), §1.9 (spec format), §1.10 (spec-first + TDD platform matrix)