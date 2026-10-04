# SPEC-39 — Web Auto-Backup Switch Disabled

| Field     | Value                                                        |
|-----------|--------------------------------------------------------------|
| ID        | SPEC-39                                                      |
| Title     | Web Auto-Backup Switch Disabled                              |
| Status    | FINAL (marked by user 2026-10-04; implementable per AGENTS §1.1) |
| Owner     | TBD (user)                                                   |
| Version   | v0.1                                                         |
| Scope     | `app/(tabs)/settings.tsx` Auto-Backup switch `disabled` prop on web |
| Non-goals | Native Cloud-OFF, SPEC-04 D-04/D-05, token source, backend, sync queue |

## Terminology

RFC 2119 keywords: MUST, MUST NOT, SHOULD, MAY. "Web" = `Platform.OS === "web"`.
"Cloud-OFF" = JWT session with `autoBackup` false (native-only concept).

## Context

On web, `autoBackup` guards nothing — every write is API-direct (SPEC-36 CON-W-03).
The switch at `settings.tsx:1136` is currently `disabled={isLocal}`, so web users
can toggle a flag that changes nothing. This is a honesty fix: the switch implies
control that doesn't exist on web.

## Constraints

- **CON-01:** The Auto-Backup switch MUST be disabled when `Platform.OS === "web"`.
- **CON-02:** Native behavior MUST NOT change — `disabled={isLocal}` stays for
  Android/iOS.
- **CON-03:** No backend/storage/API/route/dependency change; Expo-Go-safe;
  `expo export --platform web` clean.
- **CON-04:** SPEC-04 D-04/D-05 (Cloud-OFF "Sync off" copy) MUST NOT be disturbed.

## Goal

### Interaction matrix

| Platform | isLocal | Switch state | Behavior |
|----------|---------|--------------|----------|
| Android/iOS | true | disabled | unchanged |
| Android/iOS | false | enabled | unchanged (Cloud-OFF toggle) |
| Web | false | **disabled** | new — flag meaningless on web |
| Web | true | disabled | unchanged (true local) |

### Decisions

- **DEC-01:** One-line `disabled` prop extension — `disabled={isLocal || Platform.OS === "web"}`.
- **DEC-02:** No visual change beyond the disabled state — no removal, no restructure.

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-01 | ✅ | ✅ | ✅ | jest source guard: `disabled={isLocal \|\| Platform.OS === "web"}` in `settings.tsx` |
| ACC-02 | ✅ | ✅ | ✅ | jest source guard: native `disabled={isLocal}` unchanged (no web guard on native path) |

Subjective (reviewer-observed):

- **ACC-S01:** Web user sees switch disabled (greyed out).
- **ACC-S02:** Native Cloud-OFF user can still toggle the switch.
- **ACC-S03:** No red-box (Expo Go) and `expo export --platform web` clean.

## Deliverables

- **D-00:** This spec marked FINAL by the user.
- **D-01:** `app/(tabs)/settings.tsx:1136` — one-line `disabled` prop extension.
- **D-02:** `utils/settingsAccountMode.test.ts` — extend with web-disable guard.
- **D-03:** User-run matrix ACC-S01..S03.
- **D-04:** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## Glossary

- **Cloud-OFF:** JWT session with `autoBackup` false — native-only sync-off state.
- **API-direct:** SPEC-36 web model — every write goes to the API regardless of flags.

## References

- `specs/36-web-platform-invariants.md` (CON-W-03, API-direct)
- `specs/04-connection-status-vs-offline-mode.md` (D-04/D-05, Cloud-OFF)
- `app/(tabs)/settings.tsx:1136` (switch), `:191` (autoBackup derivation)
- `utils/settingsAccountMode.test.ts` (existing test file to extend)
