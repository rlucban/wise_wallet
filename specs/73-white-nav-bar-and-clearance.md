# SPEC-73 — Solid White Nav Bar, zIndex, 100 Clearance

| Field | Value |
|---|---|
| ID | SPEC-73 |
| Title | Bottom nav solid white + zIndex 100 + 100 scroll clearance |
| Status | FINAL (per user call 2026-10-10 — implementable) |
| Owner | User |
| Version | 1.0 FINAL |
| Scope | `components/FloatingTabBar.tsx` + four tab screens (`index`, `reports`, `learning`, `settings`) + `utils/tabBarFloat.test.ts` (pin updates) |
| Non-goals | No `_layout.tsx` / FAB / active-pill / label change; no dark-mode pill change; no new deps; no SPEC-69 document edit |

RFC 2119 terminology (MUST/MUST NOT/SHOULD) applies.

## Context

The custom floating dock (`components/FloatingTabBar.tsx`, SPEC-69) currently
renders the pill with `backgroundColor: theme.dark ? "#2B2930" :
theme.colors.surface`, no `zIndex` on the overlay wrapper, and all four tab
screens clear it with `paddingBottom: 110` (`index.tsx:317`,
`reports.tsx:257`, `learning.tsx:255`, `settings.tsx:1269`). User call
2026-10-10: solid white (`#ffffff`) nav background, `zIndex: 100` so content
(charts) never bleeds under/behind the bar, and `paddingBottom: 100` scroll
clearance.

Overlap note (§1.14): pill styling and clearance values are owned by SPEC-69.
This spec supersedes exactly two SPEC-69 values (light pill background,
`110` clearance) and adds one key (`zIndex`); the SPEC-69 document is NOT
edited. `utils/tabBarFloat.test.ts` is SPEC-69's guard home — its `110` pins
would fail after this change, so updating them in place is REQUIRED (not
duplication). Dark pill (`#2B2930`, SPEC-63 D-07) is explicitly preserved.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay
  Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, or third-party code
  (AGENTS §1.12).
- **CON-03** Pill background MUST become
  `{ backgroundColor: theme.dark ? "#2B2930" : "#ffffff" }` — solid white in
  light mode, dark keeps `"#2B2930"` (SPEC-63 dark alignment intact). No other
  pill key changes.
- **CON-04** The overlay wrapper style MUST gain `zIndex: 100` (lifts pill +
  FAB together above scrolled content). No other overlay key changes
  (`position: "absolute"`, `bottom: 32`, margins, row, gap intact).
- **CON-05** Clearance MUST change `110` → `100` in exactly the four sites
  above (FlashList `contentContainerStyle`, two ScrollView
  `contentContainerStyle`s, `styles.scrollContent`). No other padding/margin
  in those files changes.
- **CON-06** Tailwind `pb-24` is translated to `paddingBottom: 100` — the
  repo uses `StyleSheet`, no Tailwind runtime exists and none is added.
- **CON-07** FAB, active pill (`#E8DEF8`), labels, and `_layout.tsx`
  delegation MUST stay byte-identical.
- **CON-08** No platform-only behavior: identical values on Android, iOS,
  and Web. Any `Platform.OS` branch needs its own amendment first (§1.10).
- **CON-09** No code, config, or dependency change before this spec is marked
  FINAL by the user (AGENTS §1.1, §1.10 CON-10 pattern).

## Goal

Light-mode nav is a solid white pill floating above all content; every tab
screen ends its scroll 100pt above the dock tail; dark mode is untouched.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Any tab (light) | View nav | Solid white pill + docked FAB, floating above content |
| Reports (light) | Scroll charts to end | Last chart fully visible above the pill, never under/behind it |
| Any tab (dark) | View nav | Dark pill (`#2B2930`) exactly as before |
| Any tab | Tap tab / FAB | Navigation identical to before |

### Decisions

