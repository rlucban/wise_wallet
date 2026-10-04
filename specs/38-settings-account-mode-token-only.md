# SPEC-38 — Settings account mode from token only

| Field     | Value                                                        |
|-----------|--------------------------------------------------------------|
| ID        | SPEC-38                                                      |
| Title     | Settings account mode from token only                        |
| Status    | FINAL (marked by user 2026-10-04; implementable per AGENTS §1.1) |
| Owner     | TBD (user)                                                   |
| Version   | v0.1                                                         |
| Scope     | `app/(tabs)/settings.tsx` local/cloud display: mode signal, copy, switch, Backup/Restore, Make Online |
| Non-goals | Token issuance, login/register, backend, sync queue, update/delete pre-writes, global error copy |

## Terminology

RFC 2119 keywords: MUST, MUST NOT, SHOULD, MAY. "Local" = session holds
`offline_token`/`local_token` (`utils/authMode.ts`). "Cloud" = JWT session.
"Cloud-OFF" = JWT session with `autoBackup` false (stays Cloud per SPEC-04).

## Context

Settings infers account mode from `profile.name` (`isUsernameOnly`,
`settings.tsx:192`) OR-ed with the token (`isEffectivelyLocal`, `:194`).
Onboarding overwrites `profile.name` with the display name, so every
post-onboarding cloud account displays "Local-only account — stored on this
device" / SyncStatusCard "Local-only", with Auto-Backup OFF + disabled and
Backup/Restore unreachable. The token already identifies every true local
(`register.tsx:58`, `login.tsx:106/:117`), including legacy username-era
accounts — the name check is pure redundancy that misfires.

## Constraints

- **CON-01:** Account-mode display MUST derive from `useIsLocalAccount()`
  only. `profile.name` MUST NOT feed any local/cloud branch.
- **CON-02:** `isUsernameOnly`/`isEffectivelyLocal` MUST be deleted; the six
  surfaces (subtitle, card, SyncStatusCard prop, switch, Backup/Restore,
  Make Online) rewire to the token signal with unchanged cloud-branch semantics.
- **CON-03:** Backup/Restore buttons MUST NOT render on `Platform.OS === "web"`
  (their handlers read local repos — SPEC-36 ACC-W-03).
- **CON-04 — Governance:** this spec amends SPEC-26 CON-11 for settings
  account-mode copy only. SPEC-26 keeps register/login; SPEC-04 :107-113 is
  unchanged and satisfied by CON-01.
- **CON-05:** No backend/storage/API/route/dependency change; Expo-Go-safe;
  `expo export --platform web` clean.
- **CON-06:** Legacy username-era locals MUST still display local (their
  token is local — no migration, no exception).

## Goal

### Interaction matrix

| Platform | Cloud (JWT) | Cloud-OFF (JWT) | Local (local token) |
|----------|-------------|-----------------|---------------------|
| Android/iOS | cloud copy, switch on | "Cloud account — sync off" + working Backup/Restore | local copy + Make Online |
| Web | cloud copy (never local) | cloud copy, buttons hidden | n/a post-DEC-W2; local copy if ever rendered |

### Decisions

- **DEC-01:** Token-only mode, all platforms (plan Option A).
- **DEC-02:** Buttons hidden — not rewired — on web (challenge answer A).
- **DEC-03:** Make Online stays for true locals on every platform.

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-01 | ✅ | ✅ | ✅ | jest source guard: zero `isUsernameOnly`/`isEffectivelyLocal` in `settings.tsx` |
| ACC-02 | ✅ | ✅ | ✅ | jest source guard: subtitle + SyncStatusCard branch on token `isLocal` |
| ACC-03 | ✅ | ✅ | ✅ | jest source guard: switch `disabled` ⟺ `isLocal` |
| ACC-04 | — | — | ✅ | jest source guard: Backup/Restore gated behind `Platform.OS !== "web"` |

Subjective (reviewer-observed):

- **ACC-S01:** Web cloud user → cloud copy, no "Local-only" anywhere.
- **ACC-S02:** Legacy username-era local login → local copy unchanged.
- **ACC-S03:** Native Cloud-OFF → "sync off" + manual Backup/Restore work.
- **ACC-S04:** No red-box (Expo Go) and `expo export --platform web` clean.

## Deliverables

- **D-00:** This spec marked FINAL by the user.
- **D-01:** `app/(tabs)/settings.tsx` rewiring.
- **D-02:** `utils/` jest guards covering ACC-01..04.
- **D-03:** User-run matrix ACC-S01..S04.
- **D-04:** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## Glossary

- **isEffectivelyLocal:** deleted heuristic (`isLocal || isUsernameOnly`).
- **Username-era local:** pre-existing local account with non-email
  `profile.name`; holds a local token.

## References

- `specs/04-connection-status-vs-offline-mode.md` (:107-113, token-copy mandate)
- `specs/26-email-only-registration.md` (CON-11/DEC-04/ACC-20, amended here)
- `specs/36-web-platform-invariants.md` (ACC-W-03, DEC-W2)
- `app/(tabs)/settings.tsx:25-101,191-194,1052-1091,1132-1178`
- `utils/authMode.ts`, `app/register.tsx:58`, `app/login.tsx:106/117/209`
