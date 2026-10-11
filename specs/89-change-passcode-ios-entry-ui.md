# SPEC-89 — Change-Passcode Step-1 iOS-Style Entry UI

| Field | Value |
|---|---|
| ID | SPEC-89 |
| Title | Step-1 verify-current-PIN restyled to iOS "Enter passcode" circles UI |
| Status | **FINAL v1.5** (v1.0–v1.5 per user calls 2026-10-11 — implementable) |
| Owner | User (final authority) |
| Version | 1.0 FINAL |
| Scope | `app/(tabs)/settings.tsx` Step-1 block ONLY (title line + `pinStep === 1` content) + one new guard file `utils/changePinEntryUi.test.ts` |
| Non-goals | No PIN-length change (stays 4); no custom keypad; no lockout/counter/reset policy or machinery; no Step-2/Cloud/Local-no-lock branch change; no verify-handler/validation/error-copy change; no modal container/style change (SPEC-26/65); no "Contact us" surface (iOS chrome in the reference, no such feature exists); no new deps |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

RFC 2119 terminology (MUST/MUST NOT/SHOULD/MAY) applies. Informative prose ("today", "currently") is non-normative unless restated as a requirement.

## Context

User call 2026-10-11 with an iOS reference screenshot ("Enter passcode", 6 hollow circles, custom keypad, "After 3 failed attempts you'll need to reset your passcode.", "Contact us"): *"ganitong enter passcode ui sana yung mangyayare if mag change passcode"*. Follow-up user decisions (2026-10-11): **4** digits, **native** keyboard, note **copy lang** (static text, no enforcement), **step 1 lang**.

Today (source-traced): Step 1 (`settings.tsx:1744` title, `:1753-1775` content, `:1904-1928` actions) is a labeled `TextInput` ("Current Passcode", secure/numeric/`maxLength={4}`, digit-sanitize) under the description "Enter your current passcode to verify.", with Cancel + "Verify Current PIN" (disabled until 4 digits; `^\d{4}$` check; Local `verifyPasscode` → "Incorrect Current PIN. Try again." + clear; else `setPinStep(2)`). The app lock screen (`passcode-screen.tsx:55-80`) already pairs 4 indicators with a native keyboard — the in-tree precedent for the mechanism below.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, images, or third-party code (AGENTS §1.12). Circles are plain `View`s (same technique as `passcode-screen.tsx:56-73`); no new imports beyond what the file already has.
- **CON-03** Bare-minimum diff (AGENTS §1.11). ONLY the Step-1 title line (`:1744`) and the `pinStep === 1` content block (`:1753-1775`). Actions (`:1904-1928`), Step-2, no-lock branches, modal container, `styles.dialog`, and every other line stay byte-identical.
- **CON-04** Visual contract (FINAL): title becomes exactly `Enter passcode`; static centered note exactly `After 3 failed attempts you'll need to reset your passcode.`; 4 hollow circles (empty = `theme` outline, filled = `theme` primary) driven by `currentPasscodeInput.length`; digits never shown. All colors via theme — zero hardcoded hex. The labeled box goes away; entry is a visually-hidden auto-focused `TextInput` carrying the EXACT current props/handlers (`value`, digit-sanitize `slice(0, 4)`, `secureTextEntry`, `keyboardType="numeric"`, `maxLength={4}`); tapping the circles refocuses it (same delayed-focus precedent as `passcode-screen.tsx:17-22`).
- **CON-05** Behavior byte-identical: same state, same `^\d{4}$` gate with `Enter your current 4-digit PIN.`, same Local verify with `Incorrect Current PIN. Try again.` + input clear (circles empty), same `setPinStep(2)` advance, same disabled-until-4 rule, same Cancel/close. Error strings render under the circles in `error` color.
- **CON-06** Explicitly NO lockout machinery: no attempt counter, no lock state, no reset flow, no timers beyond the existing focus/clear ones. The note is static text (user-accepted per the "copy lang" call — it describes an unenforced policy; recorded honestly here).
- **CON-07** Identical on Android, iOS, and Web — no `Platform.OS` / `Platform.select` branch. Any platform branch needs its own amendment first (§1.10).
- **CON-08** No code, config, or dependency change before this spec is marked FINAL by the user (AGENTS §1.1).

