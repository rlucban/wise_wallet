# Spec 66: Make Online Dialogs Center on Phone

| Field | Value |
|---|---|
| ID | SPEC-66 |
| Title | Center Settings dialogs on phone with the RN-Modal shell |
| Status | **FINAL v1.1** (user approved "FINAL, code all five dialogs" 2026-10-07) |
| Owner | User (final authority) |
| Version | 1.1 |
| Scope | `app/(tabs)/settings.tsx` — Make Online, Clear Data PIN, Delete Account, and Set/Change Passcode modal shells + `utils/makeOnlineDialog.test.ts` and `utils/settingsDialogCentering.test.ts` |
| Non-goals | Other Settings dialogs (message, backup, restore, conflict); PIN verification logic; Make Online API flow; global toast; storage/API/routes/deps |
| Normative source | This file. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

> History: v1.0 (2026-10-07) — user screenshots (7:44, 7:50, iPhone): the Make Online PIN dialog is bottom-anchored and cut off at the screen bottom instead of centered. New spec number justified: no spec owns settings-dialog shells (§1.14 one-home; SPEC-26 owns dialog responsive tokens only, retained).
>
> v1.1 FINAL (2026-10-07) — user approved extending the same centered RN shell to Clear Data PIN, Delete Account, and Set/Change Passcode dialogs. Existing content and behavior remain unchanged.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

On the user's iPhone, the Make Online PIN dialog renders stuck at the bottom of the screen (buttons at/below the bottom edge), so its validation is not visible — it should be screen-centered on all axes.

### 1.2 Evidence (read-only, 2026-10-07)

- `app/(tabs)/settings.tsx:1507-1533` (PIN dialog) + `:1535-1552` (New-Account follow-up, reached on wrong-PIN `!response.ok` per `:348-351`) — both Paper `Dialog` with `styles.dialog` (`maxWidth 480/90%/center`, SPEC-26).
- Structural fact: the single `<Portal>` opens at `:1395` and closes at `:1831`, so ALL settings dialogs already render in the fullscreen root host — the inline/short-parent theory is ruled out, yet the dialog still bottom-anchors. Same bug class as the calculator saga (SPEC-63 v1.0–v1.3: three Paper-`Modal` style fixes missed; v1.4 RN-`Modal` rewrite ended it with zero further complaints on the same phone).
- Verified mechanism (Paper 5.13 source, read in-tree): `Dialog.tsx:126-134` renders `Modal` whose iOS `Surface` splits `contentContainerStyle` (`Surface.tsx:153-231` + `splitStyles.ts`), so userland centering keys cannot deterministically center Paper-modal content on iOS. RN built-in `Modal` (native fullscreen overlay, plain Yoga Views) has no such splitting.
- All Make Online validations already live inside these dialogs (inline `verificationError`, New-Account dialog, `messageDialog`) — no toast or logic change is needed; only the shell mispositions.

## 2. Constraints (normative)

- **CON-01 — Bare-minimum (§1.11).** Only the two Make Online shells named in v1.0 DEC-01 and the three Settings shells named in v1.1 CON-08 MAY change. PIN logic, inline errors, inputs, buttons, dismiss/reset behavior, `messageDialog`, backup/restore/conflict dialogs, and everything else in the file MUST stay unchanged.
- **CON-02 — No new dependencies (§1.12).** RN core `Modal`/`Pressable` only (already a dep); Paper `Dialog`/`Portal` imports retained (other dialogs still use them).
- **CON-03 — Cross-platform (§1.5).** Android + iOS + Web via RN core only.
- **CON-04 — Vercel-deployable + Expo Go safe (§1.6/§1.7).** Web export clean; no red-box.
- **CON-05 — No contract break (§1.4).** Storage, API, routes unchanged.
- **CON-06 — TDD cross-platform (§1.10).** jest × android/ios/web + user-run Expo Go + web-export checks.
- **CON-07 — One home (§1.14).** SPEC-26 (dialog tokens), SPEC-63 §8 (RN-shell precedent), SPEC-04 (Make Online flow) cited, never re-normed.

## 3. Goal

### 3.1 Decisions (FINAL v1.0)

- **DEC-01 (shell).** Both dialogs become RN `Modal` (`visible`, `transparent`, `animationType="fade"`, `onRequestClose` = current dismiss handler) + backdrop `Pressable` (`flex: 1`, `rgba(0, 0, 0, 0.5)`, centered, `padding: 20`, `onPress` = dismiss) + card `View` (`surface`, `borderRadius: 24`, `padding: 20`, `width: "90%"`, `maxWidth: 480`, `alignSelf: "center"` — SPEC-26 cap tokens preserved). `Dialog.Title/Content/Actions` wrappers drop; inner content (texts, `TextInput` + inline error, buttons with `loading`/`disabled`) moves verbatim into the card (title as `titleLarge` 700, actions as right-aligned row).
- **DEC-02 (dismiss parity).** Backdrop tap and Android-back run the dialogs' current dismiss handlers (PIN: close + clear input + clear error — extracted to one `closePinVerificationDialog` const reused by Cancel/backdrop/back; New-Account: close only). `dismissable` behavior unchanged (both were dismissable).
- **DEC-03 (flow untouched).** `verifyPinForSync`, `createNewAccountAndMigrate`, `verificationError` paths, and the wrong-PIN → New-Account handoff stay byte-identical.

### 3.2 Interaction matrix (FINAL v1.0)

