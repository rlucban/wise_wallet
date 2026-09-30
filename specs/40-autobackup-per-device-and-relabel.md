# Spec 40: Auto-Backup Is a Per-Device Setting, and Says So

| Field | Value |
|---|---|
| ID | SPEC-40 |
| Title | Drop the shared `autoBackup` write (per-device authority + read-only profile seed) and relabel the control to what it actually does |
| Status | **FINAL** (2026-09-30 per user call) |
| Owner | User (final authority) |
| Version | 1.0 — FINAL: v1.0 draft approved as-is; implement exactly this. Combines the two follow-ups requested after SPEC-39 (relabel + per-device), because the label must describe the final semantics |
| Scope | `utils/modeState.ts`, `app/(tabs)/settings.tsx`, `utils/modeState.test.ts` |
| Non-goals | Any data-plane resolution change (`resolveDataPlane` / `resolveActivePlane` / `isAutoBackupOn` stay byte-identical); any `wallet-api` change or DDL; `profiles.autoBackup` removal (it stays as a read-only seed); the manual Backup/Restore flows; the SPEC-30 re-registration flow itself; SPEC-39's web hard rule (re-asserted, unchanged); the ON→OFF verified-snapshot seed; `UserProfile` type shape |
| Normative source | This file, once marked FINAL. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently", "observed") is non-normative unless restated as a
requirement.

## 1. Context

### 1.1 The control is a data-plane selector, not a backup

| `autoBackup` | What actually happens |
|---|---|
| **ON** | The server **is** the database. Every add/update/delete goes straight to the API; nothing is persisted to AsyncStorage; no queue, nothing to retry. |
| **OFF** | This device keeps its own copy in AsyncStorage and **automatic sync pauses** (`isTransactionSyncPaused`, `utils/transactionSync.ts:57-63`). |

So the switch answers *"should my data live on this phone, or in the cloud right
now?"* — not "should I make a backup". When OFF, nothing is auto-uploaded, which
is why manual **"Backup Data to Cloud API Now"** / **"Restore Data from Cloud
API"** buttons exist instead. "Auto-Backup: off" means *"I am not automatically
uploading anything"*, not *"I have no backup"*.

### 1.2 Per-device storage already exists and already wins

This is the key finding that makes the change small:

- `setAutoBackup` (`app/(tabs)/settings.tsx:309-314`) already writes **both**
  the shared profile *and* the per-device settings key
  (`setSetting('autoBackup', …)`).
- `isAutoBackupOn` (`utils/apiOnly.ts:28-35`) already reads the **per-device
  store first** — a store value of `'false'` wins over the profile.
- `isTransactionSyncPaused` reads the same per-device store.
- `resolveActivePlane` reads the store first (`utils/apiOnly.ts:44-57`).

**So the behaviour is already per-device.** Only the shared profile write is
vestigial, and it is what creates the cross-device hazard. SPEC-27's recorded
decision (*"autoBackup per-device never synced"*) was therefore right about the
intent and wrong about the implementation.

### 1.3 A live divergence between what is shown and what happens

The Settings **display** reads only the **profile** flag (token-only, SPEC-36
D-01), while every **behavioural** path reads the **per-device store first**. So
on mobile, a store value of `'false'` with a profile value of `true` displays
**"ON"** while the device actually behaves as `local-persist`. Display and
behavior are derived from different sources. This is the same class of defect as
SPEC-39's, and the fix for it is to read one source for both.

### 1.4 The shared write is a cross-device hazard

`updateProfile({ autoBackup })` on the api-only plane PUTs the **shared**
`profiles.autoBackup` column (`context/UserProfileContext.tsx:133-149`,
`supabase/schema.sql:59`). Full write map, verified:

| Site | Write | Target |
|---|---|---|
| `settings.tsx:309-314` `setAutoBackup` | `updateProfile` + `setSetting` | **shared + local** |
| `settings.tsx:429` `!activeUserId` branch | `updateProfile({autoBackup:false})` | **shared** |
| `settings.tsx:382`, `:453`, `:530` | via `setAutoBackup` | **shared + local** |
| `settings.tsx:377` | `saveUserProfile({… autoBackup: true})` | local, new cloud identity |
| `settings.tsx:448-451` | `saveUserProfile({…snapshot, autoBackup:false})` | local, offline-log seed |

So one device's toggle changes another device's plane, and — per SPEC-39 §1.4 —
on the api-only plane turning ON also makes the other device stop persisting
entities locally. Nothing consented on that device.

### 1.5 Three meanings hide behind one switch

