# SPEC-91 — Lock Screen iOS-Entry Parity (Mirror Step-1)

| Field | Value |
|---|---|
| ID | SPEC-91 |
| Title | Lock screen adopts the Step-1 title/note/hidden-input look |
| Status | **FINAL v1.8** (v1.0–v1.8 per user calls 2026-10-11 — implementable) |
| Owner | User (final authority) |
| Version | 1.0 FINAL |
| Scope | `app/passcode-screen.tsx` ONLY + one new guard file `utils/lockScreenEntryUi.test.ts` |
| Non-goals | No dots/logic change (already the reference); no behavior change (auto-submit at 4, error + 600ms clear, unlock, SPEC-90 mark); no lockout machinery; no blur/backdrop change (full-screen gate, nothing behind it); no Step-1/settings change; no new deps |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

RFC 2119 terminology (MUST/MUST NOT/SHOULD/MAY) applies. Informative prose ("today", "currently") is non-normative unless restated as a requirement.

## Context

User call 2026-10-11 with the lock-screen screenshot (`Enter Passcode / Enter your 4-digit PIN to access WiseWallet` + dots + visible box), quoting the Step-1 copy (`Enter passcode / After 3 failed attempts you'll need to reset your passcode.`): *"ito oh ganito nalang din dapat"* — the lock screen should look like the Step-1 UI.

Today (source-traced, `passcode-screen.tsx`): title `Enter Passcode` + subtitle `Enter your 4-digit PIN to access WiseWallet` (`:48-53`), 4 filled dots (`:55-73`, the reference SPEC-89 v1.1 mirrored), and a VISIBLE labeled box (`4-Digit Passcode`, `:76-91`). The gate logic (sanitize → auto-submit at 4 → `verifyPasscode` → unlock+mark else error+clear, `:24-42`) is not in scope.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay Expo Go (latest) import-safe, and stay Vercel-deployable. (This screen IS the app gate — extra care: nothing may break its mount/focus/verify path.)
- **CON-02** No new npm packages, native modules, fonts, images, or third-party code (AGENTS §1.12). `Pressable` comes from the existing `react-native` import.
- **CON-03** Bare-minimum diff (AGENTS §1.11). ONLY: title/subtitle text, dots tap-wrap, input visibility, dead-style removal (CON-06), card sizing (CON-09). Dots render, all handlers, all other styles, error `HelperText`, and every other line stay byte-identical.
- **CON-04** Exact copy (FINAL): title becomes `Enter passcode`; subtitle becomes the static note `After 3 failed attempts you'll need to reset your passcode.` (string-expression form, verbatim for the guard — same honesty caveat as SPEC-89: static text, unenforced, user-accepted).
- **CON-05** Hidden box (mirrors Step-1): the `TextInput` keeps `ref`/`value`/`onChangeText`/`keyboardType="numeric"`/`secureTextEntry`/`maxLength={4}`/`autoFocus` and drops `mode`/`label`/`placeholder`/`error`/`style`/`contentStyle` for `style={{ opacity: 0, height: 1 }}`; the dots row wraps in a `Pressable` (`onPress` → `inputRef.current?.focus()`, keeps `styles.dotsContainer`).
- **CON-06** Dead styles go: `styles.input` + `styles.inputContent` (unused after CON-05 — same `walletEmoji` precedent as SPEC-86); `errorText` stays (still used).
- **CON-07** Identical on Android, iOS, and Web — no `Platform.OS` / `Platform.select` branch. Any platform branch needs its own amendment first (§1.10).
- **CON-08** No code, config, or dependency change before this spec is marked FINAL by the user (AGENTS §1.1).
- **CON-09** Card sizing (FINAL): card `maxWidth: 380` → `440`, `cardContent` `paddingVertical: 32` → `48`. Width cap, centering, `borderRadius`, paddings horizontal, and everything else stay byte-identical.

## Goal

Lock screen and Step-1 are visually one language (title + note + 4 dots, no box); the gate verifies exactly like today.

### Interaction matrix

