# Spec 39: Web Auto-Backup Is Always On (Never Write the Shared Flag, Tell the Truth)

| Field | Value |
|---|---|
| ID | SPEC-39 |
| Title | `autoBackup` is mobile intent; web is unconditionally live, never writes the flag, and states so |
| Status | **FINAL** (2026-09-30 per user call) |
| Owner | User (final authority) |
| Version | 1.0 — FINAL: v1.0 draft approved as-is; implement exactly this. Built from user calls 2026-09-30 — web never auto-writes the flag; locked ON with explanation; persistent Settings note |
| Scope | `utils/modeState.ts` (new pure resolver + copy constants), `app/(tabs)/settings.tsx` (display + write gating only) |
| Non-goals | Any `wallet-api` change or DDL; making web support an OFF plane; changing any data-plane resolution; migrating the profile field to per-device (SPEC-27's original intent — noted in §1.5, unchanged); the native store-vs-profile display divergence (§1.6, pre-existing, unchanged); the data layers in `context/*` and `hooks/*`; SPEC-30 Local promotion flow |
| Normative source | This file, once marked FINAL. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently", "observed") is non-normative unless restated as a
requirement.

## 1. Context

### 1.1 One shared field, two incompatible meanings

`profiles.autoBackup` is a **single column on the shared cloud profile**
(`supabase/schema.sql:59`, `"autoBackup" BOOLEAN DEFAULT TRUE`). But web's
behavior is hardcoded, so the flag is inert there:

```ts
// utils/apiOnly.ts:15-23 — identical logic in utils/modeState.ts:26-32
if (args.isLocal) return "local-persist";
if (args.platformOs === "web") return "api-only";   // ← web is ALWAYS live
return args.autoBackup ? "api-only" : "local-persist";
```

The field is asked to mean two incompatible things:

| Platform | What the value actually controls |
|---|---|
| mobile | **device control** — "this device keeps its own copy, sync paused" (`local-persist` plane: AsyncStorage repos + a paused queue) |
| web | **account capability** — always true; the value is never consulted |

### 1.2 The flag does nothing on web — verified, so the risk is the inverse

Traced `addTransaction` (`context/TransactionsContext.tsx:202-238`):

```ts
const plane = await resolveActivePlane({ platformOs: Platform.OS, isLocal, profileAutoBackup: profile?.autoBackup });
if (plane === "api-only") {
    const res = await apiCreate("transactions", uploaded, activeUserId);  // straight to the server
    setTransactions((prev) => [...prev, created]);
    return;                                   // ← early return
}
await txRepo.upsert(newTransaction);
...
const autoBackup = await getSetting('autoBackup');
if (API_URL && autoBackup !== 'false') { ... } // never reached on web
```

On web the plane is always `"api-only"`, so every add/update/delete is
persisted to the server **immediately** and the `autoBackup` check is **never
evaluated**. Same shape in the update/delete paths and in
`context/CategoriesContext.tsx`. `utils/apiOnly.ts:28-35` (`isAutoBackupOn`)
only feeds `resolveDataPlane`, which already short-circuits on web.

**Consequence: no data loss and no "sync doesn't work on web" bug. The harm is
the opposite — a false assurance about where data lives.**

### 1.3 Four surfaces tell the user the opposite of the truth

With `profiles.autoBackup === false` (set on a phone) and the user on web,
`resolveModeState` (`utils/modeState.ts:20-24`) is **platform-blind** and
reports the raw profile value, so Settings shows:

| Surface | Says | Actually |
|---|---|---|
| Auto-Backup switch (`app/(tabs)/settings.tsx:1307`) | **OFF** | live, writing to the cloud on every change |
| Profile subtitle (`settings.tsx:1223`) | **"Cloud account — sync off"** | cloud-backed, always |
| `SyncStatusCard` (`settings.tsx:98`, via `:100` / `:1300`) | **"Sync off"** + cloud-off icon | live (`apiOnly` is `true` at `settings.tsx:63`) |
| Manual Backup/Restore buttons (`settings.tsx:1312`, `:1318`) | **shown** | meaningless — the server *is* the datastore; a restore could overwrite the live log with a stale snapshot |

A user reading "sync off" reasonably concludes their financial data is not
reaching the cloud, while every transaction write is landing on the server in
real time. That is a data-residency misstatement, not a cosmetic bug.

### 1.4 Web writes can reconfigure another device

`disableAutoBackupWithSeed` has a web branch that writes the shared profile:

```ts
// app/(tabs)/settings.tsx:415-419
if (Platform.OS === "web" || !activeUserId) {
  await updateProfile({ autoBackup: false });   // → ensureCloudProfile → PUT
  return;
}
```

`updateProfile` on web resolves to the api-only plane and PUTs the whole
profile (`context/UserProfileContext.tsx:133-149`). And `setAutoBackup`
(`settings.tsx:303-308`) writes both the profile and the local settings key.
So on web:

- **Toggling OFF** writes `false` → the **phone** flips to `local-persist`,
  while web itself stays live. The write means the opposite of what web did.
- **Toggling ON** (after PIN verify) writes `true` → the **phone** silently
  becomes `api-only`, i.e. per SPEC-34 it stops persisting entities to
  AsyncStorage and its cached log stops being the source of truth — triggered by
  a browser action, with no consent and no warning on that device.

Either direction, one browser tab changes another device's storage behavior.

### 1.5 Observed contradiction, NOT fixed here

SPEC-27's recorded decision is *"autoBackup per-device never synced"*
(`AGENTS.md` §3, SPEC-27 entry). That intent was never implemented — the flag is
written to the shared cloud profile (`settings.tsx:304`). This spec keeps the
current synced model (DEC-01) and only stops web from writing it. Restoring
per-device semantics is a separate decision with its own migration.

### 1.6 Another pre-existing divergence, NOT fixed here

The Settings display reads only the **profile** flag (token-only, SPEC-36
D-01), while `resolveActivePlane` reads the **local settings store first**
(`utils/apiOnly.ts:44-57`, `isAutoBackupOn`: store `'false'` wins). So on
mobile, a store value of `'false'` with a profile value of `true` also displays
"ON" while behaving as local-persist. Pre-existing, out of scope, unchanged.

### 1.7 Definitions

**Mobile intent** — the meaning `autoBackup` has where it is actually
consulted: a per-device control on mobile.

**Hard rule** — on web, auto-backup is unconditionally on. Not a preference, not
a toggle: the browser app has no local-only plane.

**Device divergence** — web Cloud account whose `profiles.autoBackup` is `false`
(set on a phone). Web is live; the profile value is left untouched.

## 2. Constraints (normative once FINAL)

- **CON-01 — Web MUST NOT write `autoBackup`.** No code path reachable on web
  may call `updateProfile({ autoBackup })` or `setSetting('autoBackup', …)` for
  this flag. Web MUST NOT auto-write `true`, MUST NOT auto-write `false`, and
  MUST NOT "normalize" the shared value. Rationale: it is the one value that
  genuinely controls mobile behavior (§1.4); a browser action must never
  reconfigure another device.
- **CON-02 — The displayed value MUST equal the actual value.** On web the
  Auto-Backup control MUST render as **on**, because that is what happens
  (§1.2). Every surface derived from it — the switch, the profile subtitle, the
  `SyncStatusCard`, the manual Backup/Restore buttons, export/import gating —
  MUST be consistent with it, on every platform.
- **CON-03 — Web's control is locked and explained.** On web the switch MUST be
  **disabled** and MUST be accompanied by copy stating the hard rule verbatim in
  spirit: auto-backup is always on for web, every change is saved to the cloud
  account as it is made, and the setting is managed from the mobile app.
- **CON-04 — Device divergence is disclosed, not resolved.** When web is live
  and `profiles.autoBackup === false`, a persistent note MUST be shown stating
  that the mobile device has auto-backup off, that its data stays on that phone,
  and that using this browser did not change it. The note MUST NOT imply that
  any write occurred, and MUST NOT claim sync is off on web.
- **CON-05 — The note appears only when there is a divergence.** It MUST render
  when the profile value is `false` on web, and MUST NOT render otherwise
  (including web with the flag `true`, mobile, and Local).
- **CON-06 — Local accounts are unchanged.** For a Local account the control
  MUST remain writable and MUST keep SPEC-30 D-03 behavior (ON routes to the
  re-registration flow). No copy, gating, or network change.
- **CON-07 — Mobile is behaviorally byte-identical.** For a Cloud account on
  Android/iOS the displayed value, the toggle, the ON→OFF verified-snapshot seed
  (SPEC-34 CON-06), the manual Backup/Restore buttons, and every network call
  MUST behave exactly as today. This spec is a **display and write-gating** fix;
  it MUST NOT change any data-plane resolution.
- **CON-08 — No data-layer change.** `resolveDataPlane`, `resolveActivePlane`,
  `isAutoBackupOn`, and every `resolveActivePlane` call site in `context/*` and
  `hooks/*` MUST remain byte-identical. The fix lives entirely in the Settings
  **display** value plus the web write guards.
- **CON-09 — `resolveModeState` MUST remain byte-identical.** SPEC-36 D-01 made
  it token-only on purpose. The platform-aware logic MUST be a **new** pure
  helper alongside it, not a signature change to the existing one.
- **CON-10 — Manual Backup/Restore MUST be suppressed on any api-only plane.**
  Those two buttons MUST additionally require `!isApiOnlyPlane`, so they can
  never appear where the server is the datastore — independently of the
  displayed flag value (defense in depth).
- **CON-11 — Standing repo invariants (AGENTS.md §1.5–§1.7).** Android + iOS +
  Web keep working; web stays Vercel-deployable (the resolver is plain TS, no
  Node-only API); Expo Go does not crash on import.
- **CON-12 — No server change, no migration, no new dependency.** No
  `wallet-api` route/contract/DDL edit; no `supabase/schema.sql` edit; no
  `package.json` addition. Storage keys, AsyncStorage shapes, navigation routes,
  and types are unchanged.

## 3. Goal

| Scenario | After (FINAL) |
|---|---|
| Web Cloud login, profile `autoBackup: false` | Switch **ON + disabled**, hard-rule copy **and** device-divergence note; subtitle "Cloud Sync Enabled"; `SyncStatusCard` shows live state; **no** manual Backup/Restore buttons; **zero** writes to the profile |
| Web Cloud login, profile `autoBackup: true` | Switch **ON + disabled**, hard-rule copy, **no** divergence note |
| Web: any attempt to change the flag | Impossible (disabled) and a no-op if invoked programmatically — no profile write, no settings write |
| Mobile Cloud, `autoBackup: false` | Unchanged: switch OFF, "Cloud account — sync off", "Sync off" card, manual Backup/Restore buttons present, ON→OFF seed intact |
| Mobile Cloud, `autoBackup: true` | Unchanged |
| Local account (mobile) | Unchanged: switch OFF and writable, ON routes to re-registration, zero network calls |
| Data plane on any platform | Unchanged (`CON-08`) |
| `wallet-api`, schema, storage keys, routes | Unchanged (`CON-12`) |

Open decisions: none outstanding.

### 3.1 Decisions

- **DEC-01 — Web never writes the flag** (user, 2026-09-30). Chosen over
  auto-writing `true` (which would silently flip every existing mobile-OFF device
  to `api-only`, §1.4) and over a web-local mirror (a second source of truth for
  no user-visible gain).
- **DEC-02 — Locked ON with explanation** (user, 2026-09-30). Chosen over hiding
  the control (the user would wonder why it is missing) and over mirroring the
  profile value read-only (which keeps displaying a value that does not describe
  web).
- **DEC-03 — Persistent Settings note** (user, 2026-09-30). Chosen over a
  one-time post-login Snackbar (easy to miss, needs new persisted state) and over
  saying nothing (leaves the two-device view unexplained).
- **DEC-04 — A new platform-aware resolver, `resolveAutoBackupControl`.**
  `resolveModeState` stays token-only and byte-identical (`CON-09`, SPEC-36).
- **DEC-05 — Display-only fix.** The new resolver feeds the Settings *display*
  value; the actual plane keeps coming from `resolveActivePlane`
  (`CON-07`/`CON-08`), so no data behavior can regress.
- **DEC-06 — Manual Backup/Restore also gated on `!isApiOnlyPlane`**
  (`CON-10`), independent of the displayed flag.
- **DEC-07 — Mobile intent, not account capability.** Recorded as the spec's
  premise (§1.1): the field's meaning is "device control where it is consulted".
  Restoring per-device storage is deferred (§1.5).

### 3.2 Platform matrix — Objective (machine-checkable, `jest` × `Platform.OS`)

Unlike the platform-blind helpers of SPEC-36/37, this resolver is
**platform-aware by design**, so the matrix carries real signal: `web` MUST
diverge from `android`/`ios` for Cloud accounts and MUST NOT diverge for Local.

| # | Android | iOS | Web |
|---|---|---|---|
| ACC-01 | pass | pass | pass (differs by design) |
| ACC-02 | pass | pass | pass (differs by design) |
| ACC-03 | pass | pass | pass (identical) |
| ACC-04 | pass | pass | pass (differs by design) |
| ACC-05 | pass | pass | pass |
| ACC-06 | pass | pass | pass |

- **ACC-01 — Web is locked ON.** Cloud + `web` → `effective: true`,
  `writable: false`, `lockedCopy` non-null, for every profile value
  (`false`, `true`, `undefined`).
- **ACC-02 — Mobile mirrors the profile and stays writable.** Cloud + native →
  `effective` equals `profileAutoBackup` (`false`→`false`, `true`→`true`,
  `undefined`→`true`), `writable: true`, `lockedCopy: null`.
- **ACC-03 — Local is unchanged on every platform.** Local token →
  `effective: false`, `writable: true`, `lockedCopy: null` (SPEC-30 preserved).
- **ACC-04 — Divergence flag is exact.** `deviceDiffers` is `true` only for
  Cloud + `web` + `profileAutoBackup === false`; `false` in every other
  combination, including web with `true`/`undefined` and all Local/native cases.
- **ACC-05 — Copy states the hard rule and never lies.** The locked copy MUST
  contain "always" and MUST NOT contain "off"; the device note MUST mention the
  mobile device, MUST NOT claim sync is off on web, and MUST NOT contain "was
  changed"/"was turned on" phrasing that would imply a write.
- **ACC-06 — Source scan.** `settings.tsx` passes `!autoBackupWritable` into the
  switch's `disabled`, calls the resolver instead of `resolveModeState`, guards
  `handleToggleAutoBackup` on writability, contains **no**
  `updateProfile({ autoBackup: false })` on a web branch, gates both manual
  Backup/Restore buttons on `!isApiOnlyPlane`, and `resolveModeState` is
  unchanged (SPEC-36 preserved).

### 3.3 Platform matrix — Subjective (human-judged, observable reviewer checks)

| # | Android (Expo Go) | iOS (Expo Go) | Web (`expo export --platform web`) |
|---|---|---|---|
| ACC-07 | n/a | n/a | pass |
| ACC-08 | pass | pass | n/a |
| ACC-09 | pass | pass | pass |
| ACC-10 | pass | n/a | n/a |

- **ACC-07 — Web is honest (the reported case).** Reviewer on the web build with
  an account whose phone has auto-backup OFF opens Settings and confirms: the
  Auto-Backup switch reads **on** and is visibly disabled; the hard-rule copy is
  shown; the divergence note is shown; the profile subtitle reads "Cloud Sync
  Enabled"; the `SyncStatusCard` shows live state and **not** "Sync off"; neither
  "Backup Data to Cloud API Now" nor "Restore Data from Cloud API" appears; and
  — with the developer network panel open — **zero** `PUT userProfiles` requests
  are made on login, on navigating to Settings, or on toggling attempts.
- **ACC-08 — Mobile is untouched.** Reviewer on each native platform with a Cloud
  account confirms the toggle still flips, the OFF state still shows "Cloud
  account — sync off" plus the two manual Backup/Restore buttons, the ON→OFF
  flow still shows its "Couldn't Reach Server" failure copy when offline, and —
  after a prior web session with the account in this state — the phone is
  unaffected and still reports sync off.
- **ACC-09 — Web with the flag already on.** Reviewer on each platform confirms
  the switch is on and disabled and the hard-rule copy is shown, and that **no**
  divergence note appears when the profile value is `true`.
- **ACC-10 — Local still promotes.** Reviewer on Android with a Local account
  confirms the switch is off and still tappable, tapping ON still routes to the
  SPEC-30 re-registration flow, and Settings still makes zero network calls.

## 4. Deliverables

- **D-01 — `utils/modeState.ts`:** add copy constants `WEB_AUTOBACKUP_ALWAYS_ON`
  and `WEB_AUTOBACKUP_DEVICE_NOTE`, an `AutoBackupControl` interface
  (`effective`, `writable`, `deviceDiffers`, `lockedCopy`), and the pure
  `resolveAutoBackupControl({ token, profileName, profileAutoBackup, platformOs })`
  per §1.7/§3.1. `resolveModeState`, `resolveDataPlane` and `resolveToggleRoute`
  MUST remain byte-identical (`CON-09`).
- **D-02 — `app/(tabs)/settings.tsx` (display + gating only):** replace the
  `resolveModeState` destructure at `:203-207` with
  `resolveAutoBackupControl` (and swap the import); make the switch at `:1307`
  read `value={autoBackup}` with `disabled={isSyncing || !autoBackupWritable}`;
  render `lockedCopy` when `!autoBackupWritable` and the device note when
  `deviceDiffers`; early-return from `handleToggleAutoBackup` when
  `!autoBackupWritable`; change the web branch of `disableAutoBackupWithSeed`
  at `:415-419` to a bare `return` with **no** `updateProfile` call
  (`CON-01`); and add `&& !isApiOnlyPlane` to the manual Backup/Restore
  conditions at `:1312`/`:1318` (`CON-10`). No other file changes.
- **D-03 — `utils/modeState.test.ts`:** extend with ACC-01..06 ×
  `android`/`ios`/`web` using the file's existing `describe.each([...])` +
  `jest.mock("react-native")` `Platform.OS` pattern, including the ACC-06 source
  scan.
- **D-04 — Docs.** `docs/savepoint.md` implementation entry recording that the
  flag is **inert on web** (§1.2), that the risk was false assurance rather than
  data loss, and the §1.5/§1.6 deferred divergences; `AGENTS.md §3` append entry;
  this file's Status → FINAL with the approval date.
- **D-05 — User-run verification** (§1.3 — the agent does not run these):
  `npx tsc --noEmit`, `npx tsc -p tsconfig.test.json --noEmit`, `npm test`,
  `npx eslint .`, then Expo Go Android + iOS (ACC-08/09/10) and
  `expo export --platform web` (ACC-07/09).

## Glossary

| Term | Meaning |
|---|---|
| Mobile intent | What `autoBackup` means where it is consulted: a per-device control |
| Hard rule | On web, auto-backup is unconditionally on — not a toggle |
| Device divergence | Web Cloud account whose `profiles.autoBackup` is `false` (set on a phone) |
| Locked copy | The always-on explanation shown beside a disabled web switch |
| api-only plane | Direct API reads/writes, no AsyncStorage entity persistence (SPEC-34) |
| local-persist plane | Mobile Local + mobile OFF; repos + paused queue (SPEC-34) |

## References

- `AGENTS.md §1` — spec-first, no-CLI, invariants, docs; §1.4 no breaking
  changes; §1.9 spec format; §1.10 platform matrix + TDD.
- `specs/34-api-only-online-mode.md` — CON-01/CON-02 (api-only vs local-persist
  router), CON-06 (ON→OFF verified-snapshot seed), CON-08 (api-only card copy).
- `specs/30-local-creation-gate-and-reregistration-promotion.md` — D-03/CON-05
  (Local switch routes to re-registration) preserved by `CON-06`.
- `specs/36-mode-truth-token-only.md` — D-01 (`resolveModeState` is token-only;
  preserved by `CON-09`).
- `specs/27-two-device-single-transaction-log.md` — "autoBackup per-device never
  synced" intent vs. current implementation (§1.5, not fixed here).
- `utils/modeState.ts:20-24,26-32`; `utils/apiOnly.ts:15-23,28-35,39-59`;
  `context/TransactionsContext.tsx:202-238`;
  `context/CategoriesContext.tsx:47-50,104-107,133-134,147-150,168-169`;
  `context/UserProfileContext.tsx:126-149`;
  `app/(tabs)/settings.tsx:63,98,203-207,303-308,394-410,415-419,766,1223,1300,1307,1312,1318`;
  `supabase/schema.sql:59`; `utils/modeState.test.ts:8-27`;
  `jest.config.js` (`roots: utils`).