| Account | What the switch really does |
|---|---|
| **Local** | Nothing backup-related. `resolveModeState` forces `false`, `app/register.tsx:85` pins `'false'`, and ON routes to *"Register Online Account"* (SPEC-30). It is a promotion entry point wearing a backup costume. |
| **Cloud + mobile** | Switches the data plane (§1.1). |
| **Cloud + web** | Dead control — always live (SPEC-39). |

**Verified:** Local accounts **already have a dedicated "Register Online Account"**
button at `settings.tsx:1371-1373` that calls the same `startReregisterFlow`.
The Local switch is therefore a redundant second entry point into a flow that
already has a labelled button, and can be removed without losing the path.

### 1.6 Migration is a no-op

Anyone who ever used the toggle already has a per-device store value, because
`setAutoBackup` has always written it (§1.2). Anyone who never toggled has no
store value, and seeding from the profile reproduces today's behaviour exactly
(`isAutoBackupOn(undefined, profile)` is the current code path). **No data
migration, no repair pass, no user-visible change on first run.**

## 2. Constraints (normative once FINAL)

- **CON-01 — The per-device store is the single source of truth.** The client
  MUST NOT write `profiles.autoBackup` for this flag on any path. `setAutoBackup`
  MUST write only the per-device settings key. The `!activeUserId` branch at
  `settings.tsx:429` MUST NOT call `updateProfile`. Rationale: the store is
  already first in every behavioural read (§1.2), so this removes a write that
  has no behavioural benefit and a hazard that has real cost (§1.4).
- **CON-02 — The profile column is a read-only seed, never a control.** It MAY
  be read when the device has no stored value (a fresh device, a reinstall) so
  the account's last state carries over. The client MUST NOT update it. The
  column and the `UserProfile.autoBackup` type stay in place (no DDL, no type
  change, `CON-11`).
- **CON-03 — Display and behavior MUST derive from one source.** The Settings
  display MUST use the same precedence the behavioral path uses — per-device
  store first, profile as seed. This closes §1.3. The precedence MUST be
  provably identical to `isAutoBackupOn`, and that identity MUST be pinned by a
  test that exercises both functions (§4 D-03).
- **CON-04 — Exactly one precedence change, no plane change.**
  `resolveDataPlane`, `resolveActivePlane`, `isTransactionSyncPaused`, and every
  call site in `context/*` and `hooks/*` MUST remain byte-identical. **One
  change is permitted and required:** `isAutoBackupOn` MUST give a **present**
  per-device store value priority over the profile — store `'true'` or `'false'`
  wins — and MUST consult the profile only when the store value is absent.
  Rationale: with the shared write removed (`CON-01`) the profile becomes a
  frozen legacy value, and the previous negative-override precedence (only
  `'false'` won) would resolve `store='true'` + `profile=false` to **OFF** — so
  an account that ever turned sync off could never turn it back on. This does
  not change any plane decision: the display and the data layers read the same
  per-device store, and a device with no stored value resolves exactly as before.
- **CON-05 — Honest labels, no new surfaces.** The control MUST stop being
  called "Auto-Backup" (§1.1) and MUST describe the selected mode. Row label
  **"Cloud sync"**, plus a state line that names the live/off mode. No new
  screen, dialog, or route. On web the SPEC-39 hard-rule copy MUST be retained
  and the control MUST remain locked on.
- **CON-06 — Local accounts lose the redundant switch only.** For a Local
  account the switch row MUST NOT render; the existing "Register Online Account"
  button (`settings.tsx:1371-1373`) remains the sole promotion entry point. The
  SPEC-30 flow, dialogs and copy MUST be unchanged, and a Local account MUST
  still make zero network calls from Settings.
- **CON-07 — Mobile behavior is preserved.** For a Cloud account on Android/iOS
  the toggle MUST still flip, the ON→OFF verified-snapshot seed (SPEC-34 CON-06)
  and its failure copy MUST be intact, the manual Backup/Restore buttons MUST
  still appear exactly when the device is local-persist, and the offline-log seed
  at `settings.tsx:448-451` MUST still write its local profile row.
- **CON-08 — Web is unchanged.** SPEC-39 stands: web is unconditionally live, the
  control is locked on and disabled, web writes nothing, and the
  device-divergence note still appears when the profile value is `false`.
