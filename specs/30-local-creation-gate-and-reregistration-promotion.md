# Spec 30: Local-Only Creation Gate + Re-registration Promotion

| Field | Value |
|---|---|
| ID | SPEC-30 |
| Title | Local profile created at registration only (offline auto-suggested); autoBackup ON promotes via re-registration |
| Status | **FINAL** (2026-09-29 per user call) |
| Owner | User (final authority) |
| Version | 1.0 — FINAL: v0.2 draft approved as-is; DEC-01 unify-all, DEC-02 same-flow-on-web, DEC-03 guided export, DEC-04 modal dialog; implement exactly this |
| Scope | WHERE a Local-only profile may be created + WHAT happens when its autoBackup is turned ON (all platforms) |
| Non-goals | Sync engine changes (SPEC-27/29 stand); delete flow (SPEC-28 stands); server changes; data migration tooling beyond existing JSON export |
| Normative source | This file, once marked FINAL. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently", "observed") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Rules (user call 2026-09-29)

1. A Local (offline) profile can be created **only during registration** —
   and there it is **auto-suggested when there is no wifi/internet
   (suggested only, never forced)**.
2. When a Local account's auto-backup is turned **ON (true), it becomes an
   online account and REQUIRES re-registration** (a fresh cloud account — not
   an in-place merge upgrade).

### 1.2 Current behavior (non-normative, observed)

- `app/register.tsx`: Online/Offline selector defaults to **Online** with zero
  connectivity awareness (no `navigator.onLine`, no `NetworkContext`); mobile
  username-fallback can silently create a Local account (SPEC-27 CON-03 wants
  explicit confirmation); web forces Online (SPEC-04 CON-08).
- `app/login.tsx`: "Account Not Found" / unreachable paths offer **"Create
  Offline Account"** on native (SPEC-04 D-06) — a SECOND Local creation point
  outside registration.
- SPEC-04 D-07 "Make Online": Settings button / Local switch-ON / `LINK NOW` /
  `useCloudLink` dialog all route to PIN → cloud register/login → conflict
  Merge/Keep-Local/Keep-Cloud → same identity promoted to Cloud. Rule 2 above
  REPLACES this with re-registration (new cloud identity, no merge).

### 1.3 Conflicts with FINAL SPEC-04 (resolved by §2 supersede list)

Once FINAL, this spec SUPERSEDES: SPEC-04 D-06 mobile part (login-time Create
Offline Account — removed), D-07 (merge upgrade — replaced by re-registration),
D-09 mobile-unchanged note (login creation guard now applies on ALL platforms),
CON-03 irreversibility wording (no longer "upgrade", it is a NEW account; the
old Local stays intact), ACC-06 (post-upgrade invariants rewritten as
post-reregistration invariants). SPEC-04 ACC-10 (grandfathered web locals keep
PIN login) is PRESERVED, promotion path per DEC-02.

### 1.4 Definitions

**Creation gate** — the rule that Local profiles originate at registration only.

**Auto-suggest** — preselecting Offline + showing suggestion copy when offline;
the user MAY still choose Online (suggestion, never force).

**Re-registration** — creating a brand-new Cloud account (new server `user.id`
+ JWT) from a Local session; the old Local UUID, its rows, and its data are
left intact and remain accessible via local login. No merge, no migration.

## 2. Constraints (normative once FINAL)

- **CON-01 — Registration-only creation.** On every platform, a NEW Local
  profile MUST be creatable ONLY via `app/register.tsx` (native; web keeps
  refusing per SPEC-04 CON-08). The login-time "Create Offline Account" dialog
  MUST be removed on ALL platforms: login failure (any cause) shows the plain
  failure/offline notice and routes the user to **Register** instead. The
  mobile username-fallback path (`register.tsx:141-172`) stays inside
  registration but MUST surface the explicit confirm dialog (SPEC-27 CON-03).