## Goal

Step 1 looks like the reference (title + note + 4 circles, native keyboard) while verifying exactly like today.

### Interaction matrix

| Surface | Today | After (FINAL) |
|---|---|---|
| Step-1 title | `Change Passcode` | `Enter passcode` |
| Step-1 subtitle | `Enter your current passcode to verify.` | Static 3-attempts note (unenforced) |
| Entry visual | Labeled "Current Passcode" box | 4 circles + hidden native-keyboard input |
| Typing / wrong PIN / verify / cancel | As today | Byte-identical (same state/handlers/copies) |
| Step 2, no-lock branches, buttons | As today | Byte-identical |

### Decisions (FINAL — user marked final 2026-10-11 with no overriding calls; DRAFT proposals adopted as-is)

- **DEC-01 (CALLED)** 4 circles (rejected: 6 — would change validators, server contract, and stored hashes; a separate-spec job).
- **DEC-02 (CALLED)** Native keyboard via hidden auto-focused input (rejected: custom keypad — new component, new tests, new failure modes for zero behavior gain).
- **DEC-03 (CALLED)** Note is static copy, unenforced (rejected: real 3-strike lockout — counter + reset flow + backend/storage impact; rejected: dropping the note — it is the requested look).
- **DEC-04 (CALLED)** Step-1-only scope (rejected: restyling Step 2/confirm — unasked).
- **DEC-05 (FINAL)** Cancel + Verify Current PIN buttons and both error copies stay byte-identical (rejected: removing Verify — the hidden input has no implicit submit; keyboard return + explicit button both work).

### Acceptance

Platform matrix (§1.10): every Objective guard holds on `android` / `ios` / `web` (jest `Platform.OS` mock — no platform branch in the change); every Subjective check is user-run on Expo Go (Android/iOS) + `expo export --platform web` (agent never runs CLIs per AGENTS §1.3).

Objective — deterministic, machine-checkable (jest source-scan guards):

- **ACC-01** Step-1 holds title `Enter passcode`, the static note verbatim, a 4-circle render driven by `currentPasscodeInput.length`, and a hidden input with the exact props (`secureTextEntry`, `keyboardType="numeric"`, `maxLength={4}`, `slice(0, 4)`); old step-1 title/description/`label="Current Passcode"` absent. Holds on android/ios/web.
- **ACC-02** Behavior intact: verify handler (`/^\d{4}$/`, both error strings, clear-on-wrong, `setPinStep(2)`), disabled-until-4 rule, Cancel/close wiring, Step-2 and no-lock branches present. Holds on android/ios/web.
- **ACC-03** Scope: changes confined to the Step-1 title line + `pinStep === 1` block; no `Platform.OS` added; no lockout identifiers (`failedAttempts`, `lockout`, `resetPasscode`) anywhere in the file. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit pass/fail, user-run):

- **ACC-S01** Reviewer on Android/iOS (Expo Go) confirms: title/note/circles match the reference look at 4 digits; tapping circles summons the numeric keyboard; typing fills circles (digits never shown); wrong PIN shows the same error and clears; Verify advances; Cancel closes; dark mode clean. FAIL = keyboard won't summon, digits leak, copy differs, or modal layout breaks.
- **ACC-S02** Reviewer on Web confirms ACC-S01 identically with no console error (hidden-input focus works in the modal). FAIL = any web-only deviation.

TDD coverage (§1.10): `utils/changePinEntryUi.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02 are user-run manual checks exactly as written (focus/keyboard/circles are not jest-renderable — guards pin the contract).

## Deliverables

- **D-01** `app/(tabs)/settings.tsx` ONLY: Step-1 title + content restyle per CON-04 (behavior per CON-05, no lockout per CON-06). No other line changes.
- **D-02** `utils/changePinEntryUi.test.ts` (new file, named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-03** Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Step 1:** the verify-current-PIN step (`pinStep === 1`, lock exists) — the ONLY restyled surface.
- **Hidden input:** the existing `TextInput` kept logic-identical but visually hidden; the circles are its only visual.
- **Static note:** the 3-attempts sentence as inert text — explicitly not a policy.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/25-passcode-modal-step-ui.md` (SPEC-25 — Step-1/Step-2 dialog home; NOT amended, behavior preserved)
- `app/(tabs)/settings.tsx:1744,1753-1775,1904-1928` (Step-1 title/content/actions) · `app/passcode-screen.tsx:17-22,55-80` (focus + dots precedent)

