# SPEC-58 — Web App-Lock Store + Settings Dialog Paint Order

| Field | Value |
|---|---|
| ID | SPEC-58 |
| Title | App-lock PIN never verifies on web (SecureStore is a no-op module in browsers) + Settings error dialogs paint behind their caller |
| Status | **FINAL** v0.1 (marked by user 2026-10-07; implementable per AGENTS.md §1.1) |
| Owner | User (final authority) |
| Version | v0.1 DRAFT |
| Scope | `utils/secureStorage.ts` (explicit web branch) + `utils/secureStoreWeb.test.ts` (new) + `app/(tabs)/settings.tsx` (move messageDialog last in Portal) + `utils/clearDataKeyboard.test.ts` (paint-order guard) + journal |
| Non-goals | `PasscodeContext` verify logic (SPEC-35 rules unchanged); lock format, hashing, key names (`user_{id}_passcode`), `isUnlocked` gating; server bcrypt paths (login/Change-PIN already work); dialog content/copy; other screens' dialogs; new dependencies |
| Normative source | This file (once marked FINAL). File+symbol cites are normative; `:line` numbers are hints only. |

> History: v0.1 DRAFT 2026-10-07 from user-confirmed reports ("on web PIN
> code is not recognized — login and change-pin recognize though"; "the
> dialog that says invalid pin is rendered behind the calling dialog"). FINAL
> 2026-10-07 per user call ("Final").

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## Context

### Problem

In one sentence: **(1) on web the app-lock gate rejects every PIN because
`expo-secure-store` is an empty module in browsers, so the lock hash is
never durably stored/read, while (2) Settings' shared message dialog is
mounted early in the single `Portal`, so later siblings paint over it.**

### Evidence (verified read-only, this tree)

- `node_modules/expo-secure-store/build/ExpoSecureStore.web.js` is exactly
  `export default {};` — no `isAvailableAsync`, no `setItemAsync`. Every
  call throws, `utils/secureStorage.ts:9-14` catches it and latches
  `secureAvailable = false`, so web silently rides the AsyncStorage
  fallback — an accidental, untested path that is the only thing standing
  between the user and a permanently locked app.
- `context/PasscodeContext.tsx:105-111` — `verifyPasscode` returns `false`
  whenever both the session plaintext and `storedHash` are null. On web a
  refresh clears the plaintext, so the gate depends entirely on that hash.
  Stored value is a 64-char SHA-256 hex string (never the 4 digits).
- Login and Change-PIN verify against the **server** (bcrypt) and therefore
  keep working — exactly the asymmetry the user reported.
- `app/(tabs)/settings.tsx` — inside one `<Portal>`: `showDeleteDialog`
  (~1425), then `messageDialog` (~1496), then `showPinVerificationDialog`,
  `showNewAccountDialog`, `showConflictDialog`, `showPinPrompt` (~1612),
  `showDeleteConfirmation`, `showChangePasscodeDialog`. Siblings paint in
  document order, so the shared error/success dialog renders **behind**
  whichever dialog raised it.
- Precedent for a jest-provable storage test: `utils/notifications.test.ts`
  module-mocks native modules (the same technique the earlier `pinGate`
  repair needed for `expo-crypto`).

### Notes (informative)

- The app-lock PIN and the account credential are different secrets; SPEC-35
  DEC-05 owns that split and is untouched here.
- The "which half is broken" question (write vs read) becomes moot: the fix
  removes the throwing probe on web entirely, so both halves take the same
  deterministic path, and ACC-02 proves the round-trip under jest.

## Constraints (normative)

- **CON-58-01 — Bare-minimum diff (§1.11).** Only `utils/secureStorage.ts`,
  the message-dialog JSX position in `app/(tabs)/settings.tsx`, and the
  files named in D-*. No other line in either file.
- **CON-58-02 — Web never touches SecureStore.** `setSecureItem`,
  `getSecureItem`, and `removeSecureItem` MUST branch on
  `Platform.OS === "web"` **before** any SecureStore call and MUST go
  straight to AsyncStorage. The `isAvailableAsync` probe MUST NOT run on
  web. Native behavior MUST stay exactly as today (probe → SecureStore →
  AsyncStorage fallback); this is a web-only branch, not a rewrite.
- **CON-58-03 — Same key both halves.** Read and write MUST keep using
  `getPrefixedKey("passcode", id)` (`user_{id}_passcode`) and the value MUST
  remain the SHA-256 hex digest. No key rename, no migration (existing native
  SecureStore entries are untouched; web has no durable prior entries to
  migrate because the module never stored anything).
- **CON-58-04 — Message dialog paints last.** The `messageDialog` `Dialog`
  MUST be the **last** child of the Settings `<Portal>`, after every other
  dialog (JSX moved verbatim; no content, copy, or prop changes). Paper
  mounts siblings in document order, so last = topmost.
- **CON-58-05 — Cross-platform invariant (§1.5).** Native is byte-identical
  in behavior; web changes only by becoming deterministic. No new warnings on
  web (SPEC-06 parity — no `backdropFilter`/`boxShadow`/`shadow*` props).
- **CON-58-06 — Expo Go safe (§1.7) / Vercel-deployable (§1.6).** No new
  native import; `expo-secure-store` was already imported.
- **CON-58-07 — TDD with cross-platform coverage (§1.10).** jest
  parameterized by `android`/`ios`/`web` with `expo-secure-store` mocked to
  its real web shape (empty module), plus source-text guards, plus a
  user-run web matrix for the dialog paint order.
- **CON-58-08 — Docs (§1.8).** `docs/savepoint.md` + `AGENTS.md` §3 entry.
  Status flips to FINAL only on explicit user call.

## Goal

### Interaction matrix

| Platform | Lock store | Lock gate after refresh | Settings error dialog |
|---|---|---|---|
| Android | SecureStore (unchanged) | accepts correct PIN | above caller |
| iOS | SecureStore (unchanged) | accepts correct PIN | above caller |
| Web | AsyncStorage, explicit | **accepts correct PIN (fixed)** | above caller |

### Decisions

- **DEC-58-01:** explicit `Platform.OS === "web"` branch over "make the
  probe work" — the module is empty by design in browsers, so probing it can
  only ever fall through; skipping it makes the fallback intentional and
  testable instead of accidental.
- **DEC-58-02:** move the dialog rather than adding z-index — z-index across
  Paper `Modal`s is unreliable on web, while document order is deterministic
  and free.
- **DEC-58-03:** jest round-trip over a manual localStorage probe — the
  storage helper is pure I/O behind a mockable module, so it is provable in
  CI; only the dialog layering needs human eyes.

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-01 | ✅ | ✅ | ✅ | `secureStorage` branches on `Platform.OS === "web"` before any SecureStore call; jest round-trip `setSecureItem` → `getSecureItem` equals the value on web, with `expo-secure-store` mocked as an empty module (proving SecureStore is never touched); native suites still exercise the probe path |
| ACC-02 | ✅ | ✅ | ✅ | `removeSecureItem` removes on web; key format unchanged (`user_{id}_passcode` built by `getPrefixedKey`) |
| ACC-03 | ✅ | ✅ | ✅ | Source-text guard: in `settings.tsx` the `messageDialog` `Dialog` appears after the last other `<Dialog visible=` (index comparison) and before `</Portal>` |
| ACC-04 | ✅ | ✅ | ✅ | `jest` 0 failed, `lint` clean, `tsc` clean; no dependency/storage-key/route change |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01 (web):** set a PIN, refresh the browser, app-lock screen accepts it; correct PIN unlocks, wrong PIN still rejected.
- **ACC-S02 (web):** trigger an error inside the Change Passcode / Delete / Clear dialogs ("Incorrect PIN", "Invalid PIN") — the message renders on top and is readable and dismissible.
- **ACC-S03 (Android/iOS):** lock gate and dialogs behave exactly as before (no regression from the web branch).

## Deliverables

- **D-58-01 (`utils/secureStorage.ts`):** explicit web branch per CON-58-02
  in all three helpers; native path untouched.
- **D-58-02 (new `utils/secureStoreWeb.test.ts`):** ACC-01/02 across
  `android`/`ios`/`web` with the empty-module `expo-secure-store` mock.
- **D-58-03 (`app/(tabs)/settings.tsx`):** move the `messageDialog` `Dialog`
  to the last position inside `<Portal>` (verbatim move, CON-58-04).
- **D-58-04 (`utils/clearDataKeyboard.test.ts`, extend):** ACC-03 paint-order
  guard × android/ios/web.
- **D-58-05 (user-run matrix + docs):** ACC-S01..S03; `docs/savepoint.md` +
  `AGENTS.md` §3 per §1.8.

## Glossary

- **Lock hash:** the 64-char SHA-256 hex digest of the 4-digit app-lock PIN,
  stored under `user_{id}_passcode`; the digits themselves are never stored.
- **Empty web module:** `expo-secure-store`'s web build being literally `{}`.
- **Paint order:** sibling render order inside a `Portal`; last = topmost.

## References

- `node_modules/expo-secure-store/build/ExpoSecureStore.web.js` (`export default {}`) · `utils/secureStorage.ts:1-37` · `context/PasscodeContext.tsx:105-111` (verify; untouched) · `app/(tabs)/settings.tsx:1496` (messageDialog position), `:1612` (showPinPrompt), `<Portal>` region.
- `specs/35-pin-change-persistence-and-promotion-safety.md` (owns lock semantics + hashing; unchanged) · `specs/57-clear-data-dialog-keyboard.md` (wraps `showPinPrompt`, adjacent dialog work) · `specs/06-web-warning-cleanup.md` (no web warnings) · `utils/notifications.test.ts` (native-module mock precedent).