| Surface | Today | After (FINAL) |
|---|---|---|
| Lock title/subtitle | `Enter Passcode` / `Enter your 4-digit PIN…` | `Enter passcode` / static 3-attempts note |
| Entry visual | Dots + visible box | Dots only (hidden input, tap-to-focus) |
| Card size | `maxWidth: 380`, content `paddingVertical: 32` | `maxWidth: 440`, content `paddingVertical: 48` |
| Typing / wrong PIN / unlock | As today | Byte-identical |
| Step-1 dialog | As SPEC-89 v1.1 | Byte-identical |

### Decisions (FINAL — user marked final 2026-10-11 with no overriding calls; DRAFT proposals adopted as-is)

- **DEC-01 (FINAL)** Lock screen mirrors Step-1 (user call 2026-10-11 with screenshot + quoted copy).
- **DEC-02 (FINAL)** Hidden box + tap-to-focus (rejected: keeping the visible box — contradicts the ordered mirror).
- **DEC-03 (FINAL)** Dots/logic zero-change — they are already the reference both surfaces share (rejected: any dot restyle).
- **DEC-04 (FINAL)** Note static, same caveat as SPEC-89 DEC-03 (rejected: lockout machinery — out of scope, unasked).
- **DEC-05 (FINAL)** Bigger card per CON-09.

### Acceptance

Platform matrix (§1.10): every Objective guard holds on `android` / `ios` / `web` (jest `Platform.OS` mock — no platform branch in the change); every Subjective check is user-run on Expo Go (Android/iOS) + `expo export --platform web` (agent never runs CLIs per AGENTS §1.3).

Objective — deterministic, machine-checkable (jest source-scan guards):

- **ACC-01** Lock screen holds title `Enter passcode`, the static note verbatim, the 4-dot render with lock fill logic, a hidden input (`opacity: 0`, same handlers/keyboard/secure/maxLength/autoFocus/ref, tap-focus wiring), and zero `label=`/`placeholder=` on it. Holds on android/ios/web.
- **ACC-02** Behavior intact: digit-sanitize + auto-submit at 4, `verifyPasscode` → unlock + `markPinVerified`, `Incorrect passcode. Please try again.` + 600ms clear, error `HelperText` present. Holds on android/ios/web.
- **ACC-03** Scope: card size per CON-09 (`maxWidth: 440`, `paddingVertical: 48`) with all other styles intact; `styles.input`/`inputContent` gone (no dead styles); single sanctioned `Platform.OS` ternary only (pinned by ACC-04 — CON-12 exception to the v1.0 rule); no lockout identifiers; settings Step-1 untouched. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit pass/fail, user-run):

- **ACC-S01** Reviewer on Android/iOS (Expo Go) confirms: lock screen visually matches Step-1 (title/note/dots, no box); tapping dots summons the keyboard; typing fills dots (digits never shown); wrong PIN → red dots + same error + clears; correct PIN unlocks; dark mode clean. FAIL = box remnant, copy mismatch, focus/verify breakage.
- **ACC-S02** Reviewer on Web confirms ACC-S01 identically with no console error. FAIL = any web-only deviation.

TDD coverage (§1.10): `utils/lockScreenEntryUi.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02 are user-run manual checks exactly as written (focus/keyboard/dots are not jest-renderable — guards pin the contract).

## Deliverables

- **D-01** `app/passcode-screen.tsx` ONLY: title/note copy + dots tap-wrap + hidden input + dead-style removal per CON-04..CON-06 + card sizing per CON-09. No other line changes.
- **D-02** `utils/lockScreenEntryUi.test.ts` (new file, named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-03** Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Mirror:** lock screen carries the Step-1 title/note/hidden-input contract verbatim.
- **Reference dots:** the 16px filled `error/primary/outlineVariant` dots both surfaces share after SPEC-89 v1.1.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/89-change-passcode-ios-entry-ui.md` v1.1 (Step-1 home — mirrored, NOT amended)
- `app/passcode-screen.tsx:6-9,24-42,48-91,104-155` (imports/unlock/title/dots/input/styles)

---

## v1.1 Amendment — Raised Card, iOS Keyboard Avoidance, Unlock Button (FINAL per user call 2026-10-11)

User call 2026-10-11 ("lock, (c), (a)" + earlier "iaangat, wag icenter"): on iOS the keyboard covers the centered card — confirmed, this screen has no `KeyboardAvoidingView`/`ScrollView` (unlike register/login/onboarding). Ordered: raise the card (not centered) + a visible button like the others. v1.0 sections stay normative; where this amendment conflicts, v1.1 governs.

