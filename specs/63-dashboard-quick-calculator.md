# Spec 63: Dashboard Quick Calculator + Floating Header Action Cluster

| Field | Value |
|---|---|
| ID | SPEC-63 |
| Title | Calculator button left of the notifications bell, both floating together in one pill |
| Status | **FINAL v1.0** (marked by user 2026-10-07 — "OD-01 A, OD-02 A, spec-63 final, code this for me") |
| Owner | User (final authority) |
| Version | 0.1 |
| Scope | `app/(tabs)/index.tsx` header row only (calculator entry + floating pill cluster) + calculator UI surface + tests |
| Non-goals | Bell behavior/badge/count; notifications screen; transaction forms (unless OD-01 b); tab bar; storage/API/route/dep change beyond what a D-* names |

> History: v0.1 DRAFT (2026-10-07) — user order on the Home screenshot: "lagyan ng calculator sa left side ni notifications at gawing naka float din silang dalawa na magkasama". New spec number justified: no existing spec owns the dashboard header or a calculator (§1.14 one-home requires a canonical home; forcing this into SPEC-53 would mis-home it).

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

Home header (`app/(tabs)/index.tsx:265-303`) is a plain row: date block left, lone bell (+ red count badge) right. Request: (1) add a calculator action on the left side of the bell; (2) present both as one floating pill cluster (detached, rounded, soft shadow — the floating design language).

### 1.2 Evidence (read-only, 2026-10-07)

- Header right side today (`index.tsx:273-301`): `flexDirection: row` with a single relative `View` (bell `IconButton` → `/notifications` + absolute red badge `totalBadgeCount`). No calculator exists anywhere in-tree (no screen, component, util, or route for one).
- Floating tokens precedent: SPEC-53 DD-01 (surface, r28, p8, elevation 8 / iOS 0×4/0.12/12 / web `0 8px 24px rgba(0,0,0,0.12)`) — cited, never re-normed.

### 1.3 Decisions (OPEN — need user call)

- **OD-01 — Calculator scope.** Options: (a) standalone quick-calculator modal — basic `+ − × ÷`, `=`, clear, decimal; display-only result, no coupling to any form (proposed default: smallest useful scope); (b) calculator with "use result" that fills the add-transaction amount (coupled to the form — bigger); (c) user-defined scope.
- **OD-02 — Cluster tokens.** Options: (a) pill mirroring the floating bar (surface, radius 20–28, p4–8, DD-01 shadows; bell keeps its badge, calculator `calculator-outline` icon, both `primary`-tinted or default) — proposed default pending exact numbers; (b) user-supplied tokens.

## 2. Constraints (normative)

- **CON-01 — Bare-minimum (§1.11).** Only `D-*` files MAY change. Bell destination (`/notifications`), badge count logic, date block, and everything below the header MUST stay byte-identical.
- **CON-02 — No new dependencies (§1.12).** Build on `react-native-paper` (`Dialog`/`Modal`/buttons), theme, existing icons. No calculator library, no native modules.
- **CON-03 — Cross-platform (§1.5).** Android + iOS + Web via `Platform.select` only; no native-only top-level import.
- **CON-04 — Vercel-deployable + Expo Go safe (§1.6/§1.7).** Web export clean; no red-box on import.
- **CON-05 — No contract break (§1.4).** Storage, API contract, routes unchanged (a new route only if a D-* names one).
- **CON-06 — TDD cross-platform (§1.10).** jest × android/ios/web + user-run Expo Go + web-export checks.
- **CON-07 — One home (§1.14).** SPEC-53 (floating tokens) cited, never re-normed.

## 3. Goal

### 3.1 Decisions (FINAL v1.0 — OD-01 a, OD-02 a per user call)

