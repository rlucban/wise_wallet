# Spec 05: Multi-Device Behavior

| Field | Value |
|---|---|
| ID | SPEC-05 |
| Title | Multi-Device Behavior — Session Kill Notification & Conflict Resolution UX |
| Status | **FINAL** (2026-09-22 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | Single-session enforcement UX, session kill notification, conflict resolution display |
| Non-goals | Concurrent sessions, push notifications, real-time sync, offline orphan recovery |
| Normative source | This file. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119.

## 1. Context

### 1.1 Problem

The current multi-device architecture has three UX gaps:

1. **Lazy session invalidation.** When Device B force-logins, Device A's JWT is
   invalidated server-side, but Device A does not know until its next API call
   returns 401. The user sees a generic logout with no explanation.
2. **Silent data overwrite.** When sync merges remote data that overwrites local
   records (LWW), the user is never told which records were affected.
3. **No session kill alert.** The 401 handler clears credentials and redirects
   to login, but does not explain *why* the user was logged out.

### 1.2 Current architecture

| Layer | Behavior |
|---|---|
| Auth | JWT per login; `authFetch` sends `Authorization: Bearer {token}` |
| Session | API enforces single active session per user |
| Conflict | Device B logs in → `sessionConflict: true` → user confirms → `force: true` → Device A's JWT invalidated |
| 401 | `authFetch` catches 401 → clears local credentials → `onAuthFailure` callback → nav guard redirects to login |
| Sync | Local + remote merged on fetch; LWW via `updatedAt`; sync queue processes sequentially |
| Alerts | `SystemAlertsContext` supports in-app alerts (currently used for negative balance only) |

### 1.3 Definitions

**Session kill** — server-side invalidation of a JWT when another device
force-logins with the same account.

**Overwritten record** — a local record whose `updatedAt` is older than the
corresponding remote record's `updatedAt` during sync merge, causing the local
version to be replaced.

## 2. Constraints (normative)

- **CON-MD-01 — Session kill alert.** When `authFetch` receives a 401 response
  (indicating session ended by another device or token expiry), the app MUST
  create an in-app alert with type `"Warning"`, title `"Session Ended"`, and
  message `"Your session was ended on another device. Please log in again."`
  before redirecting to the login screen. The alert MUST be persisted via
  `SystemAlertsContext` so it survives the redirect and is visible on the
  Notifications screen.
- **CON-MD-02 — Conflict overwrite banner.** After sync merge completes for any
  entity (transactions, categories, dues, savings), if any local records were
  overwritten by remote (remote `updatedAt` > local `updatedAt`), the app MUST
  log the count and show a non-blocking toast/banner: `"{N} record(s) updated
  from another device."` This banner MUST NOT block interaction.
- **CON-MD-03 — Standalone alert types.** The session kill alert MUST use
  `type: "Warning"` (same as negative balance alerts). The conflict overwrite
  banner is transient (auto-dismiss, not persisted) and uses the existing
  toast/banner pattern.
- **CON-MD-04 — No data loss from alert creation.** Creating the session kill
  alert MUST NOT interfere with the credential-clearing or redirect flow. The
  alert is written to AsyncStorage; the redirect happens after.

## 3. Goal

Improve multi-device UX by:
1. Explaining *why* the user was logged out (session ended on another device).
2. Informing the user when sync overwrites their local data from another device.

### Acceptance criteria

- **ACC-MD-01:** a user force-logged-out by another device sees "Session Ended —
  Your session was ended on another device. Please log in again." on the login
  screen (via Notifications).
- **ACC-MD-02:** after sync merge, if 3 transactions were overwritten, the user
  sees a transient banner: "3 record(s) updated from another device."
- **ACC-MD-03:** the session kill alert persists across app restarts (visible in
  Notifications until dismissed).
- **ACC-MD-04:** the conflict overwrite banner auto-dismisses within 5 seconds
  and does not block UI interaction.

## 4. Deliverables

- **D-MD-01 — Session kill notification:** modify `apiClient.ts` to pass 401
  status to `onAuthFailure` callback; modify `AuthContext.tsx` to accept and
  forward the reason; modify `SystemAlertsContext.tsx` to add
  `addSessionAlert(reason)` method; modify `_layout.tsx` nav guard to create
  the alert before redirecting to login.
- **D-MD-02 — Conflict overwrite display:** modify `TransactionsContext.tsx`,
  `useSavings.ts`, `useDues.ts`, `CategoriesContext.tsx` merge logic to count
  overwritten records (local `updatedAt` < remote `updatedAt` for same ID) and
  show a transient banner with the count.

## Glossary

| Term | Meaning |
|---|---|
| Session kill | Server-side JWT invalidation when another device force-logins |
| Overwritten record | Local record replaced by remote during LWW sync merge |
| Transient banner | Non-blocking, auto-dismissing in-app notification |

## References

- `utils/apiClient.ts` — `authFetch` 401 handling
- `context/AuthContext.tsx` — `handleAuthFailure` callback
- `context/SystemAlertsContext.tsx` — in-app alert system
- `app/_layout.tsx` — nav guard (redirects on auth state change)
- `context/TransactionsContext.tsx` — sync merge logic
- `hooks/useSavings.ts`, `hooks/useDues.ts`, `context/CategoriesContext.tsx` — sync merge logic

## 5. Amendment — Toast legibility: centered + readable contrast (FINAL per user call 2026-10-07: all (a), code this for me)

### 5.1 Context (evidence 2026-10-07)

- Screenshot (Home, web, light mode): the "Transaction deleted successfully." toast renders as a bottom strip — white text on a near-white bar (`ToastContext.tsx:33` forces `backgroundColor: colors.elevation.level3`, breaking Paper's default inverse pairing), half-covered by the bottom nav. User order: the validation toast MUST sit centered on screen ("dapat nasa center yan"), clearly readable.
- `context/ToastContext.tsx` (root-mounted `ToastProvider`, 5s auto-dismiss + OK action) serves every app toast (session, conflict, delete/edit success) — one fix covers all.

### 5.2 Decisions (CALLED — FINAL: OD-MD-5 a, OD-MD-6 a)

- **OD-MD-5 (centering mechanism).** (a) Proposed: center via Paper Snackbar `wrapperStyle` (verify the prop against installed `react-native-paper@^5.13.1` types at implementation; fallback = a centered `Portal` view with identical copy/timing — no new dependency either way). (b) Custom centered toast outright.
- **OD-MD-6 (contrast tokens).** (a) Proposed: explicit M3 inverse pair — background `inverseSurface`, text + action `inverseOnSurface` (readable in light + dark mode); drop the `elevation.level3` override. (b) User-supplied tokens.

### 5.3 Constraints

- **CON-MD-05 — Toast-only, behavior-preserving.** Only `context/ToastContext.tsx` MAY change. Message flow, 5s auto-dismiss, OK action, and all callers MUST stay byte-identical. Identical rendering on Android + iOS + Web. No new dependency.

### 5.4 Goal

- **DEC-MD-5/DEC-MD-6 (pending OD-MD-5/OD-MD-6).** Every toast: vertically + horizontally centered card, inverse-pair contrast, same timing/action/callers.

| State | Behavior |
|---|---|
| Any `showToast` call | Centered readable card; auto-dismiss 5s; OK dismisses; never blocks input |
| Light mode / dark mode | Text legible on the bar in both (inverse pair) |
| Bottom nav present | Toast never hides behind it (centered, not bottom-docked) |

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-MD-05 | `ToastContext.tsx` centers the toast (centering keys present) with the inverse pair (`inverseSurface` + `inverseOnSurface`) and zero `elevation.level3` background override; `showToast`/duration/action wiring intact |
| ACC-MD-06 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-MD-07:** Reviewer triggers any toast (e.g. delete a transaction) on phone + web desktop, light + dark mode: card sits screen-centered, text fully legible, dismisses via OK/timeout, never covered by the nav bar.

### 5.5 Deliverables

- **D-MD-03 (`context/ToastContext.tsx`):** centering + contrast per DEC-MD-5/DEC-MD-6. Nothing else in the file.
- **D-MD-04 (tests):** source guards × android/ios/web (centering + inverse pair + wiring intact).
- **D-MD-05 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## 6. Amendment — Toast matches the app design system (FINAL per user call 2026-10-07: "OD-MD-7 a ... FINAL, code this for me")

### 6.1 Context (evidence 2026-10-07)

- Screenshot (Transaction Details, web, light mode): the §5 toast is centered and legible, but it is a generic near-black rectangle — it does not match the app's design language (`context/ThemeContext.tsx`: navy `primary #1B3F7A`, `onPrimary #FFFFFF`, rounded cards r16–24, `roundness: 3`). User order: the toast design MUST match the system ("tugma sa system"). Position (centered) and timing/action/callers from §5 are accepted — only the visual tokens change.

### 6.2 Decisions (CALLED — FINAL: OD-MD-7 a)

- **OD-MD-7 (toast skin).** (a) Proposed — navy system toast: background `primary`, text + OK action `onPrimary`, `borderRadius: 16` (card language), centered + maxWidth 480 retained. Reads WiseWallet-native in both modes (dark mode: `primary #4A90D9` + `onPrimary #001F4D`). (b) Keep the dark neutral (`inverseSurface` + `inverseOnSurface`) and only add `borderRadius: 16`. (c) Typed tints (success = tertiaryContainer, error = errorContainer) — bigger scope: needs a `showToast(message, type?)` API change across callers; only if the user wants per-type color.

### 6.3 Constraints

- **CON-MD-06 — Skin-only.** Only colors/radius in `context/ToastContext.tsx` MAY change. Centering, maxWidth, 5s timing, OK action, message flow, and all callers MUST stay byte-identical. Identical on Android + iOS + Web. No new dependency.

### 6.4 Goal

- **DEC-MD-7 (pending OD-MD-7).** Toast skin per the called option; everything else from §5 stands.

| State | Behavior |
|---|---|
| Any `showToast` call | Same centered card, same timing/action; only the skin matches the called tokens |
| Light mode / dark mode | Pair stays legible in both (each option names its own pair) |

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-MD-08 | `ToastContext.tsx` carries the called skin tokens (background + text/action pair + radius) and zero of the superseded skin; centering/maxWidth/timing/action wiring intact |
| ACC-MD-09 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-MD-10:** Reviewer triggers a toast on phone + web, light + dark: reads as part of the app design system (navy per (a) / refined dark per (b)), centered, legible, never covered by nav.

### 6.5 Deliverables

- **D-MD-06 (`context/ToastContext.tsx`):** skin tokens per DEC-MD-7. Nothing else in the file.
- **D-MD-07 (tests):** source guards × android/ios/web (called skin + retained wiring).
- **D-MD-08 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## 7. Amendment — Global toast docks to the bottom (FINAL per user call 2026-10-07: OD-T1 option (a) via SPEC-64 gate, "Global to bottom")

### 7.1 Context (evidence 2026-10-07)

- Screenshot (Transaction Details, web, light mode): the §5-centered/§6-navy toast ("Transaction updated successfully.") floats screen-centered over the card content. User order: feedback toasts MUST sit at the bottom (`bottom: 24`), not centered.
- SPEC-64 §3.4 raised the §1.13 overlap gate (toast position is this file's home); the user explicitly called option (a) — amend this spec, global bottom on **all** surfaces. This knowingly supersedes §5's centered position (the complaint §5 fixed — toast hidden behind the old bottom nav — no longer applies: SPEC-61 made the bar in-flow, so a bottom toast overlays niczero; transient 5s + OK-dismiss keeps it non-blocking, standard Material behavior). Navy skin (§6), maxWidth 480, 5s timing, OK action, message flow, and all callers are retained.
- Canonical home for toast position is this file per §1.14. SPEC-64 cross-references only.

### 7.2 Constraints

- **CON-MD-07 — Position-only.** Only `wrapperStyle` in `context/ToastContext.tsx` MAY change. Skin, maxWidth, timing, action, flow, callers MUST stay byte-identical. Identical on Android + iOS + Web. No new dependency.

### 7.3 Goal

- **DEC-MD-8:** `wrapperStyle={{ top: 0, bottom: 0, justifyContent: "center" } → { top: 0, bottom: 24, justifyContent: "flex-end" }` (24px dock gap; horizontal centering via the retained `alignSelf: "center"` style). Nothing else.

| State | Behavior |
|---|---|
| Any `showToast` call | Bottom-docked card 24px above the screen edge; auto-dismiss 5s; OK dismisses; transient overlap with nav is standard Material behavior |
| Light mode / dark mode | Navy skin legibility unchanged (§6 retained) |

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-MD-11 | `ToastContext.tsx` carries `bottom: 24` + `justifyContent: "flex-end"` with zero `justifyContent: "center"`; navy skin (`colors.primary` + `borderRadius: 16` + `maxWidth: 480`) and timing/action wiring intact (source-text guards) |
| ACC-MD-12 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-MD-13:** Reviewer triggers a toast on phone + web, light + dark: card docks at the bottom with a clear gap, legible, dismisses via OK/timeout, never stuck mid-screen.

### 7.4 Deliverables

- **D-MD-09 (`context/ToastContext.tsx`):** `wrapperStyle` swap per DEC-MD-8. Nothing else in the file.
- **D-MD-10 (tests):** §6 ACC-MD-08 guards rewritten to ACC-MD-11 × android/ios/web (consequential stale-assertion fix inside this D); all other guards retained.
- **D-MD-11 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.