- **CON-02 — Offline auto-suggest, modal form (DEC-04 resolved 2026-09-29).**
  When Register mounts/focuses while offline (device connectivity, zero API
  pings), it MUST show a modal dialog: "No connection detected — Offline
  suggested…" with [Continue Offline] (preselects Offline, dismisses) and
  [Use Online] (keeps Online; submitting while offline reaches the existing
  "Cloud Unreachable" dialog). Show ONCE per Register visit (not on every
  focus). When online: no dialog, default Online.
- **CON-03 — Promotion = re-registration + guided export (DEC-03 resolved
  2026-09-29).** Toggling autoBackup ON for a Local account MUST start a fresh
  cloud registration (email + PIN, new server `user.id` + JWT) and MUST NOT
  merge, move, or delete the Local data. The flow MUST include a guided
  export step for the old Local data (existing JSON export, offered BEFORE the
  session switches, with Skip allowed) and an import pointer after the new
  session lands. After success the session switches to the new Cloud identity
  with `autoBackup = true`; the old Local UUID + rows MUST remain on device,
  reachable by logging out and back in with the local username + PIN.
- **CON-04 — Entry unification (DEC-01).** Proposed: Settings "Make Online"
  button, Local autoBackup-ON toggle, `CloudLinkBanner` LINK NOW, and the
  `useCloudLink` dialog ALL route to the single re-registration flow (renamed
  copy: "Register Online Account"). No dead-end alerts (`useCloudLink`
  `Alert.alert` invisible on web — must route, not alert).
- **CON-05 — Connectivity + platform guards.** Re-registration REQUIRES
  connectivity: toggling ON while offline shows "Connect to the internet to
  register your Online account." with NO state change. Web: no new Locals
  (unchanged); grandfathered web locals promote via re-registration too
  (DEC-02), else their button is hidden.
- **CON-06 — Copy honesty.** "Make Online"/upgrade/merge vocabulary MUST be
  removed from this flow: the dialog MUST state (a) this creates a NEW Online
  account, (b) the current on-device data stays in the Local profile and does
  NOT move automatically, (c) how to carry data over (export/import). The
  SPEC-04 "permanent, cannot revert" warning is REPLACED (nothing converts —
  two coexisting accounts).
- **CON-07 — Supersede list.** FINAL status of this spec retires: SPEC-04 D-06
  mobile login-creation, D-07 merge upgrade + ACC-06, D-09 "Android/iOS
  unchanged" for login creation, CON-03 irreversibility dialog. `docs/savepoint.md`
  + `AGENTS.md §3` MUST record each retirement. SPEC-04 stays normative for
  everything else.
- **CON-08 — Standing repo invariants (AGENTS.md §1).** MUST keep Android + iOS
  + Web working (`Platform.OS`/`select`; no static native-only imports; Expo Go
  MUST NOT crash); MUST keep web Vercel-deployable; MUST NOT change storage
  keys, the `wallet-api` contract, AsyncStorage shapes, routes, or native deps
  unless this spec requires them.

## 3. Goal

| Scenario | After (FINAL) |
|---|---|
| Register while offline (native) | Offline suggestion modal (once per visit); [Continue Offline] or [Use Online] → Cloud Unreachable path |
| Register while online (native) | Online default, unchanged |
| Register on web, any connectivity | Online only, unchanged; offline web shows connectivity-blocked copy, no Offline path |
| Login failure, unknown user (native) | Plain failure + "Don't have an account? Register" — NO Create Offline Account dialog |
| Local autoBackup toggled ON, online | Honesty dialog → guided export (skippable) → re-registration → new Cloud session; old Local intact |
| Local autoBackup toggled ON, offline | "Connect first" notice, no state change |
| Grandfathered web local promotion | Per DEC-02 (proposed: same re-register flow) |

Open decisions (RESOLVED per user 2026-09-29):

- **DEC-01: RESOLVED → unify all.** Button + toggle + LINK NOW + `useCloudLink`
  dialog all route to re-register ("Register Online Account").
- **DEC-02: RESOLVED → same flow on web.** Grandfathered web locals promote via
  re-register; CON-05 stands.