### v1.1 Constraints (delta)

- **CON-10** Raised + avoidance: the outer `View` keeps only `flex: 1` + bg; a new `KeyboardAvoidingView` (`behavior={Platform.OS === "ios" ? "padding" : "height"}` — the exact register/login precedent — `style` flex 1 / width 100% / `justifyContent: "flex-start"` / `alignItems: "center"` / `paddingTop: 80` / `paddingHorizontal: 24`) wraps the `Card`. `Platform` import added (disclosed wiring). Rejected: `ScrollView` (gate screen, single card — KAV suffices per precedent); rejected: staying centered.
- **CON-11** Unlock button: contained Paper `Button` `"Unlock"` below the error block, full width, `disabled={input.length !== 4}` (mirrors Step-1's Verify rule); `onPress` reuses the identical verify path (`handleInputChange(input)` — one line, zero duplicated logic, auto-submit untouched). The label is the single new UI string (user-ordered, FINAL-adjustable).
- **CON-12** The `Platform.OS` behavior ternary is the sanctioned exception to v1.0 CON-07 (register/login precedent); no OTHER `Platform` branch. No v1.1 code beyond D-04/D-05. v1.0 deliverables stand.

### v1.1 Goal (delta)

| Surface | Today (v1.0) | After (v1.1 FINAL) |
|---|---|---|
| Card position | Vertically centered | Raised (`flex-start` + 80 top) + iOS keyboard avoidance |
| Submit | Auto-submit only | + `Unlock` button (same-path submit, disabled until 4) |
| Dots/copy/error/unlock | As v1.0 | Byte-identical |

Decisions:

- **DEC-06** Raised KAV layout (user calls; rejected: centered + ScrollView).
- **DEC-07** Unlock button reusing the path (user call (a); rejected: duplicated verify logic; rejected: new validation copy — disabled-rule + identical path instead).
- **DEC-08** Guards extend `lockScreenEntryUi.test.ts` (rejected: new guard file — same home).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-04** Source scan: KAV present with centered style (`justifyContent center + padding 24`); zero `Platform.OS` ternary (removed by v1.4 — see ACC-10); no other `Platform` in the file. Holds on android/ios/web.
- **ACC-05** Source scan: contained `Unlock` button, full width, `disabled={input.length !== 4}`, `onPress` reusing `handleInputChange(input)`; auto-submit-at-4, error copy/clear, dots, note, hidden input all still present. Holds on android/ios/web.
- **ACC-S03** Reviewer on iOS (Expo Go) confirms: card sits raised; keyboard no longer covers dots/button (view shifts); tap-dots, typing, button-unlock, wrong-PIN, and dark mode all behave. FAIL = covered card or any behavior break.
- **ACC-S04** Reviewer on Android + Web confirms ACC-S03 identically with no console error. FAIL = any platform-only deviation.

### v1.1 Deliverables (delta)

- **D-04** `app/passcode-screen.tsx` ONLY: KAV wrap + container/position per CON-10 + Unlock button per CON-11. No other line changes.
- **D-05** `utils/lockScreenEntryUi.test.ts`: extended with ACC-04/ACC-05 × android/ios/web (no new test file per DEC-08).
- **D-06** Docs after v1.1 implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line.

---

## v1.2 Amendment — Lock Back to Centered (FINAL per user call 2026-10-11)

User call 2026-10-11 ("may inadjust ka na hindi center, di naman yun pinapa-adjust ko"): the v1.1 raise hit the wrong surface — the lock screen goes back to centered. KAV + Unlock button stay (separately ordered, no complaints — KAV is invisible when the keyboard is hidden). v1.0/v1.1 sections stay normative; where this amendment conflicts, v1.2 governs.

### v1.2 Constraints (delta)

- **CON-13** Re-center only: the KAV `style` becomes `{ flex: 1, width: "100%", justifyContent: "center", alignItems: "center", padding: 24 }` (the v1.0 centered layout restored onto the KAV; outer container stays flex-1-only). KAV/behavior ternary, Unlock button, dots, copy, hidden input, error, and gate logic stay byte-identical. Rejected: full v1.1 revert (KAV + button were separately ordered); rejected: keeping raised.
- **CON-14** No v1.2 code beyond D-07/D-08. v1.0/v1.1 deliverables stand.

### v1.2 Goal (delta)

| Surface | Today (v1.1) | After (v1.2 FINAL) |
|---|---|---|
| Card position | Raised (`flex-start` + 80 top) | Centered again (KAV + button kept) |
| Everything else | As v1.1 | Byte-identical |

Decisions:

- **DEC-11** Re-center per user call (rejected: keep raised; rejected: full revert).
- **DEC-12** Guards extend `lockScreenEntryUi.test.ts` (rejected: new guard file — same home).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-08** Source scan: KAV style holds `justifyContent: "center"` + `padding: 24` with zero `flex-start` / `paddingTop: 80` in the file; KAV ternary, Unlock button, dots, and v1.0 copies all still present. Holds on android/ios/web.
- **ACC-S05** Reviewer on iOS (Expo Go) confirms: card centered; keyboard still clears it (KAV); button unlocks; dark mode clean. FAIL = off-center card or any behavior break.
- **ACC-S06** Reviewer on Android + Web confirms ACC-S05 identically with no console error. FAIL = any platform-only deviation.

### v1.2 Deliverables (delta)

- **D-07** `app/passcode-screen.tsx` ONLY: KAV style re-center per CON-13. No other line changes.
- **D-08** `utils/lockScreenEntryUi.test.ts`: extended with ACC-08 × android/ios/web (no new test file per DEC-12).
- **D-09** Docs after v1.2 implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line.

---

## v1.3 Amendment — Lock Scroll-Bound (Same Overshoot Class as Dialog) (FINAL per user call 2026-10-11)

User call 2026-10-11 with phone screenshot: on the lock screen, keyboard-up pushes the title under the status bar and the button out of reach — KAV-`padding` overshoot on tall content, the same class SPEC-89 v1.3/v1.4 just fixed on the dialog (this screen has KAV but no `ScrollView`). "Flexible sa web at phone" = one responsive scrolled layout for both. v1.0–v1.2 sections stay normative; where this amendment conflicts, v1.3 governs.

Late correction at FINAL-mark (disclosed, SPEC-35 precedent): CON-15 keeps the v1.2 KAV style byte-identical — trimming it to flex-only (as first drafted) would full-bleed the 100%-width `Card` on phone (the dialog keeps margins via its 90%-width Surface; the lock Card relies on the KAV `padding: 24` frame). ScrollView-only delta.

### v1.3 Constraints (delta)

- **CON-15** Bound the lock (ScrollView wrap only): KAV style stays byte-identical (v1.2 centered + `padding: 24` frame — load-bearing for the 100%-width `Card`); new `ScrollView` with `style={{ flex: 1, width: "100%" }}`, `contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", width: "100%" }}`, `keyboardShouldPersistTaps="handled"` wraps the `Card` (open after KAV open, close before KAV close). `ScrollView` import added (disclosed wiring — same `react-native` line, no new dep). Every content line byte-identical. Rejected: KAV trim (edge-to-edge regression — caught pre-implementation); rejected: KAV-only (just disproven on this screen); rejected: restyle/resize.
- **CON-16** No v1.3 code beyond D-10/D-11. v1.0–v1.2 deliverables stand.

### v1.3 Goal (delta)

| Surface | Today (v1.2) | After (v1.3 FINAL) |
|---|---|---|
| Keyboard up on phone | Title under status bar, button out of reach | Bounded shift + scroll: everything reachable |
| Content/dots/copy/button | As v1.2 | Byte-identical, one responsive layout (web + phone) |

Decisions:

- **DEC-13** SPEC-89 v1.4 pattern reused (rejected: new layout concept — one proven pattern for both PIN surfaces).
- **DEC-14** Guards extend `lockScreenEntryUi.test.ts` (rejected: new guard file — same home).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-09** Source scan: `ScrollView` import present; KAV contains `ScrollView` (open + close) wrapping the `Card`; ScrollView style holds `flex: 1` + `width: "100%"`; content container holds `flexGrow: 1` + `keyboardShouldPersistTaps`; v1.2 KAV centered style intact (`justifyContent center + padding 24`); dots/copy/button/error intact. Holds on android/ios/web.
- **ACC-S07** Reviewer on iOS (Expo Go, phone) confirms: keyboard up — title/note clear of the status bar (scroll if needed), dots + Unlock button reachable; keyboard down — normal centered card. FAIL = clipped top or unreachable button.
- **ACC-S08** Reviewer on Android + Web confirms ACC-S07 identically with no console error. FAIL = any platform-only deviation.

### v1.3 Deliverables (delta)

- **D-10** `app/passcode-screen.tsx` ONLY: ScrollView import + open/close wrap per CON-15. No other line changes.
- **D-11** `utils/lockScreenEntryUi.test.ts`: extended with ACC-09 × android/ios/web (no new test file per DEC-14).
- **D-12** Docs after v1.3 implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line.

---

## v1.4 Amendment — Height Behavior (Padding Pushes Tall Content Off-Top) (FINAL per user call 2026-10-11)

User call 2026-10-11 ("na scroll naman sya pero nasa pinaka taas parin sya"): ScrollView made everything reachable, but keyboard-up still parks the content at the very top — `behavior="padding"` adds the FULL keyboard height at the bottom, shoving a tall card upward. Height behavior instead shrinks from the bottom: top stays anchored, the ~470pt card fits the visible area, scroll remains as fallback. v1.0–v1.3 sections stay normative; where this amendment conflicts, v1.4 governs.

### v1.4 Constraints (delta)

- **CON-17** Two-line change: KAV `behavior` → `"height"` (drop the iOS/`height` ternary — Android already ran `height`, web ignores it, so zero Android/web behavior change); remove the now-unused `Platform` import (else unused-import lint). KAV/ScrollView/Card/content/dots/copy/button/error all byte-identical. Rejected: keeping `padding` (device-disproven twice); rejected: new chrome.
- **CON-18** No v1.4 code beyond D-13/D-14. v1.0–v1.3 deliverables stand.

### v1.4 Goal (delta)

| Surface | Today (v1.3) | After (v1.4 FINAL) |
|---|---|---|
| Keyboard up | Content parked at top (padding push) | Top anchored, card fits visible area, scroll fallback |
| Keyboard down / Android / web | As v1.3 | Byte-identical |

Decisions:

- **DEC-15** Height behavior (rejected: padding — disproven on device for tall content; rejected: removing KAV — height IS the KAV fix, ScrollView stays as fallback).
- **DEC-16** Guards extend `lockScreenEntryUi.test.ts` (rejected: new guard file — same home).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-10** Source scan: KAV `behavior="height"` with zero behavior ternary; zero `Platform` import/usage in the file; KAV + ScrollView wrap + dots/copy/button/error intact. Holds on android/ios/web.
- **ACC-S09** Reviewer on iOS (Expo Go, phone) confirms: keyboard up — title sits below the status bar (no scroll needed for the normal card), dots + Unlock reachable; keyboard down — centered as before. FAIL = top-clipped content.
- **ACC-S10** Reviewer on Android + Web confirms ACC-S09 identically with no console error. FAIL = any platform-only deviation.

### v1.4 Deliverables (delta)

- **D-13** `app/passcode-screen.tsx` ONLY: behavior string + import removal per CON-17. No other line changes.
- **D-14** `utils/lockScreenEntryUi.test.ts`: extended with ACC-10 × android/ios/web (no new test file per DEC-16).
- **D-15** Docs after v1.4 implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line.

---

## v1.5 Amendment — Remove KAV, Scroll Only (FINAL per user call 2026-10-11)

User call 2026-10-11 ("paulit ulit nako sayo nasa taas parin sya i center mo lahat" + "na scroll naman sya"): three turns of KAV-driven positioning bugs (v1.1 padding push → v1.3 stretch → v1.4 top-park) against zero KAV wins on this screen. The user already proved manual scroll works. So: KAV goes, scroll stays — centering becomes deterministic in every keyboard state (nothing left to push content upward). v1.0–v1.4 sections stay normative; where this amendment conflicts, v1.5 governs.

### v1.5 Constraints (delta)

- **CON-19** Subtract and reframe (corrected at FINAL-mark — as drafted, dropping KAV also dropped its load-bearing `padding: 24` frame, which would full-bleed the 100%-width `Card`): delete the KAV open + close tags; move the frame onto the content container (`contentContainerStyle` gains `padding: 24`); ScrollView `style` + centered flexGrow container + persistTaps + `Card` + every content line otherwise byte-identical. `KeyboardAvoidingView` dropped from the import (unused-import lint). Rejected: KAV trim variants (edge-to-edge regression — caught pre-implementation); rejected: restyle/resize.
- **CON-20** No v1.5 code beyond D-16/D-17. v1.0–v1.4 deliverables stand except the supersessions below.

Explicit supersessions (§1.14 — superseded text NOT edited, this section governs):
- v1.1 ACC-04 + v1.2 ACC-08 + v1.3 ACC-09 KAV pins → rewritten by D-17 (KAV gone; centering + wrap now pinned on the ScrollView content container).
- v1.4 ACC-10 behavior/import pins → rewritten by D-17 (no behavior string, no `Platform`, no KAV anywhere).

### v1.5 Goal (delta)

| Surface | Today (v1.4) | After (v1.5 FINAL) |
|---|---|---|
| Resting position | Top-parked (KAV push) | Centered, always (nothing shifts it) |
| Keyboard covers | Shift-then-scroll (broken) | Manual scroll (user-proven working) |
| Content/dots/copy/button | As v1.4 | Byte-identical |

Decisions:

- **DEC-17** Remove KAV (rejected: fourth KAV tuning round — the pattern is the problem, not the parameters).
- **DEC-18** Guards rewritten in place, no new ACC number (rejected: new guard file — same home).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-04/08/10 (rewritten)** Source scan: zero `KeyboardAvoidingView`, zero `behavior=`, zero `Platform` in the file; `ScrollView` flex-bounded with centered `flexGrow` container directly under the root `View`; card 440/48, dots, note, hidden input, Unlock button, error, unlock+mark all intact. Holds on android/ios/web.
- **ACC-S11** Reviewer on iOS (Expo Go, phone) confirms: content centered with keyboard closed AND open (scroll only if covered); dots fill, Unlock works, wrong-PIN path intact; dark mode clean. FAIL = top-parked content.
- **ACC-S12** Reviewer on Android + Web confirms ACC-S11 identically with no console error. FAIL = any platform-only deviation.

### v1.5 Deliverables (delta)

- **D-16** `app/passcode-screen.tsx` ONLY: KAV tag removal + import trim per CON-19. No other line changes.
- **D-17** `utils/lockScreenEntryUi.test.ts`: ACC-04/08/09/10 rewritten per the supersessions above × android/ios/web (no new test file per DEC-18).
- **D-18** Docs after v1.5 implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line.

---

## v1.6 Amendment — Flex Wrapper Above the Gate (The Actual Root Cause) (FINAL per user call 2026-10-11)

User call 2026-10-11 with web-vs-phone proof (web centered, phone top-parked, SAME bundle): the lock screen was innocent — its centering was correct all along. Root cause, source-traced in `app/_layout.tsx`: the gate early-returns `<PasscodeScreen />` BARE (`:207-209`), while the normal tree gets `<View style={{ flex: 1 }}>` (`:214`). On native the unbounded chain collapses `flex: 1` to content height (top-parked under a flex-start parent); on web the height-100% root chain masks it (centered). This also explains why login (inside the Stack host) always centered. v1.0–v1.5 sections stay normative; where this amendment conflicts, v1.6 governs.

### v1.6 Constraints (delta)

- **CON-21** Bounded + themed gate ONLY (`app/_layout.tsx:207-209`): the early return renders `<PaperProvider theme={theme}>` (user-added — kept: the lock screen's `useTheme()` needs it for dark mode) with `<View style={{ flex: 1 }}><PasscodeScreen /></View>` inside (mirrors line 214's wrapper). No other `_layout` line changes (guards, providers, Stack all byte-identical); NO lock-screen file change (proves the screen innocent).
- **CON-22** No v1.6 code beyond D-19/D-20. v1.0–v1.5 deliverables stand.

### v1.6 Goal (delta)

| Surface | Today (v1.5) | After (v1.6 FINAL) |
|---|---|---|
| Phone gate | Unbounded chain → top-parked | Bounded flex chain → centered, web == phone |
| Web gate | Centered | Byte-identical |
| Lock screen file | As v1.5 | Byte-identical (untouched) |

Decisions:

- **DEC-19** Wrap above, not tune inside (rejected: further lock-screen tuning — five turns proved the screen was never the bug; rejected: Dimensions heights — rotation-stale, wrapper is exact).
- **DEC-20** Guards extend `lockScreenEntryUi.test.ts` (rejected: new guard file — same home).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-11** Source scan: the gate early-return renders `PaperProvider` (theme) with `PasscodeScreen` in a `flex: 1` `View` inside; line 214's wrapper, all guards/providers/Stack untouched; lock screen file holds zero `KeyboardAvoidingView` (v1.5 state intact). Holds on android/ios/web.
- **ACC-S13** Reviewer on iOS (Expo Go, phone, fresh reload after logout) confirms: lock content centered, web == phone pixel-for-pixel in arrangement; dots fill, Unlock works. FAIL = top-parked content.
- **ACC-S14** Reviewer on Android + Web confirms ACC-S13 identically with no console error. FAIL = any platform-only deviation.

### v1.6 Deliverables (delta)

- **D-19** `app/_layout.tsx` ONLY: flex-1 wrapper around the gate return per CON-21. No other line changes.
- **D-20** `utils/lockScreenEntryUi.test.ts`: extended with ACC-11 × android/ios/web (no new test file per DEC-20).
- **D-21** Docs after v1.6 implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line.

---

## v1.7 Amendment — Park the Hidden Input at Top (Defeat Auto-Scroll) (FINAL per user call 2026-10-11)

User call 2026-10-11 with phone screenshot (dots at top, button stuck below, no keyboard open — modal confirmed OK): with KAV gone, the remaining pusher is iOS auto-scroll-to-focused-input — on mount `autoFocus` focuses the hidden 1px field and RN scrolls it into view, parking content at the top. Fix: park the field itself at the top — an already-visible target needs zero scroll. v1.0–v1.6 sections stay normative; where this amendment conflicts, v1.7 governs.

### v1.7 Constraints (delta)

- **CON-21** Reposition only: the hidden `TextInput` takes `style={{ opacity: 0, height: 1, position: "absolute", top: 0, left: 0, right: 0 }}` (top of `Card.Content`, always visible region — auto-scroll becomes a no-op); `ref`/`value`/`onChangeText`/`keyboardType`/`secureTextEntry`/`maxLength`/`autoFocus` byte-identical, tap-dots-to-focus unchanged. Rejected: removing `autoFocus` (changes entry behavior); rejected: `scrollEnabled={false}` (kills the user-proven fallback); rejected: restyle.
- **CON-22** No v1.7 code beyond D-22/D-23. v1.0–v1.6 deliverables stand.

### v1.7 Goal (delta)

| Surface | Today (v1.6) | After (v1.7 FINAL) |
|---|---|---|
| Focus/keyboard open | Auto-scroll parks content at top | Target already visible → zero shift, stays centered |
| Entry/verify/unlock | As v1.6 | Byte-identical |

Decisions:

- **DEC-19** Absolute-top hidden input (rejected: new layout concept — one prop change).
- **DEC-20** Guards extend `lockScreenEntryUi.test.ts` (rejected: new guard file — same home).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-12** Source scan: hidden input style holds `opacity: 0` + `height: 1` + `position: "absolute"` + `top: 0`; `ref`/`autoFocus`/handlers intact; dots/copy/button/error intact. Holds on android/ios/web.
- **ACC-S15** Reviewer on iOS (Expo Go, phone) confirms: from mount through typing, content never parks at top — centered with keyboard closed, stable with keyboard open; dots fill, Unlock works. FAIL = top-parked content.
- **ACC-S16** Reviewer on Android + Web confirms ACC-S15 identically with no console error. FAIL = any platform-only deviation.

### v1.7 Deliverables (delta)

- **D-22** `app/passcode-screen.tsx` ONLY: hidden-input style per CON-21. No other line changes.
- **D-23** `utils/lockScreenEntryUi.test.ts`: extended with ACC-12 × android/ios/web (no new test file per DEC-20).
- **D-24** Docs after v1.7 implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line.

---

## v1.8 Amendment — Adopt User Rewrite as Baseline + Reconcile (FINAL per user call 2026-10-11)

User call 2026-10-11 ("a"): the user rewrote `app/passcode-screen.tsx` by hand (163 lines) — `absoluteFillObject` root + full-screen tap-anywhere `Pressable` (`inner`: flex/centered/32/48) + `headlineMedium` title + dots 18/gap-20 + stylesheet `hiddenInput` (opacity 0, 1×1, absolute, NO `top`) + `errorContainer` + styled `Unlock` (`100%`/`320`/`12`) — Card/KAV/ScrollView/visible box gone. Their structure already fixes top-park structurally (no shifters left). v1.7's D-22 never landed (edit failed on drifted text) and is superseded here, not retried. v1.0–v1.7 sections stay normative; where this amendment conflicts, v1.8 governs.

### v1.8 Constraints (delta)

- **CON-23** Reconcile ONLY (their design adopted as-is): (1) import line drops unused `KeyboardAvoidingView` + `Platform`, gains `ScrollView` (lint is red today); (2) `hiddenInput` gains `top: 0` (auto-scroll kill — absolute without `top` still sits mid-flow); (3) `ScrollView` (`style` flex:1/width:100%, `contentContainerStyle` flexGrow/center/center/width:100% + `keyboardShouldPersistTaps="handled"`) inserted between the `Pressable` open and the title, closed before `</Pressable>` (scroll fallback restored, tap-anywhere + centering + paddings untouched). Their dots/title/button/error styles byte-identical. Rejected: reverting to any spec-shaped tree; rejected: restyle.
- **CON-24** No v1.8 code beyond D-25/D-26. All other specs' files byte-identical.

Explicit supersessions (§1.14 — superseded text NOT edited, this section governs):
- v1.7 D-22/D-23 unlanded parts (absolute-top edit failed; ACC-12 asserted it) → superseded by D-25/D-26.
- v1.x guard pins contradicting disk reality (Card/`maxWidth: 440`/KAV/visible-box/size-16 pins) → rewritten by D-26.

### v1.8 Goal (delta)

| Surface | Today (user rewrite) | After (v1.8 FINAL) |
|---|---|---|
| Lint | Red (unused KAV/Platform imports) | Clean |
| Keyboard covers button | No recourse (no scroll) | Scroll fallback, tap-anywhere kept |
| Auto-scroll shift | Possible (input mid-flow) | Dead (input at top) |
| Design (dots/title/button) | Theirs | Byte-identical, adopted |

Decisions:

- **DEC-21** Adopt + reconcile (user call (a); rejected: revert-to-spec — their structure is better).
- **DEC-22** Guards re-baselined to disk reality (rejected: pinning spec-shaped strings that no longer exist).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-13** Source scan: `absoluteFillObject` root + full-screen tap `Pressable` (`inner` flex/centered/32/48); `ScrollView` wrap (open/close, flex, persistTaps) inside it; `hiddenInput` opacity/1×1/absolute/`top: 0`; title/note strings, 4-dot map + fill logic, error copy + clear, Unlock same-path + disabled rule, `errorContainer`/button styles; zero `KeyboardAvoidingView`/`Platform`/lockout identifiers. Holds on android/ios/web.
- **ACC-S17** Reviewer on iOS (Expo Go, phone) confirms: centered always; keyboard up — nothing parked at top, button reachable (scroll if needed); dots fill, Unlock works, wrong-PIN intact; dark mode clean. FAIL = top-park or unreachable action.
- **ACC-S18** Reviewer on Android + Web confirms ACC-S17 identically with no console error. FAIL = any platform-only deviation.

### v1.8 Deliverables (delta)

- **D-25** `app/passcode-screen.tsx` ONLY: the three reconcile hunks per CON-23. No other line changes.
- **D-26** `utils/lockScreenEntryUi.test.ts`: re-baselined to the adopted file — invariant pins (title/note strings, 4-dot map + fill logic, hidden-input props + `top: 0`, error copy + clear, Unlock same-path + disabled rule, no KAV/Platform/lockout identifiers, settings Step-1 intact) × android/ios/web; stale spec-shaped pins replaced.
- **D-27** Docs after v1.8 implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line.