- **DEC-01 (cluster, FINAL).** Header right side is one floating pill: `surface` background, `borderRadius: 20`, `paddingVertical: 4`, `paddingHorizontal: 4`, SPEC-53 DD-01 shadows (`elevation: 8` / iOS `0×4/0.12/12` / web `0 8px 24px rgba(0,0,0,0.12)`), in-flow inside the header row. Contents: calculator `IconButton` (`calculator` glyph — verified in the installed MCI glyphmap; `calculator-outline` does not exist) then the unchanged bell + badge block. Date block and header paddings unchanged.
- **DEC-02 (calculator, FINAL per OD-01 a).** Standalone modal: display + keys `C ⌫ ÷ 7 8 9 × 4 5 6 − 1 2 3 + 0 . =` (immediate-execution, display-only result, decimal + backspace supported, ÷-by-zero reads `Error`); dismiss returns to an unchanged Home. Arithmetic lives in pure `utils/calculator.ts` (no `react-native` import); UI in `components/CalculatorModal.tsx` (Paper `Modal`, responsive card `maxWidth: 360, width: "90%"`).

### 3.2 Interaction matrix (FINAL v1.0)

| # | State | Behavior |
|---|---|---|
| 1 | Tap calculator | Calculator surface opens; Home state untouched |
| 2 | Compute + dismiss | Result shown in the surface only; nothing is written anywhere (under OD-01 a) |
| 3 | Tap bell | `/notifications` as today; badge count unchanged |
| 4 | Narrow / wide web | Cluster stays header-right; pill never overflows the header |

### 3.3 Acceptance criteria (FINAL v1.0)

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | Header contains a calculator affordance left of the bell inside one pill container (source-text guards) |
| ACC-02 | Bell destination + badge logic byte-identical (existing lines intact) |
| ACC-03 | Calculator arithmetic unit cases (pure helper, if factored) × 3 OS |
| ACC-04 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Phone + web: calculator + bell read as one floating pill, top-right; bell badge intact.
- **ACC-S02:** Calculator computes correctly by hand-check; dismiss returns to an unchanged Home.

## 4. Deliverables (FINAL v1.0)

- **D-01:** `app/(tabs)/index.tsx` header row only — pill container + calculator button + modal state + modal render. Bell/badge/date/list untouched.
- **D-02:** `components/CalculatorModal.tsx` (new: modal + keypad UI, state machine) + `utils/calculator.ts` (new: pure `calculate` + `formatResult`, no `react-native` import).
- **D-03:** `utils/calculator.test.ts` (new: ACC-03 arithmetic unit + ACC-01/ACC-02 source guards × android/ios/web).
- **D-04:** Journal — `docs/savepoint.md` + `AGENTS.md` §3 entry.

## 5. v1.1 Amendment — Fresh-entry fix + slightly larger responsive keys (FINAL v1.1 per user call 2026-10-07: "SPEC-63 v1.1 FINAL, code this for me")

### 5.1 Context (evidence 2026-10-07)

- Screenshot: modal opens, pill works — but `5 + 3 =` never computes. Root cause (`components/CalculatorModal.tsx` `inputDigit`): every fresh digit calls `resetEntry`, which clears `acc`/`op` — so the digit typed after an operator wipes the pending operation and `=` no-ops (`acc === null`). The `fresh` flag conflates "start a new entry" with "full reset".
- Size: card `maxWidth: 360`, default key/display sizes read tiny, especially on desktop. User order: enlarge slightly and stay flexible on any device ("lakihan ng konti ... flexible sa any device").

### 5.2 Decisions (FINAL v1.1 — content fixed)

- **DEC-03 (state fix).** Fresh digit entry MUST only replace the display and clear `fresh` — it MUST NOT touch `acc`/`op`. Full reset happens only from `Error` recovery and `C`. Everything else (chain-compute, `=`, backspace, decimal, length cap) unchanged.
- **DEC-04 (size tokens).** Card `maxWidth: 360 → 400` (`width: "90%"` retained — phones fluid, desktop capped); display `headlineMedium → displaySmall` (`minHeight: 56`); key buttons `contentStyle height: 56` + `labelStyle fontSize: 18`. Nothing else in either file.