---

## v1.1 Amendment — Bigger Centered Modal, Blur Backdrop, Lock-Screen Dots (FINAL per user call 2026-10-11)

User call 2026-10-11 ("B, blur, (a)"): Step-1 keeps its v1.0 contract (title/note/hidden input/behavior/zero lockout) but gets roomier — bigger centered modal, real blur behind it, dots identical to the lock screen. v1.0 sections stay normative; where this amendment conflicts, v1.1 governs.

### v1.1 Constraints (delta)

- **CON-09** Dependency (user-instructed per AGENTS §1.12, user installs BEFORE implementation): `npx expo install expo-blur`. `expo-blur` is Expo Go-safe (Expo SDK module, same family as the already-used `expo-linear-gradient`); no other new dep. Until installed, `expo-blur` import red-boxes — install first, then implement.
- **CON-10** Backdrop (shared chrome, disclosed): the change-dialog modal's dim `View` (`backgroundColor: "rgba(0, 0, 0, 0.32)"`) becomes `<BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />` with the `rgba` fill REMOVED (dark tint already darkens) and the tap-outside `Pressable` + `Surface` order kept. This covers Step-2/no-lock branches too (same modal) — their content stays byte-identical; only the shared backdrop changes. Rejected: per-step conditional backdrop (flickers mid-flow when advancing).
- **CON-11** Bigger Step-1 (shared `styles.dialog` byte-identical — 9 dialogs use it): the `Surface` takes a Step-1-local override `style={[styles.dialog, isPasscodeEnabled && pinStep === 1 && { maxWidth: 520, paddingVertical: 16 }]}`; circles row `marginVertical: 16` → `28`; note `marginBottom: 8` stays. Title/note/buttons/error copies and all behavior byte-identical.
- **CON-12** Dots parity with the lock screen (`passcode-screen.tsx:131-141`, numbers mirrored, not arbitrary): 15px → **16×16**, `borderRadius: 8`, `marginHorizontal: 8` kept (= 16 gap, same as lock `gap: 16`), `borderWidth`/`borderColor` DELETED (filled dots, no outline ring), fill = lock logic verbatim — error ? `error` : filled ? `primary` : `outlineVariant`. Rejected: keeping the hollow ring (user ordered lock-screen sameness).
- **CON-13** Identical on Android, iOS, and Web — no `Platform.OS` / `Platform.select` branch (BlurView handles all three; older web browsers degrade the blur per the vendor, covered by ACC-S12). Any platform branch needs its own amendment first (§1.10).
- **CON-14** No v1.1 code beyond D-05/D-06 (+ the user-run install). v1.0 deliverables stand.

### v1.1 Goal (delta)

| Surface | Today (v1.0) | After (v1.1 FINAL) |
|---|---|---|
| Backdrop | Flat 32% black dim | Real blur (`BlurView` 80/dark), tap-outside kept |
| Dialog size | Shared 480, tight | Step-1-local 520 + vertical room (shared style untouched) |
| Dots | 15px hollow rings | 16px filled lock-screen dots incl. error-red |
| Copy/behavior/Step-2 | As v1.0 | Byte-identical |

Decisions:

