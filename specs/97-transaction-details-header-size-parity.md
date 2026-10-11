# SPEC-97 — Transaction Details Header Title Size Parity

| Field | Value |
|---|---|
| ID | SPEC-97 |
| Title | Render the Transaction Details header title with the same size as every other screen header |
| Status | **FINAL v1.0** (marked FINAL by user 2026-10-11 — implementable) |
| Owner | User (final authority) |
| Version | 1.0 FINAL |
| Scope | `app/transaction-details.tsx` header title ONLY + one new guard file `utils/transactionDetailsHeaderSize.test.ts` |
| Non-goals | No copy change; no layout/style change (header row, buttons, hero card, rows all intact); no other screen touched; no new deps |

RFC 2119 terminology (MUST/MUST NOT/SHOULD/MAY) applies. Informative prose ("today", "currently") is non-normative unless restated as a requirement.

## Context

User call 2026-10-11 with web screenshot (`/transaction-details?id=…`): the "Transaction Details" header title renders visibly smaller than the header titles on all other screens — *"maliit masyado yung text, dapat same lang din sa lahat ng header"*.

Root cause (source-traced): every other screen in `app/` passes a plain string to Paper's `Appbar.Content` (`title="…"`, 15 sites — dues, savings, calendar, help, edit-transaction, add-screens, etc.), so Paper renders its default header title style. `transaction-details.tsx:105-114` is the ONLY site passing a custom `<Text>` element as `title`, styled with just `fontWeight: "700"` and `color` — no `fontSize` — so it renders at body-text size instead of the shared header size.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, images, or third-party code (AGENTS §1.12). The fix deletes code; it adds nothing.
- **CON-03** Bare-minimum diff (AGENTS §1.11). ONLY the `Appbar.Content` title prop (`transaction-details.tsx:105-114`): custom `<Text>` element → plain string `title="Transaction Details"`. Header row style, back action, edit/delete buttons, hero card, detail rows, and all logic stay byte-identical.
- **CON-04** Identical on Android, iOS, and Web — no new `Platform.OS` branch. Any platform branch needs its own amendment first (§1.10).
- **CON-05** No code, config, or dependency change before this spec is marked FINAL by the user (AGENTS §1.1).

## Goal

"Transaction Details" header title renders at exactly the same size as every other screen header; everything else pixel-identical.

### Interaction matrix

| Surface | Today | After (FINAL) |
|---|---|---|
| Details header title size | Body-size (custom Text, no fontSize) | Shared Paper header size (plain string title) |
| Title copy/weight/color | "Transaction Details", bold, onSurface | Visually identical (Paper default) |
| Header buttons/layout, body | As today | Byte-identical |
| All other screens | As today | Byte-identical |

### Decisions (FINAL — user marked final 2026-10-11 with DEC-01(a); DRAFT text adopted as-is, ACC-02 re-scoped pre-implementation)

- **DEC-01 (FINAL)** Plain-string title `title="Transaction Details"` like all 15 other headers — Paper renders its default header size, zero magic numbers, zero drift risk (rejected: keeping the custom `<Text>` + explicit `fontSize` — duplicates a size constant that drifts when Paper changes; rejected: touching the shared theme — blast radius across all screens).
- **DEC-02 (FINAL)** The `Text` import stays (still used across the body — verified pre-implementation; no import change shipped).

### Acceptance

Platform matrix (§1.10): every Objective guard holds on `android` / `ios` / `web` (jest `Platform.OS` mock); every Subjective check is user-run on Expo Go (Android/iOS) + `expo export --platform web` (agent never runs CLIs per AGENTS §1.3).

Objective — deterministic, machine-checkable (jest source-scan guards):

- **ACC-01** The details header holds `<Appbar.Content title="Transaction Details"` (plain string) and no custom `fontWeight`-only title element remains in the header block. Holds on android/ios/web.
- **ACC-02** Back action (`safeGoBack`), edit/delete buttons, header row style, and all body/logic lines byte-identical (no `fontSize` literal in the header block; the stylesheet's two pre-existing values are out of scope, untouched). Holds on android/ios/web.
- **ACC-03** Scope: no other file under `app/` touched; the other 15 plain-string headers byte-identical. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit pass/fail, user-run):

- **ACC-S01** Reviewer on Web (`expo export --platform web`, `/transaction-details?id=…`) confirms: header title size matches sibling headers (e.g. Scheduled, Allocations, Transaction History) side by side. FAIL = visibly smaller/larger title.
- **ACC-S02** Reviewer on Android + iOS (Expo Go) confirms ACC-S01 identically with no console error. FAIL = any platform-only deviation.

TDD coverage (§1.10): `utils/transactionDetailsHeaderSize.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02 are user-run manual checks exactly as written (pixel size is not jest-renderable — guards pin the contract).

## Deliverables

- **D-01** `app/transaction-details.tsx` ONLY: header title per CON-03 (DEC-01a). No other line changes except import hygiene per DEC-02 if the `Text` import becomes unused.
- **D-02** `utils/transactionDetailsHeaderSize.test.ts` (new file, named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-03** Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Shared header size:** the title size Paper's `Appbar.Content` renders for a plain-string `title` — identical on all 15 other screens by construction.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `app/transaction-details.tsx:93-152` (header block — title at `:105-114`)