### 5.3 Acceptance criteria (FINAL v1.1)

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-05 | `inputDigit`'s fresh branch replaces display only — zero `setAcc`/`setOp` on that path (source-text guard); `calculate`/`formatResult` unit cases still green |
| ACC-06 | Size tokens present (`maxWidth: 400`, `displaySmall`, key height `56`, label `18`) × source-text guard |
| ACC-07 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S03:** Reviewer hand-checks `5 + 3 = → 8`, chain `5 + 3 + 2 = → 10`, `5 ÷ 0 = → Error`, then digit recovers; keys/display read comfortably on a phone and a desktop width.

### 5.4 Deliverables (FINAL v1.1)

- **D-05 (`components/CalculatorModal.tsx`):** DEC-03 + DEC-04. Nothing else in the file.
- **D-06 (`utils/calculator.test.ts`, extend):** ACC-05/ACC-06 guards × android/ios/web. No new test file.
- **D-07 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## 6. v1.2 Amendment — Center the card on phones (FINAL v1.2 per user call 2026-10-07: "final / code this for me")

### 6.1 Context (evidence 2026-10-07)

- Phone screenshot (dark mode, Expo Go): the calculator card renders but does not lock to the horizontal center — it reads shifted instead of `gitna`.
- Root cause (`components/CalculatorModal.tsx:125-132`): the card (`width: "90%"`, `maxWidth: 400`) has no `alignSelf: "center"`, so nothing forces horizontal centering on narrow screens. The proven pattern is SPEC-26 (`ConfirmDialog` + settings dialogs: `maxWidth: 480, width: "90%", alignSelf: "center"`) — cited, never re-normed.
- Canonical home is this file per §1.14. SPEC-26 owns dialog tokens; this amendment only borrows the one centering key, it does not re-norm SPEC-26.

### 6.2 Constraints (FINAL v1.2)

- **CON-08 — Centering-only.** Only `alignSelf: "center"` on the calculator card MAY be added. Arithmetic (`utils/calculator.ts`), key grid, display tokens (v1.1), `contentContainerStyle`, `Portal`/`Modal` props, header cluster, bell/badge MUST stay byte-identical. No new dependency, no native import. Cross-platform; `npm run lint` clean.

### 6.3 Goal (FINAL v1.2)

- **DEC-05:** Card style gains `alignSelf: "center"` (`width: "90%"` + `maxWidth: 400` retained — phones fluid, desktop capped).

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-08 | Card carries `width: "90%"` + `maxWidth: 400` + `alignSelf: "center"`; `contentContainerStyle` centering retained (source-text guards) |
| ACC-09 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S04:** Phone portrait (light + dark): card sits horizontally centered with even side gutters; keys/display/Close fully inside the card and tappable. Web desktop: card stays capped and centered.

### 6.4 Deliverables (FINAL v1.2)

- **D-08 (`components/CalculatorModal.tsx`):** one `alignSelf` line per DEC-05. Nothing else in the file.
- **D-09 (`utils/calculator.test.ts`, extend):** ACC-08 guards × android/ios/web. No new test file.
- **D-10 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## 7. v1.3 Amendment — True screen-centering via full-stretch container (FINAL v1.3 per user call 2026-10-07: "final / code this for me")

### 7.1 Context (evidence 2026-10-07)

- v1.2 (`alignSelf: "center"` on the card) changed nothing on a reloaded Expo Go bundle — user confirms the card is still off-center on **both axes** on phone. Admitted miss: `alignSelf: auto` already inherits the parent's `alignItems: center`, so v1.2 was a redundant no-op.
- Root cause (Paper 5.13 source, read in-tree): `Modal.tsx:219-224` renders `contentContainerStyle` onto a `Surface` that **wraps its content** (no `flex`), with the base content style only `transparent + justifyContent: center` (`:243-246`); vertical centering hangs solely on the wrapper (`absoluteFill + justifyContent: center`, `:238-241`). So our `justifyContent/alignItems: center` centers only inside the wrap — on real phone frames (safe-area margins, narrow widths) the card drifts on both axes.
- Fix direction: give the transparent `Surface` `flex: 1` so it fills the wrapper — then its own `justifyContent + alignItems: center` centers the card on the true screen, any phone size. "Flexible" is kept by the untouched card tokens (`width: "90%"` fluid + `maxWidth: 400` desktop cap).
- Canonical home is this file per §1.14. SPEC-26 cited for the card tokens only, never re-normed.