- **CON-09 — No cross-device effect from any local action.** After this spec,
  changing the control on one device MUST NOT alter any other device's plane.
  This is the intended semantic change (SPEC-27's original decision) and is
  called out in DEC-02.
- **CON-10 — Standing repo invariants (AGENTS.md §1.5–§1.7).** Android + iOS + Web
  keep working; web stays Vercel-deployable (the resolver is plain TS, no
  Node-only API); Expo Go does not crash on import.
- **CON-11 — No server change, no migration, no new dependency.** No
  `wallet-api` route/contract/DDL edit; no `supabase/schema.sql` edit; no
  `package.json` addition; no storage-key, AsyncStorage-shape, navigation-route
  or type change. `setSetting('autoBackup', …)` keeps its existing key.

## 3. Goal

| Scenario | After (FINAL) |
|---|---|
| Cloud + mobile, live | Row reads "Cloud sync", state line "Live — every change is saved to your cloud account as you make it."; toggle flips; **no** profile write |
| Cloud + mobile, off | State line "Off — this device keeps its own copy and syncing is paused."; manual Backup/Restore buttons present; ON→OFF seed intact |
| Cloud + mobile, fresh device (no stored value) | Seeds from the profile, i.e. exactly today's behavior |
| Cloud + mobile, store `'false'` + profile `true` | **Displays OFF** (today it wrongly displays ON) and behaves local-persist — display and behavior now agree |
| Cloud + web | Unchanged: locked on, hard-rule copy, divergence note, zero writes |
| Local (mobile) | Switch row hidden; "Register Online Account" button is the sole entry point; zero network calls; flow unchanged |
| Toggle on device A | Affects **only** device A (CON-09) |
| Data plane, server, schema, storage keys, types | Unchanged (CON-04/CON-11) |

Open decisions: none outstanding.

### 3.1 Decisions

- **DEC-01 — One combined spec.** Relabeling and per-device storage were
  requested together; writing the label twice would mean shipping words that
  describe intermediate behavior.
- **DEC-02 — Per-device authority, profile as read-only seed.** The store wins;
  the profile seeds only a device that has no value. Rejected alternative:
  ignoring the profile entirely (a reinstalled phone would silently jump to live).
  **Signed-off semantic change:** after this, turning sync off on one device no
  longer affects another (CON-09) — that is the whole point, and matches SPEC-27.
- **DEC-03 — Local switch removed, existing button reused.** The promotion path
  already has a labelled button (§1.5), so the switch is a redundant entry point
  into a non-backup flow. Rejected alternative: relabel the Local switch
  "Register Online Account" — that duplicates the button two rows away.
- **DEC-04 — "Cloud sync" + a state line.** A binary control needs a label that
  is accurate in both states. Rejected: "Live sync"/"Keep data on this device" as
  the row label (only reads correctly when on) and hiding the state (the user
  cannot tell which mode they are in).
- **DEC-05 — Pin display to behavior with a cross-module test.** A test
  exercising the resolver and `isAutoBackupOn` over the same inputs makes §1.3
  unrepresentable rather than merely documented.
- **DEC-06 — Web untouched.** SPEC-39 already handles it and nothing here
  changes its inputs beyond adding the per-device value.
- **DEC-07 — `UserProfile.autoBackup` stays required.** The re-registration local
  save at `settings.tsx:377` keeps writing `autoBackup: true` for a brand-new
  identity: harmless, because the store wins on that same device, and it avoids a
  type change (`CON-11`).

### 3.2 Platform matrix — Objective (machine-checkable, `jest` × `Platform.OS`)

Platform-aware by design, so the matrix carries real signal: `web` diverges for
Cloud (SPEC-39) and MUST NOT diverge for Local; native mirrors the per-device
value; Local is identical everywhere.

| # | Android | iOS | Web |
|---|---|---|---|
| ACC-01 | pass | pass | pass (differs by design) |
| ACC-02 | pass | pass | pass (differs by design) |
| ACC-03 | pass | pass | pass (differs by design) |
| ACC-04 | pass | pass | pass (identical) |
| ACC-05 | pass | pass | pass |
| ACC-06 | pass | pass | pass |
| ACC-07 | pass | pass | pass |
| ACC-08 | pass | pass | pass |

- **ACC-01 — The per-device value wins over the profile, both ways.** With
  `deviceSettingValue === 'false'` the resolver reports `effective: false` **even
  when `profileAutoBackup === true`** — the case that displays wrongly today
  (§1.3). With `'true'` it reports `true` **even when `profileAutoBackup ===
  false`** (see ACC-08). On `web` the effective value stays `true` (ACC-03,
  `CON-08`).
- **ACC-02 — Profile seeds only an empty device.** With
  `deviceSettingValue` `null`/`undefined`/absent, the resolver falls back to the
  profile (`false`→`false`, `true`→`true`, absent→`true`).
- **ACC-03 — Web remains locked on, SPEC-39 intact.** Cloud + `web` → `effective
  true`, `writable false`, `lockedCopy` non-null, for every combination of
  per-device and profile values; `deviceDiffers` true only when the **profile** is
  `false` (the note describes the other device, not this one).
- **ACC-04 — Local is identical on all three platforms** → `effective: false`,
  `writable: true`, `deviceDiffers: false`, `lockedCopy: null` (SPEC-30
  preserved; the switch row is hidden in the UI per `CON-06`).
- **ACC-05 — Display precedence equals behavioral precedence.** For a matrix of
  (store value × profile value × platform) inputs, the resolver's `effective`
  MUST equal `isAutoBackupOn(store, profile)` on native, and MUST equal `true` on
  web — i.e. wherever the resolver is **writable** it must agree exactly with the
  function the data layers use. This is the §1.3 closure.
- **ACC-06 — Copy honesty.** Row label MUST be "Cloud sync" and MUST NOT contain
  "Auto-Backup" or "backup"; the live state line MUST say the data is saved as
  changes are made; the off state line MUST say the device keeps its own copy and
  that syncing is paused; neither may claim a backup is being taken. The
  SPEC-39 `WEB_AUTOBACKUP_ALWAYS_ON` copy MUST still be present and unchanged.
- **ACC-07 — Source scan.** `settings.tsx` MUST NOT contain
  `updateProfile({ autoBackup` anywhere; `setAutoBackup` MUST NOT call
  `updateProfile`; the Local branch of the switch row MUST be gated on `!isLocal`;
  the switch row MUST NOT render when `isLocal`; the existing "Register Online
  Account" button MUST still be present and still call `startReregisterFlow`;
  SPEC-39's guards (`!autoBackupWritable`, the bare web `return`, the
  `!isApiOnlyPlane` button gates) MUST all survive; `resolveDataPlane`,
  `resolveActivePlane` and `isTransactionSyncPaused` MUST be byte-identical.