- **DEC-03: RESOLVED → guided export.** In-flow export step (existing JSON
  export, skippable) before session switch + import pointer after; CON-03 updated.
- **DEC-04: RESOLVED → modal dialog.** Offline Register shows a once-per-visit
  suggestion modal ([Continue Offline] / [Use Online]); CON-02 updated.

### Acceptance criteria

Objective (machine-checkable, `jest` parameterized by `Platform.OS` =
`android`/`ios`/`web` via mock):

- **ACC-01:** register samples device connectivity at mount with zero `fetch`
  calls (mocked `apiClient`/global fetch assertion).
- **ACC-02:** offline preselect = Offline; online default = Online (state unit
  test of the selector logic per platform).
- **ACC-03:** login module contains no "Create Offline Account" offer on ANY
  platform (string-scan test like `themeColors.test.js`).
- **ACC-04:** promotion completes with `activeUserId` CHANGED (new cloud id ≠
  old local UUID) and old `user_{localUuid}_*` keys byte-identical before/after
  (no merge, no move, no delete).
- **ACC-05:** toggle-ON while offline performs zero `fetch` and zero settings
  writes.

Subjective (human-judged, observable reviewer checks):

- **ACC-06:** reviewer on Android (Expo Go, airplane mode) opens Register:
  suggestion modal appears once; [Continue Offline] preselects Offline;
  reopening and choosing [Use Online] then submitting shows Cloud Unreachable
  with a working Offline path; no red-box.
- **ACC-07:** reviewer with a Local account toggles autoBackup ON online:
  dialog states NEW account + data-stays-local; guided export step offers
  JSON download with visible Skip; after register, Dashboard is the fresh Cloud
  account; logging out/in with the old username + PIN restores the old Local
  data untouched.
- **ACC-08:** reviewer on web export attempts login with unknown email: plain
  Login Failed, no offline upsell, no Offline offer, no layout gap.

## 4. Deliverables

- **D-01 — Register suggest (`app/register.tsx`).** Device-connectivity sample
  on mount (zero API pings); offline → once-per-visit suggestion modal
  ([Continue Offline] preselects Offline / [Use Online] keeps Online); web
  unchanged + offline-blocked copy.
- **D-02 — Login creation removal (`app/login.tsx`).** Delete the Create
  Offline Account dialog/branch; failures route to Register; offline notice +
  local lookup for EXISTING accounts untouched.
- **D-03 — Re-register flow (settings entries).** Replace merge-upgrade chain
  with: honesty dialog (CON-06) → guided JSON export step (skippable) →
  email+PIN cloud register → switch session (`autoBackup = true`) → import
  pointer; offline guard per CON-05; all entries unified per DEC-01 (incl.
  `useCloudLink` Alert → settings routing, web-safe).
- **D-04 — Copy sweep.** Remove "Make Online"/merge wording from the flow
  (banner subtitle "Link to cloud…" MAY stay — points at the same flow).
- **D-05 — Tests + manual proof.** `jest` for ACC-01..05 parameterized over
  `android`/`ios`/`web`; user-run Expo Go + web export for ACC-06..08.
- **D-06 — Docs + retirements.** `docs/savepoint.md` + `AGENTS.md §3` record
  implementation AND each SPEC-04 retirement per CON-07.

## Glossary

| Term | Meaning |
|---|---|
| Creation gate | Local profiles originate at registration only |
| Auto-suggest | Offline preselected + explained when offline; always overridable |
| Re-registration | Fresh Cloud account from a Local session; old Local left intact, no merge |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, docs).
- `specs/04-connection-status-vs-offline-mode.md` — D-06/D-07/D-09, CON-03/08,
  ACC-06/10 (items retired by CON-07).
- `specs/27-two-device-single-transaction-log.md` — CON-03 (fallback confirm).
- `app/register.tsx` (selector, fallbacks), `app/login.tsx` (creation dialog,
  offline notice), `app/(tabs)/settings.tsx` (Make Online chain),
  `components/CloudLinkBanner.tsx`, `hooks/useCloudLink.ts` (Alert dead-end).