### 7.2 Constraints (FINAL v1.3)

- **CON-09 — Container-only.** Only `contentContainerStyle` in `components/CalculatorModal.tsx` MAY gain `flex: 1`. Card style (v1.1 size + v1.2 `alignSelf`), key grid, arithmetic (`utils/calculator.ts`), `Portal`/`Modal` props, header cluster, bell/badge MUST stay byte-identical. No new dependency, no native import. Cross-platform; `npm run lint` clean.

### 7.3 Goal (FINAL v1.3)

- **DEC-06:** `contentContainerStyle` becomes `{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }` (key order: `flex` first). Nothing else.

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-10 | Container carries `flex: 1` + `justifyContent: "center"` + `alignItems: "center"`; card retains `width: "90%"` + `maxWidth: 400` + `alignSelf: "center"` (source-text guards) |
| ACC-11 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S05:** Phone portrait (light + dark): card dead-center on both axes with even gutters on all sides; all keys + Close tappable; backdrop tap still dismisses. Web desktop: card stays capped (`400`) and centered.

### 7.4 Deliverables (FINAL v1.3)

- **D-11 (`components/CalculatorModal.tsx`):** one `flex: 1` key per DEC-06. Nothing else in the file.
- **D-12 (`utils/calculator.test.ts`, extend):** ACC-10 guards × android/ios/web. No new test file.
- **D-13 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## 8. v1.4 Amendment — Replace Paper Modal with RN built-in Modal (FINAL v1.4 per user call 2026-10-07: "a + code this for me")

### 8.1 Context (evidence 2026-10-07)

- v1.3 (`flex: 1` on `contentContainerStyle`) still renders bottom-stuck on the user's phone (fresh 7:15 screenshot: white sheet peeking from the screen bottom, below the tab bar). Centering keys cannot fix this.
- Verified root cause (Paper 5.13 source, read in-tree): on iOS, `SurfaceIOS` (`Surface.tsx:153-231`) **splits** `contentContainerStyle` via `splitStyles` — layout keys (`flex`, `width`, `alignSelf`, …) go to an outer layer while `justifyContent`/`alignItems`/`padding` stay on a content-wrapping inner layer, and the inner layer's `flex` is forced `undefined` whenever `container` is set without `height` (`:210-213`; Paper `Modal` always passes `container`). So no userland style combination on Paper `Modal` can guarantee both-axes centering on iOS. Two misses (v1.2 redundant `alignSelf`, v1.3 outer-only `flex`) prove the mechanism, not the values, is at fault.
- User decision: option (a) — rewrite the shell on React Native's built-in `Modal` (no layer-splitting; plain Yoga Views center deterministically on all platforms). Option (b) (third Paper-`Modal` guess) rejected per owner call. `Portal.Host` verified present and full-screen (`PaperProvider.tsx:113`), so the host is exonerated.
- Canonical home is this file per §1.14. SPEC-26 dialogs stay on Paper `Dialog` (untouched — different surface, different owner). No new spec number.

### 8.2 Constraints (FINAL v1.4)

- **CON-10 — Shell-only.** Only the modal shell in `components/CalculatorModal.tsx` MAY change (imports + outer JSX wrapper). Card style (v1.1 size + v1.2 `alignSelf`), key grid, display, state machine, arithmetic (`utils/calculator.ts`), header cluster, bell/badge, props interface (`visible`/`onDismiss`) MUST stay byte-identical. No new dependency (RN core `Modal`/`Pressable` only — already a dep); no native-only top-level import beyond `react-native`. Cross-platform (Android + iOS + Web via RN core only); `npm run lint` clean.

### 8.3 Goal (FINAL v1.4)

