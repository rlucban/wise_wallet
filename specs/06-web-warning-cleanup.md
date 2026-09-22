# Spec 06: Web Warning Cleanup

| Field | Value |
|---|---|
| ID | SPEC-06 |
| Title | Web Warning Cleanup (shadow/boxShadow, textShadow, useNativeDriver, pointerEvents) |
| Status | **FINAL** (2026-09-22 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | Eliminate 4 web WARN classes with zero visual/behavior change on Android+iOS |
| Non-goals | New shadows/animations; native performance tuning; any other console warnings |
| Normative source | This file. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

Web builds log 4 warning classes:

- `"textShadow*"` style props are deprecated. Use `"textShadow"`.
- `"shadow*"` style props are deprecated. Use `"boxShadow"`.
- `Animated: useNativeDriver is not supported because the native animated module is missing.`
- `props.pointerEvents is deprecated. Use style.pointerEvents`.

Sources confirmed (non-normative cites, `:line` hints only):

- `textShadowColor/Offset/Radius`: `app/login.tsx:392-394,402-404`, `app/onboarding.tsx:163-165,171-173`, `app/register.tsx:323-325,333-335`.
- `shadowColor/Offset/Opacity/Radius`: `app/savings.tsx:17-20`, `app/login.tsx:411-414`, `app/register.tsx:342-345`, `app/onboarding.tsx:183-186`, `app/notifications.tsx:143-146,237-240`, `app/(tabs)/reports.tsx:39-42,197`, `app/(tabs)/learning.tsx:314-317`, `app/(tabs)/index.tsx:129-132,233-236`, `components/TransactionList.tsx:47-50`, `components/SummaryCard.tsx:47-50`.
- `useNativeDriver: true`: `components/SkeletonLoader.tsx:22,27` (`components/PiggyBank.tsx:19` already `false` — out of scope except to keep).
- `pointerEvents=` prop: `app/(tabs)/index.tsx:282`.

### 1.2 Definitions

**Native shadow** — `shadowColor` + `shadowOffset` + `shadowOpacity` + `shadowRadius` + `elevation`. Rendered on Android/iOS. MUST be preserved there.

**Web shadow** — `boxShadow` CSS shorthand string (e.g. `"0px 4px 8px rgba(0,0,0,0.2)"`). Sole shadow mechanism on web after this spec.

**Web text shadow** — `textShadow` CSS shorthand string (e.g. `"0px 2px 10px rgba(0,0,0,0.4)"`). Sole text-shadow mechanism on web after this spec.

## 2. Constraints (normative)

- **CON-01 — Native parity.** Android + iOS visuals and behavior MUST NOT change. Native builds MUST keep `shadow*` + `elevation` and `textShadow*` exactly as today.
- **CON-02 — Zero target warnings.** Web builds MUST emit zero instances of the 4 WARN strings in §1.1. Web MUST NOT receive `shadow*`, `textShadow*`, `pointerEvents` props, or `useNativeDriver: true`.
- **CON-03 — Standing repo invariants (AGENTS.md §1).** The implementation MUST keep Android + iOS + Web working (`Platform.OS`/`select`; MUST NOT statically import a native-only module at file top level); MUST keep web Vercel-deployable; MUST NOT introduce breaking changes to storage keys, API contract, AsyncStorage shapes, routes, or native deps.
- **CON-04 — Minimal scope.** Changes are limited to the files listed in §1.1 plus a shared helper if needed. No visual redesign, no animation retiming, no other warning classes.

## 3. Goal

Eliminate the 4 warnings via `Platform.select` branching: native keeps current props, web uses the modern equivalents.

| Warning | Android | iOS | Web |
|---|---|---|---|
| `shadow*` | `shadow*` + `elevation` unchanged | same as Android | `boxShadow` string only; no `shadow*` keys passed |
| `textShadow*` | `textShadow*` unchanged | same | `textShadow` string only; no `textShadow*` keys passed |
| `useNativeDriver` | `true` kept for opacity pulse | same as Android | `false` fallback; same opacity loop, no WARN |
| `pointerEvents` | badge non-interactive | same | `style.pointerEvents: "none"`; no prop, badge still non-interactive |

Resolved decisions (FINAL):

- DEC-01: branch inline with `Platform.select({ web: {...}, default: {...} })` at each style site. A shared `utils/shadows.ts` helper MAY be introduced only if it reduces duplication without changing values.
- DEC-02: `boxShadow`/`textShadow` string values MUST visually match current native values (same offsets, blur, rgba color+opacity).
- DEC-03: `SkeletonLoader` driver MUST be `Platform.OS !== "web"` (true on native, false on web). `PiggyBank` stays `false`.
- DEC-04: badge overlay MUST move `pointerEvents="none"` prop into `style.pointerEvents`.

### Acceptance criteria

Objective (machine-checkable):

- **ACC-01:** web console contains zero occurrences of `"textShadow*" style props are deprecated`, `"shadow*" style props are deprecated`, `useNativeDriver is not supported`, `props.pointerEvents is deprecated`.
- **ACC-02:** on `Platform.OS === "web"`, no style object passed to `View`/`Text` contains `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `textShadowColor`, `textShadowOffset`, `textShadowRadius` keys; no JSX contains `pointerEvents=` prop on the badge `View`.
- **ACC-03:** on `Platform.OS ∈ {"android","ios"}`, styles still contain the original `shadow*`/`textShadow*` keys with original values; badge remains non-interactive.
- **ACC-04:** `SkeletonLoader` passes `useNativeDriver: false` on web and `true` on native (`jest` with `Platform.OS` mock).

Subjective (human-judged, observable reviewer checks):

- **ACC-05:** reviewer confirms in Expo Go (Android+iOS) and `expo export --platform web`: cards, login/register/onboarding titles, badge overlay, and skeleton pulse look unchanged vs before; no red-box; banner/badge interaction unchanged. Pass = side-by-side screenshots show no visible difference.

## 4. Deliverables

- **D-01 — Shadow migration** per DEC-01/DEC-02: all §1.1 `shadow*` sites branch to `boxShadow` on web, keep `shadow*` + `elevation` on native.
- **D-02 — Text-shadow migration** per DEC-01/DEC-02: all §1.1 `textShadow*` sites branch to `textShadow` on web, keep `textShadow*` on native.
- **D-03 — Animation driver guard** per DEC-03: `components/SkeletonLoader.tsx` uses `Platform.OS !== "web"`.
- **D-04 — Pointer-events migration** per DEC-04: `app/(tabs)/index.tsx` badge uses `style.pointerEvents`.

## Glossary

| Term | Meaning |
|---|---|
| boxShadow | Web CSS shadow shorthand replacing `shadow*` on web |
| textShadow | Web CSS text-shadow shorthand replacing `textShadow*` on web |
| Native driver | `Animated` native execution; unavailable on web, falls back to JS |

## References

- `AGENTS.md §1` — working agreements (spec-first, invariants, §1.10 cross-platform TDD).
- Files listed in §1.1; `utils/apiClient.ts` untouched; `vercel.json` — web output config.
