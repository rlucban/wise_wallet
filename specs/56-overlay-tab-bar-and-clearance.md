# SPEC-56 — Overlay Tab Bar (Absolute) + Screen Clearance

| Field | Value |
|---|---|
| ID | SPEC-56 |
| Title | Absolute-positioned overlay pill so page content scrolls behind it (true float + parallax); bottom clearance on all tab screens |
| Status | **FINAL** v0.1 (marked by user 2026-10-07; implementable per AGENTS.md §1.1) |
| Owner | User (final authority) |
| Version | v0.1 DRAFT |
| Scope | `app/(tabs)/_layout.tsx` (one style line) + bottom clearance in the 5 tab screens (`index`, `reports`, `learning`, `learning-detail`, `settings`) + test extension + journal |
| Non-goals | Veil (gone under SPEC-55); blur/`expo-blur`; label metrics, tints, capsule, dark lift, shadow, press easing (all frozen); dues/savings FABs (non-tab screens, bar never shows there); hook-driven dynamic insets; any screen logic, route, storage, API, dependency |
| Normative source | This file (once marked FINAL). File+symbol cites are normative; `:line` numbers are hints only. |

> History: v0.1 DRAFT 2026-10-07 from user calls ("remove the white rectangle
> behind the floating nav so it actually floats and appears parallax"; "make
> up your mind" — all decisions taken here, none deferred). No normative
> content before FINAL mark.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## Context

### Problem

In one sentence: **the pill is in-flow, so its margin gaps show the
un-themed root background (a white rectangle framing the bar) and page
content can never pass behind it — both fixed by overlaying the bar and
clearing content beneath it.**

### Evidence (verified read-only, this tree)

- `BottomTabBar.js:314-317` — `styles.bottom = { start: 0, end: 0, bottom: 0 }`
  with **no** `position`, so the bar is an in-flow flex item; the 16/32px
  margin gaps show the transparent ancestor chain down to the OS window.
- `BottomTabView.js` — `SafeAreaProviderCompat` column → screens (`flex: 1`)
  + bar: content ends where the bar begins, so parallax is structurally
  impossible in-flow.
- `BottomTabItem.js:140-146` — items are top-aligned (`justifyContent:
  'flex-start'`), so overlaying moves icons/labels nowhere relative to the
  pill; only the pill's screen position changes.
- Clearance touchpoints (all interior scroll tails + one FAB; nothing else in
  `app/(tabs)` is bottom-anchored, and nothing anywhere consumes
  `useBottomTabBarHeight`):
  - `app/(tabs)/index.tsx:309` FlashList `contentContainerStyle={{
    paddingBottom: 100 }}`; `:316` FAB `bottom: 20`.
  - `app/(tabs)/reports.tsx:247` `contentContainerStyle={{ paddingBottom: 32 }}`.
  - `app/(tabs)/learning.tsx:247` `scrollContent: { paddingBottom: 40, ... }`.
  - `app/(tabs)/learning-detail.tsx:191` `content: { padding: 16, ... }`.
  - `app/(tabs)/settings.tsx:1223` `contentContainerStyle={{ padding: 16 }}`.
- Worst-case pill footprint from the screen bottom: bar `78 + 34 = 112` +
  `marginBottom 32` = 144; +16 breathing room = **160**.

### Notes (informative)

- `dues.tsx`/`savings.tsx` FABs are stack screens without the tab bar —
  explicitly out of scope, verified by grep (no `FAB` under `app/(tabs)`
  except `index.tsx`).
- Overlay needs no root/window background change: once content scrolls
  behind the pill, the old white gap is page content by construction.

## Constraints (normative)

- **CON-56-01 — Bare-minimum diff (§1.11).** Only `position: "absolute"`
  added to `tabBarStyle`, the five clearance values below, and the files
  named in D-*. No other line in any touched file.
- **CON-56-02 — SPEC-52 amendment (named, declared overlap §1.14).**
  SPEC-52 CON-52-03 (in-flow) and DEC-52-01 are REVERSED by this spec, which
  governs positioning from here on; every other SPEC-52/SPEC-32 constraint
  (margins, height, capsule, shadow, press, tints, labels, metrics) stays
  frozen. Rationale recorded: in-flow cannot show content behind the bar, so
  the user's explicit parallax ask and CON-52-03 cannot coexist.
- **CON-56-03 — Clearance value (exact).** All five scroll tails MUST use
  `paddingBottom: 160` (= 112 worst-case bar + 32 float + 16 breathing);
  Home FAB `bottom: 20 → 160`. Static worst-case, repo-precedent style —
  no hook wiring, no per-device arithmetic, no re-render coupling.
- **CON-56-04 — Positioning shape (exact).** `tabBarStyle` gains exactly one
  key: `position: "absolute"`. `left`/`right`/`bottom: 0` already come from
  the library's `styles.bottom`; margins do the floating. No `top`, no `zIndex`,
  no `elevation` change.
- **CON-56-05 — No new dependencies (§1.12), no native imports.** Zero
  imports added anywhere in this spec.
- **CON-56-06 — Cross-platform / Expo Go / Vercel (§1.5–§1.7).** No new
  platform branch; web MUST NOT gain a warning (SPEC-06 parity).
- **CON-56-07 — TDD with cross-platform coverage (§1.10).** Source-text
  guards × `android`/`ios`/`web` + user-run matrix.
- **CON-56-08 — Docs (§1.8).** `docs/savepoint.md` + `AGENTS.md` §3 entry.
  Status flips to FINAL only on explicit user call.

## Goal

### Interaction matrix

| Platform | Bar | Behind the pill | Screen tails / FAB |
|---|---|---|---|
| Android | overlaid pill, same look | scrolling page content (themed) | last items reachable; FAB above pill |
| iOS | same | same | same; clears home indicator |
| Web | same, no warnings | same | same |

### Decisions (all taken, none deferred)

- **DEC-56-01:** absolute overlay over root-background matching — only the
  overlay shows *content* (parallax); a paint match shows a dead tint and
  keeps the structural lie.
- **DEC-56-02:** static 160 clearance over `useBottomTabBarHeight` wiring —
  five one-line style edits, zero logic/re-render risk, consistent with the
  repo's pinned-constant style (SPEC-32).
- **DEC-56-03:** no per-screen inset arithmetic — worst-case covers every
  device; the small extra tail on inset-0 phones is ordinary scroll padding
  (Home already ships 100 today).

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-01 | ✅ | ✅ | ✅ | `tabBarStyle` contains exactly one new key `position: "absolute"`; margins/height/capsule/shadow/press/tints intact |
| ACC-02 | ✅ | ✅ | ✅ | Five tails read `paddingBottom: 160` (index FlashList, reports, learning `scrollContent`, learning-detail `content`, settings); Home FAB `bottom: 160` |
| ACC-03 | ✅ | ✅ | ✅ | No other bottom-anchored element remains in `app/(tabs)` (guard: no `bottom: 20`, no `bottom: 0`, no second `position: "absolute"` outside `_layout.tsx` + index FAB) |
| ACC-04 | ✅ | ✅ | ✅ | `jest` 0 failed, `lint` clean, `tsc` clean; no dep/route/storage change |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** no white rectangle in light or dark — margins show scrolling page content behind the pill.
- **ACC-S02:** last item fully reachable on all four tabs (scroll to end: nothing hides under the pill); Home FAB tappable above the pill.
- **ACC-S03:** rotation safe (portrait + landscape, notch + no-notch): pill never covers content, labels intact.

## Deliverables

- **D-56-01 (`app/(tabs)/_layout.tsx`):** add `position: "absolute"` to
  `tabBarStyle` (+ one-line SPEC-56 comment). Nothing else.
- **D-56-02 (five screens):** index FlashList `100 → 160` + FAB `bottom:
  160`; reports `32 → 160`; learning `scrollContent` `40 → 160`;
  learning-detail `content` add `paddingBottom: 160`; settings
  `contentContainerStyle` add `paddingBottom: 160`.
- **D-56-03 (`utils/tabBarFloat.test.ts`, extend):** ACC-01..03 across
  `android`/`ios`/`web`.
- **D-56-04 (user-run matrix + docs):** ACC-S01..S03, `docs/savepoint.md` +
  `AGENTS.md` §3 per §1.8.

## Glossary

- **Overlay:** `position: "absolute"` bar painted over full-height screens (content scrolls beneath).
- **Clearance:** bottom padding guaranteeing the last content sits above the pill's top edge.
- **White rectangle:** the un-themed root background previously visible in the in-flow margin gaps.

## References

- `app/(tabs)/_layout.tsx` (SPEC-52 v1.1 surface) · `app/(tabs)/index.tsx:309,316` · `app/(tabs)/reports.tsx:247` · `app/(tabs)/learning.tsx:110,247` · `app/(tabs)/learning-detail.tsx:191` · `app/(tabs)/settings.tsx:1223` · `node_modules/expo-router/build/react-navigation/bottom-tabs/views/BottomTabBar.js:205,220,252,258,303-320` (`styles.bottom`, `tabBarStyle`-last, absent-background behavior) · `node_modules/expo-router/build/react-navigation/bottom-tabs/views/BottomTabView.js` (column layout) · `node_modules/expo-router/build/react-navigation/bottom-tabs/views/BottomTabItem.js:140-146`.
- `specs/52-floating-tab-bar.md` (CON-52-03/DEC-52-01 reversed here) · `specs/55-remove-veil-raise-enlarge-tab-bar.md` (still being implemented — execute its leftovers first) · `specs/32-tab-bar-label-visibility.md` (metrics frozen) · `specs/06-web-warning-cleanup.md`.