- **DEC-07:** Shell becomes RN built-in `Modal` (`visible`, `transparent`, `animationType="fade"`, `onRequestClose={onDismiss}` — Android back-button parity with Paper's handler) containing a full-screen backdrop `Pressable` (`flex: 1`, dim `rgba(0, 0, 0, 0.5)`, `justifyContent + alignItems: center`, `padding: 20`, `onPress={onDismiss}`) wrapping the **unchanged** card in an inner `Pressable` (`onPress={() => {}}` tap-swallow so card-gap taps never dismiss; `() => {}` precedent already lint-clean in-tree). `Portal` + Paper `Modal` imports deleted; `Text`/`Button`/`useTheme` stay on Paper.

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-12 | Shell uses RN `Modal` (`transparent`, `animationType="fade"`, `onRequestClose={onDismiss}`) + backdrop `Pressable` (`flex: 1`, centered, `onPress={onDismiss}`) + inner tap-swallow `Pressable`; zero `<Portal>` + zero `contentContainerStyle`; card tokens (`90%`/`400`/`center`, `displaySmall`, key `56`/`18`) retained (source-text guards) |
| ACC-13 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S06:** Phone portrait (light + dark): card dead-center on both axes with even gutters; backdrop tap + Android back button dismiss; card-gap taps never dismiss; keys/Close unaffected. Web: same, capped at `400`.

### 8.4 Deliverables (FINAL v1.4)

- **D-14 (`components/CalculatorModal.tsx`):** shell rewrite per DEC-07 only. Nothing else in the file.
- **D-15 (`utils/calculator.test.ts`, extend):** ACC-12 guards × android/ios/web. No new test file.
- **D-16 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## 9. v1.5 Amendment — Full-capsule header pill (FINAL v1.5 per user call 2026-10-07: "final / code this for me")

### 9.1 Context (evidence 2026-10-07)

- Same order as SPEC-53 §9 (both pills scoped): the header calculator+bell pill must end in full curves. Pill height ≈ 50px+ but `borderRadius: 20` < 25 (half height) — squarish ends. Stadium: `20 → 28`.

### 9.2 Constraints (FINAL v1.5)

- **CON-11 — Radius-only.** Only the header pill `borderRadius` in `app/(tabs)/index.tsx` MAY change. Calculator modal, keys, bell/badge, paddings, shadows MUST stay byte-identical. Cross-platform; `npm run lint` clean.

### 9.3 Goal (FINAL v1.5)

- **DEC-08:** Header pill container `borderRadius: 20 → 28`. Nothing else.

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-13 | Pill carries `borderRadius: 28`; calculator glyph, bell/badge wiring, `setCalcVisible(true)` intact (source-text guards) |
| ACC-14 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S07:** Phone + web: header pill ends fully round; bell badge + calculator tap unchanged.

### 9.4 Deliverables (FINAL v1.5)

- **D-17 (`app/(tabs)/index.tsx`):** one radius per DEC-08. Nothing else in the file.
- **D-18 (`utils/calculator.test.ts`, extend):** ACC-01 guard rewritten `20 → 28` (consequential stale-assertion fix inside this D) × android/ios/web. No new test file.
- **D-19 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## Glossary

| Term | Meaning |
|---|---|
| Header action cluster | The floating pill holding calculator + bell in the Home header |
| Quick calculator | The requested calculator entry (scope per OD-01) |
| Floating (header) | Detached rounded pill in the header row — never an overlay |

## References

- `app/(tabs)/index.tsx:265-303` (header row under change; `:273-301` bell+badge)
- `specs/53-floating-pill-tab-bar.md` (DD-01 floating tokens — cited only)
- `AGENTS.md §1` (spec-first, bare-minimum, one home, docs)

## Note (2026-10-07, dev-bundle staleness)

- The attached screenshot shows the OLD floating tab bar although the tree implements the SPEC-61 docked in-flow bar — the `localhost:8081` bundle is stale (restart/reload the dev server to see current code). Unrelated to this spec; recorded so screenshots are read against the right build.