- **ACC-08 — The regression the `CON-04` amendment exists to prevent.** A device
  with `deviceSettingValue === 'true'` and `profileAutoBackup === false` — i.e. an
  account that once turned sync off and has now turned it back on, where the
  profile is frozen at the legacy `false` — MUST resolve to `effective: true`, and
  `isAutoBackupOn('true', false)` MUST also be `true`. Under the previous
  negative-override precedence both were `false`, which made the toggle
  permanently unable to turn sync back on.

### 3.3 Platform matrix — Subjective (human-judged, observable reviewer checks)

| # | Android (Expo Go) | iOS (Expo Go) | Web (`expo export --platform web`) |
|---|---|---|---|
| ACC-08 | pass | pass | pass |
| ACC-09 | pass | pass | n/a |
| ACC-10 | pass | n/a | n/a |
| ACC-11 | pass | pass | n/a |

- **ACC-08 — Labels read true (all platforms).** Reviewer confirms the row is
  labelled "Cloud sync", the state line matches the current mode, and the word
  "Auto-Backup" appears nowhere in Settings. On web the hard-rule copy is still
  present and the control is still locked on.
- **ACC-09 — Per-device independence (the point of the spec).** Reviewer on each
  native platform: set the account to live on device A; confirm that on device A
  the state line says "Live" and toggling to OFF changes **only** device A —
  device B (already logged in) still reads "Live" and still writes to the cloud,
  and its "Live sync" behavior is unchanged. Then confirm the reverse (OFF on A
  does not turn B off).
- **ACC-10 — Local loses only the switch.** Reviewer on Android with a Local
  account confirms the Auto-Backup row is gone, the "Register Online Account"
  button is present and still starts the SPEC-30 flow with its existing dialog
  and copy, and Settings still makes zero network calls.
- **ACC-11 — No regression on mobile.** Reviewer on each native platform with a
  Cloud account confirms the toggle still flips, OFF still shows the "Off" state
  line plus both manual Backup/Restore buttons, the ON→OFF flow still shows its
  "Couldn't Reach Server" copy when offline and still seeds the offline log, and
  the **server network panel shows no `PUT userProfiles` when toggling** (this is
  the observable proof of `CON-01`).

## 4. Deliverables

- **D-01 — `utils/modeState.ts`:** extend `AutoBackupControlInput` with
  `deviceSettingValue?: string | null` (the raw per-device store value) and apply
  the store-first precedence inside `resolveAutoBackupControl`, so the display
  and `isAutoBackupOn` cannot drift (`CON-03`). Add copy constants
  `SYNC_ROW_LABEL` ("Cloud sync"), `SYNC_STATE_LIVE`, `SYNC_STATE_OFF`. Web and
  Local arms keep SPEC-39 behavior; the web `deviceDiffers` arm continues to test
  the **profile** value. `resolveModeState`, `resolveDataPlane`,
  `resolveToggleRoute` remain byte-identical.