- **DEC-06** Centered-bigger modal (user call B; rejected: full-page takeover — leaves the NativeModal pattern, smaller diff).
- **DEC-07** Real blur via user-installed `expo-blur` (user call; rejected: stronger dim — not blur).
- **DEC-08** Dots byte-for-byte lock-screen language (user call (a); rejected: hollow-ring variant).
- **DEC-09** Guards extend `changePinEntryUi.test.ts` (rejected: new guard file — same Step-1 home, §1.11/§1.14).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-04** Source scan: `expo-blur` `BlurView` imported; modal backdrop holds `intensity={80}` + `tint="dark"` + `absoluteFill` with the `rgba(0, 0, 0, 0.32)` fill gone and the close `Pressable` retained; `package.json` lists `expo-blur`. Holds on android/ios/web.
- **ACC-05** Source scan: shared `styles.dialog` block byte-identical (480/90%/radius 16); Step-1 `Surface` merges the local `{ maxWidth: 520, paddingVertical: 16 }` override gated on lock+step-1; circles row `marginVertical: 28`. Holds on android/ios/web.
- **ACC-06** Source scan: Step-1 dots 16×16/r8, zero `borderWidth`, fill `error ? …error… : …primary… : …outlineVariant…` (lock logic); v1.0 title/note/hidden-input/verify/disabled/error copies all still present. Holds on android/ios/web.
- **ACC-S11** Reviewer on Android/iOS (Expo Go) confirms: modal visibly roomier, backdrop blurs the settings behind (not flat dim), dots indistinguishable from lock-screen dots (incl. red on error), dark mode clean. FAIL = flat backdrop, cramped layout, or dot mismatch.
- **ACC-S12** Reviewer on Web confirms ACC-S11 identically (vendor blur fallback accepted only if no console error and layout identical). FAIL = console error or layout deviation.

### v1.1 Deliverables (delta)

- **D-05** `app/(tabs)/settings.tsx` ONLY: BlurView backdrop + Step-1 Surface override + spacing/dots per CON-10..CON-12. No other line changes. (Pre-step: user runs `npx expo install expo-blur`.)
- **D-06** `utils/changePinEntryUi.test.ts`: extended with ACC-04..ACC-06 × android/ios/web (no new test file per DEC-09).
- **D-07** Docs after v1.1 implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line.

---

## v1.2 Amendment — Change-Dialog Keyboard Avoidance (FINAL per user call 2026-10-11)

User call 2026-10-11 with phone screenshot: on phone the keyboard covers the Set Passcode button (tall 3-input setup branch worst) — the change dialog has no avoidance, unlike the SPEC-57 Clear-Data dialog in the same file (`settings.tsx:1691-1713`). (My v1.1 lock-screen raise hit the wrong surface — "di naman yun pinapa-adjust ko" — that revert lives in SPEC-91 v1.2.) v1.0/v1.1 sections stay normative; where this amendment conflicts, v1.2 governs.

### v1.2 Constraints (delta)

- **CON-15** Wrap the change-dialog `Surface` in `KeyboardAvoidingView`, mirroring SPEC-57 exactly: `behavior={Platform.OS === "ios" ? "padding" : "height"}`, `style={{ width: "100%", alignItems: "center" }}`, open tag between the tap-outside `Pressable` and the `Surface`, close tag after `</Surface>`. Covers all steps/branches (shared chrome, every content line byte-identical). `Platform`/`KeyboardAvoidingView` already imported — zero import change. Rejected: `ScrollView` (KAV suffices per precedent; residual risk disclosed — on very small screens with the tallest branch the buttons may still sit tight, follow-up scroll spec only if user-reported).
- **CON-16** No v1.2 code beyond D-08/D-09. v1.0/v1.1 deliverables stand (blur, size, dots, Step-1 UI, no lockout).

### v1.2 Goal (delta)

| Surface | Today (v1.1) | After (v1.2 FINAL) |
|---|---|---|
| Keyboard up on phone | Covers Set Passcode/Verify (untappable) | KAV shifts the dialog clear (iOS padding, else height) |
| Dialog content/steps/branches | As v1.1 | Byte-identical |

Decisions:

- **DEC-10** Fold into SPEC-89 (this dialog is this spec's flow home; rejected: new spec — one home per §1.14).
- **DEC-11** KAV-only, SPEC-57 mirror (rejected: ScrollView/additional chrome).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-07** Source scan: inside the `showChangePasscodeDialog` modal block, a `KeyboardAvoidingView` with the exact behavior ternary wraps the `Surface` (open + close tags both present); BlurView/tap-`Pressable`/actions all still present in the block. Holds on android/ios/web.
- **ACC-S13** Reviewer on iOS (Expo Go, phone) confirms: with the keyboard up, Verify (Step 1), Set Passcode (Step 2 + setup 3-input branch), and Cancel are all visible + tappable; no layout break. FAIL = any covered/untappable action.
- **ACC-S14** Reviewer on Android + Web confirms ACC-S13 identically with no console error. FAIL = any platform-only deviation.

### v1.2 Deliverables (delta)

- **D-08** `app/(tabs)/settings.tsx` ONLY: KAV open + close tags per CON-15. No other line changes.
- **D-09** `utils/changePinEntryUi.test.ts`: extended with ACC-07 × android/ios/web (no new test file per DEC-10).
- **D-10** Docs after v1.2 implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line.

---

## v1.3 Amendment — Scroll-Bounded Dialog (KAV Overshoot Fix) (FINAL per user call 2026-10-11)

User call 2026-10-11 with phone screenshot: KAV-`padding` alone overshoots on tall content — with the keyboard up, the whole dialog flies past the status bar (note clipped at top) instead of just clearing the buttons. My v1.2 CON-15 call ("KAV suffices") was wrong for this height; the residual risk it disclosed just fired. Spacing answer: (c) sides fine as-is. v1.0–v1.2 sections stay normative; where this amendment conflicts, v1.3 governs.

### v1.3 Constraints (delta)

- **CON-17** Bound the shift with scroll (register/login/onboarding precedent — KAV + `ScrollView` + `keyboardShouldPersistTaps`): the change-dialog KAV takes `style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "center" }}` and gains a `ScrollView` child — `contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", width: "100%" }}`, `keyboardShouldPersistTaps="handled"` — wrapping the `Surface` (open tag after KAV open, close tag after `</Surface>`, before `</KeyboardAvoidingView>`). Every content line byte-identical. Rejected: KAV-only (proven wrong on tall content); rejected: full-bleed card (breaks SPEC-26/65 responsive style).
- **CON-18** No v1.3 code beyond D-11/D-12. v1.0–v1.2 deliverables stand.

### v1.3 Goal (delta)

| Surface | Today (v1.2) | After (v1.3 FINAL) |
|---|---|---|
| Keyboard up, tall dialog | Whole dialog overshoots past status bar | Shift bounded; dialog scrolls, top stays visible, buttons reachable |
| Content/steps/branches | As v1.2 | Byte-identical |

Decisions:

- **DEC-13** KAV + ScrollView per in-tree precedent (rejected: KAV-only — just disproven on device; rejected: restyle/resize).
- **DEC-14** Guards extend `changePinEntryUi.test.ts` (rejected: new guard file — same home).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-09** Source scan: inside the `showChangePasscodeDialog` modal block, `ScrollView` with `flexGrow: 1` + `keyboardShouldPersistTaps="handled"` wraps the `Surface` inside the KAV (open + close tags in order); KAV style holds `flex: 1`. Holds on android/ios/web.
- **ACC-S15** Reviewer on iOS (Expo Go, phone) confirms: keyboard up on every branch (setup 3-input worst case) — title/note visible (nothing under the status bar), buttons reachable (scroll if needed), no layout break. FAIL = clipped top or untappable action.
- **ACC-S16** Reviewer on Android + Web confirms ACC-S15 identically with no console error. FAIL = any platform-only deviation.

### v1.3 Deliverables (delta)

- **D-11** `app/(tabs)/settings.tsx` ONLY: KAV style flex + ScrollView open/close per CON-17. No other line changes.
- **D-12** `utils/changePinEntryUi.test.ts`: extended with ACC-09 × android/ios/web (no new test file per DEC-14).
- **D-13** Docs after v1.3 implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line.

---

## v1.4 Amendment — Bounded Scroll (Stretch Fix) (FINAL per user call 2026-10-11)

User call 2026-10-11 with phone screenshot ("naging ganito naman sya sa phone size hays"): v1.3 stretched the card to full screen height — inputs on top, huge white void below. Diagnosis: my v1.3 combo (flex-less `ScrollView` + centering on both KAV and content container) lets the card grow unbounded on phone; the textbook pattern bounds it. Sides confirmed fine as-is (v1.3 call (c)). v1.0–v1.3 sections stay normative; where this amendment conflicts, v1.4 governs.

### v1.4 Constraints (delta)

- **CON-19** Bound the scroll (textbook bounded pattern, smallest delta from v1.3): KAV `style` → `{ flex: 1, width: "100%" }` (drop the `alignItems`/`justifyContent` extras); `ScrollView` gains `style={{ flex: 1, width: "100%" }}` (bounded height = deterministic scroll); `contentContainerStyle` byte-identical (`flexGrow` + centered + full width). Every content line byte-identical. Rejected: keeping the v1.3 props (proven stretched on device); rejected: `maxHeight` caps (clip risk without scroll).
- **CON-20** No v1.4 code beyond D-14/D-15. v1.0–v1.3 deliverables stand.

### v1.4 Goal (delta)

| Surface | Today (v1.3) | After (v1.4 FINAL) |
|---|---|---|
| Dialog height on phone | Stretched full-screen, void below inputs | Content-height card, normal modal |
| Keyboard up | (unproven — stretch broke the matrix) | Bounded shift + scroll, buttons reachable |
| Content/steps/branches | As v1.3 | Byte-identical |

Decisions:

- **DEC-15** Textbook bounded pattern (rejected: v1.3 props — device-disproven; rejected: new chrome).
- **DEC-16** Guards extend `changePinEntryUi.test.ts` (rejected: new guard file — same home).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-10** Source scan: change-block KAV style exactly `flex: 1, width: "100%"` with zero `alignItems`/`justifyContent` on it; `ScrollView` carries `style` with `flex: 1` + `width: "100%"`; `contentContainerStyle` still holds `flexGrow: 1`; Surface/buttons/copy intact. Holds on android/ios/web.
- **ACC-S17** Reviewer on iOS (Expo Go, phone) confirms: normal-height dialog (no full-screen void), keyboard up on every branch — top visible, buttons reachable. FAIL = stretched card or covered action.
- **ACC-S18** Reviewer on Android + Web confirms ACC-S17 identically with no console error. FAIL = any platform-only deviation.

### v1.4 Deliverables (delta)

- **D-14** `app/(tabs)/settings.tsx` ONLY: KAV style trim + ScrollView style per CON-19. No other line changes.
- **D-15** `utils/changePinEntryUi.test.ts`: extended with ACC-10 × android/ios/web (no new test file per DEC-16).
- **D-16** Docs after v1.4 implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line.

---

## v1.5 Amendment — Adopt Split Modals + Scroll Safety (FINAL per user call 2026-10-11)

User call 2026-10-11 (full-suite red + phone proof): the user split the change flow into TWO modals — Modal 1 (`visible={showChangePasscodeDialog && isPasscodeEnabled && pinStep === 1}`, full-screen Step-1 of their own design) + Modal 2 (`visible={showChangePasscodeDialog && (!isPasscodeEnabled || pinStep === 2)}`, Step-2/no-lock, existing content). Adopted as-is. Three gaps found by source-read: (a) Modal 1 has NO scroll + autoFocus opens the keyboard immediately — on phone the Verify row can be covered with no recourse and no X (iOS soft-lock: tap-anywhere focuses, cannot dismiss); (b) the restructure dropped v1.3/v1.4's ScrollView from Modal 2, so the tall setup branch is back to KAV-only; (c) the old Step-1 block inside Modal 2 is now unreachable (Modal 2 never shows lock+step-1) — KEPT, not deleted (§1.11 minimal; noted, FINAL-adjustable). v1.0–v1.4 sections stay normative; where this amendment conflicts, v1.5 governs.

### v1.5 Constraints (delta)

- **CON-21** Modal-1 ScrollView safety ONLY: `ScrollView` (`style` flex:1/width:100%, `contentContainerStyle` flexGrow/center/center/width:100% + `keyboardShouldPersistTaps="handled"`) inserted between the tap-anywhere `Pressable` open and the title, closed before `</Pressable>`. Modal-1 design/copy/handlers byte-identical. Rejected: X button (Cancel becomes reachable via scroll — sufficient); rejected: restyle.
- **CON-22** Modal-2 ScrollView restore ONLY (v1.3/v1.4 behavior the restructure dropped — aligned at FINAL-mark to include the v1.4 KAV `flex`, without which the ScrollView cannot bound): KAV `style` → `flex: 1, width: 100%`, then the same `ScrollView` open/close as CON-21. Modal-2 content byte-identical (including the unreachable old Step-1 block — kept deliberately, see CON-23).
- **CON-23** Dead code stays: Modal-2's `pinStep === 1` content + Verify branch are unreachable (proven: Modal-2 shows only when `!isPasscodeEnabled || pinStep === 2`, while those branches require lock + step 1) but DELETED by nobody — removing ~150 lines the user may have left deliberately exceeds bare-minimum. Recorded here instead. FINAL-adjustable to delete (which would restore SPEC-90's count of 2).
- **CON-24** Guard updates ONLY (no app behavior beyond CON-21/22): pinVerifyFreshness ACC-02 count 2→3 (dead mark + live mark + save mark — supersedes SPEC-90's count, SPEC-90 doc untouched); changePinEntryUi re-baselined to Modal 1 (live Step-1 pins) + Modal 2 Step-2 intact + both ScrollViews (supersedes dead-block pins, SPEC-80/71 docs untouched); clearDataKeyboard change-block anchor repointed to the qualified visible (counts unchanged — still exactly one KAV). Rejected: new guard files — same homes.
- **CON-25** Identical on Android, iOS, and Web — no `Platform.OS` branch beyond existing. Any new platform branch needs its own amendment first (§1.10).
- **CON-26** No v1.5 code beyond D-17..D-20. v1.0–v1.4 deliverables stand.

### v1.5 Goal (delta)

| Surface | Today (user split) | After (v1.5 FINAL) |
|---|---|---|
| Modal 1, keyboard up | Buttons coverable, no scroll, no X (iOS soft-lock) | Scroll fallback, Cancel reachable |
| Modal 2 setup branch | KAV-only again (ScrollView dropped) | Scroll restored (v1.3/v1.4 behavior) |
| Suite (3 red suites) | Dead anchors + stale count | Green (repointed + count 3) |
| Dead old-Step-1 block | Unreachable, unrecorded | Unreachable, recorded (kept) |

Decisions:

- **DEC-17** Adopt the split (user structure; rejected: revert-to-single-modal — their design is better).
- **DEC-18** Scroll in both modals, keep dead code (rejected: X button — scroll suffices; rejected: dead-block deletion — exceeds minimal, FINAL-adjustable).
- **DEC-19** Guards in place, no new files (rejected: new guard files — same homes per §1.14).

Explicit supersessions (§1.14 — superseded documents NOT edited, this section governs):
- SPEC-90 ACC-02 count (2 → 3 live-in-file marks).
- SPEC-89 v1.0–v1.4 Step-1 pins now pointing at dead text → re-baselined to Modal 1.

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-11** Source scan: Modal-1 block holds `ScrollView` (open + close, flex, persistTaps) inside the tap-anywhere `Pressable`; Modal-1 design/handlers/copies intact (headlineMedium, note-40, dots-18-20, hidden input, Cancel-flex + Verify-flex + disabled rule + both error copies + mark). Holds on android/ios/web.
- **ACC-12** Source scan: Modal-2 block holds KAV + restored `ScrollView` wrap of the `Surface`; Step-2/no-lock content intact; dead Step-1 block still present and still unreachable (Modal-2 visible-gate unchanged). Holds on android/ios/web.
- **ACC-13** Source scan: `markPinVerified();` occurs exactly 3× in settings (dead Step-1 + live Step-1 + save); unlock mark intact in lock screen. Holds on android/ios/web.
- **ACC-S15** Reviewer on iOS (Expo Go, phone) confirms: Modal-1 keyboard-up — Verify/Cancel reachable (scroll if needed), no stuck state; Modal-2 setup branch — Set Passcode reachable. FAIL = untappable action or soft-lock.
- **ACC-S16** Reviewer on Android + Web confirms ACC-S15 identically with no console error. FAIL = any platform-only deviation.

### v1.5 Deliverables (delta)

- **D-17** `app/(tabs)/settings.tsx` ONLY: Modal-1 ScrollView open + close per CON-21. No other line changes.
- **D-18** `app/(tabs)/settings.tsx` ONLY: Modal-2 ScrollView open + close per CON-22. No other line changes.
- **D-19** `utils/pinVerifyFreshness.test.ts` (ACC-02 count + note), `utils/changePinEntryUi.test.ts` (re-baseline), `utils/clearDataKeyboard.test.ts` (anchor repoint) per CON-24. No new test files.
- **D-20** Docs after v1.5 implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line.