| # | State | Behavior |
|---|---|---|
| 1 | Tap Make Online | PIN card dead-center, input + Verify & Sync reachable, backdrop tap cancels+clears |
| 2 | Wrong PIN | PIN closes → New-Account card dead-center (same shell) |
| 3 | Android back | Same as backdrop tap per dialog |
| 4 | Any other settings dialog | Paper `Dialog` look/position untouched |

### 3.3 Acceptance criteria (FINAL v1.0)

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | PIN + New-Account dialogs use RN `Modal` (`transparent`, `fade`, `onRequestClose`) + backdrop `Pressable` (centered `flex: 1`) + card (`90%`/`480`/`center`); zero Paper `<Dialog visible={showPinVerificationDialog}` / `showNewAccountDialog` (source-text guards) |
| ACC-02 | Inline `verificationError`, `Verify & Sync` (`verifyPinForSync` + `loading`/`disabled`), `Create New & Migrate` (`createNewAccountAndMigrate`), and `messageDialog` Paper-`Dialog` retained (source-text guards) |
| ACC-03 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** iPhone (light + dark): Make Online card dead-center both axes, even gutters, input/buttons fully visible; wrong PIN → New-Account card centered. Web: same, capped at 480. Other settings dialogs unchanged.

### 3.4 Deliverables (FINAL v1.0)

- **D-01 (`app/(tabs)/settings.tsx`):** imports (`Modal`, `Pressable` from RN) + `closePinVerificationDialog` const + both shell swaps per DEC-01/02. Nothing else in the file.
- **D-02 (`utils/makeOnlineDialog.test.ts`, new):** ACC-01/ACC-02 × android/ios/web. No other test file touched (zero existing guards cover these dialogs — verified by grep).
- **D-03 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## Glossary

| Term | Meaning |
|---|---|
| RN-shell | RN built-in `Modal` + backdrop/tap-swallow `Pressable`s + centered card (SPEC-63 §8 pattern) |
| Bottom-anchored | Dialog content stuck at/below the screen bottom edge instead of centered |

## References

- `app/(tabs)/settings.tsx:1507-1552` (dialogs under change), `:1395`/`:1831` (single Portal — host exonerated)
- `specs/63-dashboard-quick-calculator.md` §8 (RN-shell precedent that ended the same bug class)
- `specs/26-responsive-dialogs-and-clear-data-flow.md` (dialog cap tokens owner — `480/90%/center` preserved)
- `specs/04-connection-status-vs-offline-mode.md` (Make Online flow owner — logic untouched)
- `AGENTS.md §1` (spec-first, bare-minimum, one home, docs)

## 4. v1.1 Amendment — Center the Other Settings Dialogs (FINAL)

### 4.1 Context

The user's iPhone screenshots show the Clear Data PIN (`showPinPrompt`), Delete Account (`showDeleteDialog`), and Set Passcode (`showChangePasscodeDialog`, Local no-lock state) Paper dialogs anchored at the bottom of the screen. SPEC-66 v1.0 deliberately excluded these dialogs; this proposed amendment expands the Settings shell owner only. SPEC-49 owns PIN validation behavior, SPEC-24 owns passcode flow, and SPEC-26 responsive width tokens remain unchanged.

### 4.2 Constraints

- **CON-08 — Shell-only scope.** Only the shells for `showPinPrompt`, `showDeleteDialog`, and `showChangePasscodeDialog` MAY change. Their content, validation, PIN logic, button actions/states, and close/reset behavior MUST remain unchanged.
- **CON-09 — Centered RN shell.** Each named dialog MUST use RN core `Modal` with a transparent full-screen overlay, centered card, backdrop tap handling, and `onRequestClose` wired to its existing dismiss/reset handler. The card MUST preserve SPEC-26 responsive bounds (`width: "90%"`, `maxWidth: 480`, centered alignment), use the current surface theme, and remain inside the phone viewport.
- **CON-10 — Cross-platform/TDD.** Android, iOS, and Web MUST use the same shell behavior. No new dependency or native-only import. Jest guards MUST cover all three mocked `Platform.OS` values; Expo Go phone + Web export checks remain user-run.

### 4.3 Goal and Acceptance

| Platform | Objective | Subjective reviewer check |
|---|---|---|
| Android | ACC-04 passes with `Platform.OS="android"` | ACC-S02: Clear Data PIN, Delete Account, and Set Passcode cards are centered on the phone; inputs/actions remain reachable and backdrop/back dismisses correctly. |
| iOS | ACC-04 passes with `Platform.OS="ios"` | ACC-S02: same checks in Expo Go on iPhone; none of the three dialogs is bottom-anchored. |
| Web | ACC-04 passes with `Platform.OS="web"` | ACC-S03: dialogs remain centered and capped at 480px with existing behavior intact. |

| ID | Check |
|---|---|
| ACC-04 | The three named Settings dialogs use the centered RN shell and no longer render as Paper `Dialog`s; the existing Make Online shells and all three existing dialog contents/handlers remain present. |
| ACC-05 | User-run `npx jest utils/makeOnlineDialog.test.ts` and the new Settings-shell test, lint, TypeScript, Expo Go, and Web export pass. |

### 4.4 Deliverables

- **D-04 (`app/(tabs)/settings.tsx`):** Convert only the three named settings modal shells to the centered RN shell. Keep inner content and handlers unchanged.
- **D-05 (`utils/settingsDialogCentering.test.ts`):** Add ACC-04 source guards × Android/iOS/Web. Existing Make Online guards remain unchanged.
- **D-06 (journal):** Update `docs/savepoint.md` and `AGENTS.md` §3.