- **DEC-01** White applies to light mode only (user call); dark keeps
  `#2B2930` (rejected: white-always, which would break dark contrast).
- **DEC-02** All four tabs drop to `100` (user call — uniform clearance;
  rejected: Reports-only, which would leave the four screens inconsistent).
- **DEC-03** `zIndex: 100` on the overlay wrapper (covers pill + FAB in one
  key; rejected: per-child zIndexes).
- **DEC-04** New SPEC-73 file is the canonical home for these three values;
  SPEC-69's document stays untouched while its test pins move with the values
  (§1.14 — updating a guard to its new norm is not duplication).

### Acceptance

Objective — deterministic, machine-checkable (jest, parameterized by
`Platform.OS` = `android` / `ios` / `web` via mock):

- **ACC-01** Source scan: `FloatingTabBar.tsx` overlay contains
  `zIndex: 100`; pill background reads `theme.dark ? "#2B2930" : "#ffffff"`;
  `theme.colors.surface` no longer sets the pill background. Holds on
  android/ios/web.
- **ACC-02** Source scan: all four tab screens contain `paddingBottom: 100`
  and none contains `paddingBottom: 110`. Holds on android/ios/web.
- **ACC-03** Source scan: FAB/active-pill/layout pins intact (`#E8DEF8`,
  row/`alignItems`/`gap: 12`, `tabBar={(props) => <FloatingTabBar`,
  no `tabBarStyle`). Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit
pass/fail observation steps, user-run per AGENTS §1.3 — agent never runs CLIs):

- **ACC-S01** Reviewer on Android/iOS (Expo Go, light mode) confirms: pill
  is solid white; scrolling Reports to the end leaves the last chart fully
  above the pill with no bleed under/behind; bar visibly floats above
  content. FAIL = bleed-through, non-white pill, or overlap.
- **ACC-S02** Reviewer on Android/iOS (Expo Go, dark mode) confirms: pill is
  still dark, labels/icons legible, clearance identical. FAIL = white pill
  in dark mode or any dark regression.
- **ACC-S03** Reviewer on Web confirms ACC-S01..S02 identically, no console
  error, no layout shift. FAIL = any web-only deviation (triggers a CON-08
  amendment, not a silent branch).

TDD coverage (§1.10): `utils/tabBarFloat.test.ts` updated — ACC-01 pins
`110` → `100`, plus new ACC-06 for white/zIndex/dark-kept — parameterized by
`Platform.OS` (android/ios/web); ACC-S01..S03 are user-run manual checks
exactly as written above.

## Deliverables

- **D-01** `components/FloatingTabBar.tsx` ONLY: pill background per CON-03
  + overlay `zIndex: 100` per CON-04. No other line changes.
- **D-02** Four tab screens ONLY: `110` → `100` at the four CON-05 sites.
  No other line in those files changes.
- **D-03** `utils/tabBarFloat.test.ts`: ACC-01 pins updated to `100`; new
  ACC-06 asserting ACC-01/ACC-03 (`zIndex: 100`, `"#ffffff"`, dark
  `"#2B2930"` kept) × android/ios/web. No other test file touched.
- **D-04** Docs after implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the
  spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Overlay:** the absolute-positioned wrapper in `FloatingTabBar.tsx`
  holding pill + FAB — the `zIndex` host.
- **Clearance:** the `paddingBottom` tail on tab scroll content that keeps
  the last item above the floating dock.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11
  bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/69-custom-floating-tab-bar.md` (SPEC-69 — pill + clearance home;
  document NOT amended; two values superseded here)
- `specs/63-ui-batch-settings-reports-literacy-dashboard-scheduled-dark-mode.md`
  (SPEC-63 D-07 — dark pill `#2B2930`; preserved)
- `components/FloatingTabBar.tsx` (pill bg line 17, overlay lines 82-90)
- `utils/tabBarFloat.test.ts` (guard home — `110` pins at lines 11-14)
