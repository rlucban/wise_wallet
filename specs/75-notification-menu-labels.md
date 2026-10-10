# SPEC-75 — Notification Menu Labels

| Field | Value |
|---|---|
| ID | SPEC-75 |
| Title | Notifications menu: drop Manage Dues, relabel to Read/Clear all alerts |
| Status | FINAL (per user call 2026-10-10 — implementable) |
| Owner | User |
| Version | 1.0 FINAL |
| Scope | `app/notifications.tsx` (header `Menu` block only) + one new guard file `utils/notificationMenuLabels.test.ts` |
| Non-goals | No handler, route, dues-screen, dependency, or Platform change; `router` import/`useRouter` stay (used elsewhere); `/dues` route stays reachable by its other entry points |

RFC 2119 terminology (MUST/MUST NOT/SHOULD) applies.

## Context

The Notifications header menu (`app/notifications.tsx:345-376`, `Menu`
anchored on the `dots-vertical` `Appbar.Action`) currently holds three
items: `Mark All System Alerts as Read`, `Clear System Alerts`, and
`Manage Dues` (which pushes `/dues`). User call 2026-10-10: remove the
`Manage Dues` option and relabel the survivors to `Read all alerts` and
`Clear all alerts`. No test and no spec pins these labels today — new
territory, no §1.14 overlap.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay
  Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, or third-party code
  (AGENTS §1.12).
- **CON-03** After the change the header `Menu` MUST contain exactly two
  `Menu.Item`s, in order: `title="Read all alerts"` then
  `title="Clear all alerts"` — exact user-supplied copy (lowercase
  `all`/`alerts`, no title-casing normalization).
- **CON-04** Both `onPress` bodies MUST stay byte-identical apart from
  position: `setMenuVisible(false)` + `markAllAsRead()` for Read,
  `setMenuVisible(false)` + `clearAlerts()` for Clear.
- **CON-05** The `Manage Dues` item (including its `router.push("/dues")`)
  is removed from the `Menu` ONLY. The `useRouter` import, `router` const,
  and the remaining `router.push("/dues")` call sites (`:227`, `:307`) plus
  `safeGoBack(router)` stay untouched — nothing becomes unreferenced.
- **CON-06** Identical on Android, iOS, and Web — no `Platform.OS` branch.
  Any platform branch needs its own amendment first (§1.10).
- **CON-07** No code, config, or dependency change before this spec is marked
  FINAL by the user (AGENTS §1.1, §1.10 CON-10 pattern).

## Goal

The Notifications menu offers exactly two actions with the new short labels;
both do what they did before; the dues shortcut is gone but dues itself is
untouched.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Notifications header | Open menu | Two items: `Read all alerts`, `Clear all alerts`; no `Manage Dues` |
| Menu | Tap `Read all alerts` | All alerts marked read; menu closes (as before) |
| Menu | Tap `Clear all alerts` | Alerts cleared; menu closes (as before) |
| App | Navigate to dues | Unchanged via remaining entry points (`/dues` route intact) |

### Decisions

- **DEC-01** Delete the item, keep the route (user call; the shortcut is
  redundant, dues navigation otherwise unchanged).
- **DEC-02** Labels taken verbatim from the user call (rejected: re-cased or
  "improved" copy).
- **DEC-03** New SPEC-75 file is the canonical home (no existing owner).

### Acceptance

Objective — deterministic, machine-checkable (jest, parameterized by
`Platform.OS` = `android` / `ios` / `web` via mock):

- **ACC-01** Source scan: the header `Menu` block contains exactly two
  `Menu.Item`s with `title="Read all alerts"` then `title="Clear all
  alerts"`; the block contains no `Manage Dues` and neither old label.
  Holds on android/ios/web.
- **ACC-02** Source scan: Read item still calls `markAllAsRead()`, Clear
  item still calls `clearAlerts()`, each alongside
  `setMenuVisible(false)`. Holds on android/ios/web.
- **ACC-03** Source scan: `useRouter` import, `router` const, and the
  non-menu `router.push("/dues")` sites intact; no new import, dep, or
  `Platform.OS` branch. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit
pass/fail observation steps, user-run per AGENTS §1.3 — agent never runs CLIs):

- **ACC-S01** Reviewer on Android/iOS (Expo Go) confirms: menu shows exactly
  the two relabeled items; tapping each performs its action and closes the
  menu; no red-box. FAIL = third item present, old labels, or dead action.
- **ACC-S02** Reviewer on Web confirms ACC-S01 identically, no console
  error. FAIL = any web-only deviation (triggers a CON-06 amendment, not a
  silent branch).

TDD coverage (§1.10): `utils/notificationMenuLabels.test.ts` covers
ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02
are user-run manual checks exactly as written above.

## Deliverables

- **D-01** `app/notifications.tsx` ONLY: header `Menu` block per
  CON-03..CON-05. No other line in the file changes.
- **D-02** `utils/notificationMenuLabels.test.ts` (new file, named here
  per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-03** Docs after implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the
  spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Header menu:** the `Menu` anchored on the Notifications `Appbar.Action`
  — the sole target.
- **Survivors:** the Read and Clear items — relabeled, behavior-identical.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11
  bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `app/notifications.tsx:345-376` (menu block), `:227/:307/:340` (remaining
  `router` uses — deliberately kept)