- **D-02 — `app/(tabs)/settings.tsx`:**
  (a) source the per-device value from **`getSetting('autoBackup')`** — the
  canonical reader every other path already uses (cache → `user_{id}_settings`
  → `|| null`, and it hydrates the cache). `getCachedSetting` alone MUST NOT be
  used: that Map is never hydrated from AsyncStorage and is cleared by
  `clearSessionCaches()`, so it is `undefined` on every cold start and
  immediately after login — which would reopen the very divergence CON-03
  closes. The read MUST re-run when `activeUserId` changes (`getPrefixedKey` is
  active-user-scoped), and the switch MUST stay `disabled` until the value has
  resolved so no frame can present the profile seed as the device's own value;
  (b) `setAutoBackup` drops its `updateProfile` call and writes only the
  per-device key (`CON-01`);
  (c) the `!activeUserId` branch at `:429` MUST NOT call `updateProfile`;
  (d) the switch row's label becomes `SYNC_ROW_LABEL` and the row MUST NOT render
  when `isLocal` (`CON-06`), with the state line and an on/off icon;
  (e) relabel the `disableAutoBackupWithSeed` success message
  (`settings.tsx:455`) away from "Auto-Backup";
  (f) `SyncStatusCard`'s "Backup on/off" diagnostic (`settings.tsx:89`) becomes
  "Sync on/off".
  All SPEC-39 guards preserved (ACC-07).
- **D-03 — `utils/modeState.test.ts`:** add SPEC-40 ACC-01..07 ×
  `android`/`ios`/`web`, including an ACC-05 test that imports `isAutoBackupOn`
  from `./apiOnly` and asserts agreement with the resolver across a store ×
  profile × platform matrix, plus the ACC-07 source scan.
- **D-04 — Docs.** `docs/savepoint.md` entry recording that the store already
  won behaviorally (§1.2) so this removed a vestigial write, that migration is a
  no-op (§1.6), and the DEC-02 cross-device semantic change; `AGENTS.md §3`
  append entry; this file's Status → FINAL with the approval date.
- **D-05 — User-run verification** (§1.3 — the agent does not run these):
  `npx tsc --noEmit`, `npx tsc -p tsconfig.test.json --noEmit`, `npm test`,
  `npx eslint .`, then Expo Go Android + iOS (ACC-09/10/11) and
  `expo export --platform web` (ACC-08).

## Glossary

| Term | Meaning |
|---|---|
| Live / ON | Server *is* the database; direct API writes; no local entity persistence |
| Off / local-persist | Device keeps its own copy in AsyncStorage; automatic sync paused |
| Per-device store | `user_{id}_settings.autoBackup` in AsyncStorage; the single source of truth |
| Profile seed | `profiles.autoBackup`; read-only, seeds a device that has no stored value |
| Cross-device hazard | One device's write changing another device's plane via the shared column |
| Relabel | "Auto-Backup" → "Cloud sync" + an honest state line |

## References

- `AGENTS.md §1` — spec-first, no-CLI, invariants, docs; §1.4 no breaking
  changes; §1.9 spec format; §1.10 platform matrix + TDD.
- `specs/39-web-autobackup-always-on.md` — web hard rule, locked control, copy
  constants, `CON-08` re-asserted; its §1.5/§1.6 divergences are resolved here.
- `specs/34-api-only-online-mode.md` — CON-01/CON-02 plane router, CON-06 ON→OFF
  verified-snapshot seed, CON-08 api-only card copy.
- `specs/30-local-creation-gate-and-reregistration-promotion.md` — D-03/CON-03
  Local ON → re-registration; preserved, with the switch removed (`CON-06`).
- `specs/27-two-device-single-transaction-log.md` — "autoBackup per-device never
  synced" intent, implemented here (DEC-02).
- `specs/36-mode-truth-token-only.md` — D-01 `resolveModeState` token-only,
  preserved.
- `utils/modeState.ts:20-24,26-32,49-81`;
  `utils/apiOnly.ts:15-23,28-35,39-59`; `utils/cache.ts:12,16`;
  `utils/transactionSync.ts:57-63`; `context/UserProfileContext.tsx:133-149`;
  `app/(tabs)/settings.tsx:89,309-314,377,382,429,448-453,455,530,1235,1300-1347,1371-1373`;
  `app/register.tsx:85`; `supabase/schema.sql:59`; `types/index.ts:77`.
