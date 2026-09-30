# Spec 36: Mode Truth Is Token-Only (Username Shape Decoupled from Mode and autoBackup)

| Field | Value |
|---|---|
| ID | SPEC-36 |
| Title | Mode truth is token-only; username shape MUST NOT infer mode or override autoBackup |
| Status | **FINAL** (2026-09-30 per user call) |
| Owner | User (final authority) |
| Version | 1.0 — FINAL: v0.1 draft approved as-is; implement exactly this |
| Scope | Settings derived mode state (`app/(tabs)/settings.tsx` `isUsernameOnly` / `isEffectivelyLocal` / forced `autoBackup=false`, `SyncStatusCard` prop, toggle routing, plane gates) on all platforms |
| Non-goals | Registration paths (audited compliant, locked unchanged); auth/session flows (SPEC-31 stands); sync engine (SPEC-27/29 stand); server changes; storage migrations |
| Normative source | This file, once marked FINAL. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently", "observed") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Symptom (reported 2026-09-30, non-normative)

After registering (web), Settings shows the account as **Local** ("Local-only
account — stored on this device") although the session holds a Cloud JWT and
should always be ONLINE on web. The user further notes, correctly per specs,
that Local-vs-Online (account mode) is a different axis from autoBackup (sync
toggle) — yet the UI behaves as if they were one.

### 1.2 Registration path audit (read-only, non-normative — all compliant, locked by CON-07)

- Web `effectiveMode` is forced `"online"` (`app/register.tsx:24`); the
  Offline selector is hidden on web (`register.tsx:323-347`).
- `createLocalAccount` early-outs on web with "Not Available on Web"
  (`register.tsx:65-68`) — no `offline_token` can be minted from web register.
- Web enforces email shape (`register.tsx:164-167`); web Cloud-unreachable
  shows retry-only with no Offline offer (`register.tsx:122-129`).
- Native online+username tries cloud POST first and creates a Local account
  ONLY behind the explicit "Create Local-Only Account?" confirm
  (`register.tsx:168-218`) per SPEC-30 CON-01 / SPEC-27 CON-03 — never silent.
- Native offline mode → `createLocalAccount` → `offline_token`
  (`register.tsx:233-237`) — registration-only creation per SPEC-30 CON-01.
- Login on web can never mint a local token either (`app/login.tsx:89-108`
  early-out via `isLocalAuthAllowed`; `:231` hard-fails 401s on web;
  `:270-275` unreachable → connect notice, no session) per SPEC-31 CON-01.

Conclusion: **no registration/login path mints a Local session where it
should not.** The token is correct; the display and derived state built on top
of it are not.

### 1.3 Root cause (read-only, non-normative)

`app/(tabs)/settings.tsx:258-261`:

```ts
const isUsernameOnly = profile?.name && !isValidEmail(profile.name);
const autoBackup = isUsernameOnly || isLocal ? false : profile?.autoBackup ?? true;
const isEffectivelyLocal = isLocal || !!isUsernameOnly;
```

Any Cloud-JWT session whose `profile.name` is not email-shaped (native
online+username Cloud registration via the confirm path at
`register.tsx:180-192`, which POSTs the username to `/auth/register`; any
second-device profile-convergence state per SPEC-33) is treated as Local:

1. Subtitle `isEffectivelyLocal ? "Local-only account — …"` (`settings.tsx:1222`)
   — the reported "registers as local" symptom.
2. `SyncStatusCard isLocal={isEffectivelyLocal}` (`settings.tsx:1299`) —
   "Local-only" status and `apiOnly=false` (`settings.tsx:62`), forcing a
   Cloud+ON account onto the local-persist plane against SPEC-34 CON-01.
3. `handleToggleAutoBackup` branches on `isEffectivelyLocal`
   (`settings.tsx:392-400`) — a Cloud user toggling ON is routed to the
   SPEC-30 **re-registration** flow (new identity) instead of the Cloud
   PIN-verify flow.
4. `isApiOnlyPlane` uses `!isEffectivelyLocal` (`settings.tsx:764-765`) —
   export follows the wrong plane (SPEC-34 CON-07).
5. Manual backup/restore buttons gated on `!isEffectivelyLocal`
   (`settings.tsx:1311,1317`) — hidden from Cloud users they belong to.

This is the exact conflation the user flagged: name shape overrides both the
mode display AND the sync toggle.

### 1.4 Relation to FINAL specs (no retirements; one diagnosed-but-unspecified gap closed)

- SPEC-04 CON-01 already requires mode truth = `isLocalAccount()` (token ∈
  `{"offline_token","local_token"}`), MUST NOT use `autoBackup == false` as a
  mode test, and routes "all gating (writers, banners, settings copy)" through
  it. The `isUsernameOnly` derivation violates it.
- SPEC-04 CON-04 (copy rule) and SPEC-34 CON-01 (mode matrix) are violated at
  the sites listed in §1.3. Both stand fully; this spec adds the missing
  enforcement, it does not amend them.
- SPEC-31 §1.2 diagnosed this exact code as root cause #2 of the web-shows-Local
  incident but gave it no CON/D/ACC (its CONs cover the token gate, logout
  hygiene, and PIN unification). This spec closes that gap. No SPEC-31
  statement is retired.
- SPEC-30 (creation gate, re-registration) and SPEC-31 (never-local, hygiene,
  PIN unification) stand fully.

### 1.5 Definitions

**Mode truth** — the token test `isLocalAccountToken(token)`
(`utils/authMode.ts:5`), via `useIsLocalAccount()` (`utils/authMode.ts:9`).
The SOLE signal for Cloud-vs-Local.

**Name shape** — whether `profile.name` matches the email regex. Display data
only; MUST NOT feed mode, plane, toggle-routing, or `autoBackup` derivation.

**Username Cloud account** — a Cloud-JWT session whose profile name is not
email-shaped (e.g. native online+username registration). First-class Cloud:
Cloud display, Cloud plane, Cloud toggle flow.

## 2. Constraints (normative once FINAL)

- **CON-01 — Token-only mode truth.** `isLocal` (`useIsLocalAccount()`,
  `settings.tsx:201`) MUST be the SOLE mode signal for every Settings
  derivation: profile subtitle, `SyncStatusCard` `isLocal` prop, toggle
  routing, `apiOnly`/`isApiOnlyPlane` computation, export-plane choice, and
  manual backup/restore gates. `isUsernameOnly` and `isEffectivelyLocal` MUST
  be deleted as mode signals; no email-regex test on `profile.name` may feed
  any of them.
- **CON-02 — autoBackup truth is the profile flag.** For Cloud sessions
  `autoBackup` MUST derive as `profile?.autoBackup ?? true`, independent of
  name shape. The `isUsernameOnly ||` override (`settings.tsx:260`) MUST be
  removed. The `isLocal ? false` arm (Local display default) MAY stay — it is
  token-based and consistent with SPEC-04/SPEC-30 Local behavior.
- **CON-03 — Display copy per SPEC-04 CON-04, token-gated.** Subtitle
  (`settings.tsx:1222`), `SyncStatusCard` status (`settings.tsx:90-102`),
  and the Local-only / Sync-off cards (`settings.tsx:1229,1242`) MUST branch
  on token `isLocal` only. A username Cloud account MUST read "Cloud Sync
  Enabled" / "Cloud account — sync off" and MUST NEVER read "Local-only".
- **CON-04 — Toggle routing per token.** `handleToggleAutoBackup`
  (`settings.tsx:392-408`) MUST branch on `isLocal` only: Local ON →
  `startReregisterFlow()` (SPEC-30, unchanged); Cloud ON → PIN-verify dialog;
  Cloud OFF → `disableAutoBackupWithSeed()` (SPEC-34 CON-06, unchanged). A
  username Cloud account toggling ON MUST reach PIN verify, MUST NEVER reach
  re-registration (no duplicate-identity risk).
- **CON-05 — Plane follows token.** `SyncStatusCard` `apiOnly`
  (`settings.tsx:62`) and `isApiOnlyPlane` (`settings.tsx:764-765`) MUST use
  `!isLocal`. Cloud + username name + ON MUST be API-only (SPEC-34 CON-01);
  export/import follow per SPEC-34 CON-07.
- **CON-06 — Buttons follow token.** Manual "Backup Data to Cloud API Now" /
  "Restore Data from Cloud API" gates (`settings.tsx:1311,1317`) MUST use
  `!isLocal` (i.e. `!autoBackup && !isLocal`).
- **CON-07 — Registration/login lock.** The audited paths in §1.2
  (`register.tsx:24,65-68,122-129,164-167,168-218,233-237`;
  `login.tsx:89-108,231,270-275`) MUST NOT change under this spec. This spec
  fixes derived display state only: zero storage-shape change, zero
  `wallet-api` change, zero auth-flow change.
- **CON-08 — Standing repo invariants (AGENTS.md §1).** MUST keep Android + iOS
  + Web working (`Platform.OS` branches; no static native-only imports; Expo Go
  MUST NOT crash); MUST keep web Vercel-deployable; MUST NOT change storage
  keys, the `wallet-api` contract, AsyncStorage shapes, routes, or native deps.

## 3. Goal

| Platform | Token | profile.name | profile.autoBackup | Subtitle | Plane | Toggle ON routes to |
|---|---|---|---|---|---|---|
| android/ios/web | JWT | email | true | Cloud Sync Enabled | API-only | PIN verify |
| android/ios/web | JWT | email | false | Cloud account — sync off | local-persist (mobile) / memory-refresh (web) | PIN verify |
| android/ios/web | JWT | username | true | Cloud Sync Enabled | API-only | PIN verify |
| android/ios/web | JWT | username | false | Cloud account — sync off | local-persist (mobile) / memory-refresh (web) | PIN verify |
| android/ios | local_token/offline_token | username | (forced false) | Local-only account — stored on this device | local-persist, zero API | Re-register flow |
| web | — | — | — | No Local state reachable (SPEC-31 CON-01 stands) | — | — |

Open decisions (RESOLVED per user 2026-09-30):

- **DEC-01: token-only truth.** `isLocalAccountToken` is necessary and
  sufficient for mode; name shape is display data, never a signal.
- **DEC-02: username Cloud accounts are first-class Cloud** in display, plane,
  toggle, export, and manual backup/restore.
- **DEC-03: no migration.** All affected state is derived at render; the fix
  deletes derivations. Zero stored-data change, zero rollback beyond revert.

### Acceptance criteria

Objective (machine-checkable, `jest` parameterized by `Platform.OS` =
`android`/`ios`/`web` via mock):

- **ACC-01:** mode-derivation unit (pure helper or component predicates)
  returns Cloud display + Cloud plane for JWT × {email, username, empty,
  missing} names on all three platforms.
- **ACC-02:** JWT + username name + flag true → `apiOnly`/`isApiOnlyPlane`
  true and toggle-ON predicate selects PIN-verify, never re-register, on all
  three platforms.
- **ACC-03:** `settings.tsx` + `SyncStatusCard` contain no name-shape mode
  test (string-scan for `isUsernameOnly`/`isEffectivelyLocal`/email-regex
  feeding mode, like SPEC-30 ACC-03).
- **ACC-04:** local token forces Local display + re-register route for
  username names on all three platforms (no over-correction).
- **ACC-05:** `autoBackup` derivation ignores name shape: Cloud + stored flag
  true → true with a username name; Cloud + stored false → false; Local →
  false (token arm).

Subjective (human-judged, observable reviewer checks):

- **ACC-06:** reviewer on Android (Expo Go) registers Online + username via
  the confirm path → Settings reads Cloud (never "Local-only"); Auto-Backup
  ON → PIN verify (never "Register Online Account"); no red-box.
- **ACC-07:** reviewer on web export (Cloud session) sees no "Local-only"
  copy anywhere in Settings, Switch reflects the stored flag, no layout gap,
  no red-box.
- **ACC-08:** reviewer with a genuine Local account (native) still sees
  "Local-only account — stored on this device" + re-register flow intact.

## 4. Deliverables

- **D-01 — Derived-state fix (`app/(tabs)/settings.tsx:258-261`).** Delete
  `isUsernameOnly`/`isEffectivelyLocal`; `autoBackup = isLocal ? false :
  profile?.autoBackup ?? true`; all call sites in §1.3 items 1–5 branch on
  token `isLocal` (subtitle `:1222`, toggle `:392-400`, plane `:62,:764-765`,
  buttons `:1311,:1317`, card prop `:1299`).
- **D-02 — Tests.** `jest` for ACC-01..05 parameterized over
  `android`/`ios`/`web`; user-run Expo Go + web export for ACC-06..08.
- **D-03 — Docs + non-retirements.** `docs/savepoint.md` + `AGENTS.md §3`
  record implementation; record explicitly that SPEC-04/30/31/34 stand
  unretired and SPEC-31 root-cause-#2 is now enforced.

## Glossary

| Term | Meaning |
|---|---|
| Mode truth | Token test only (`offline_token`/`local_token` ⇒ Local, else Cloud) |
| Name shape | Email-vs-username form of `profile.name`; display data, never a mode signal |
| Username Cloud account | Cloud-JWT session with a non-email profile name; first-class Cloud |
| Effectively-local (retired) | Removed `isLocal \|\| isUsernameOnly` derivation that caused this gap |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, docs).
- `specs/04-connection-status-vs-offline-mode.md` — CON-01 (token-only gating),
  CON-04 (copy rule); enforced, not amended.
- `specs/31-web-never-local-and-logout-hygiene.md` — §1.2 root cause #2
  (diagnosed, never specified); CON-01 (web never local); enforced, not retired.
- `specs/30-local-creation-gate-and-reregistration-promotion.md` — creation
  gate + re-registration (stands; CON-04 entry routing preserved for true Local).
- `specs/34-api-only-online-mode.md` — CON-01 (mode matrix), CON-07
  (export follows mode); enforced for username Cloud accounts.
- `app/(tabs)/settings.tsx` (`:58-62`, `:258-261`, `:392-408`, `:764-765`,
  `:1222`, `:1229`, `:1242`, `:1299-1321`), `app/register.tsx`
  (`:24`, `:65-68`, `:168-218`), `utils/authMode.ts:5-12`.
