# SPEC-80 — Payment Source Rename + Fetch-Then-Open Pay Sheet

| Field | Value |
|---|---|
| ID | SPEC-80 |
| Title | Rename Payment Method → Payment Source (copy only) + resolve methods before opening pay |
| Status | FINAL v1.2 (v1.0 + v1.1 + v1.2 per user calls 2026-10-10 — implementable) |
| Owner | User |
| Version | 1.2 FINAL |
| Scope | Copy edits in `edit-transaction.tsx`, `payment-methods.tsx`, `transaction-details.tsx`, `(tabs)/learning-detail.tsx`, `components/PaymentMethodChart.tsx` + `openPayDialog` reorder in `app/dues.tsx` + one new guard file `utils/paySourceRename.test.ts` |
| Non-goals | No identifier/API/route/file rename; no pay-flow/record change; no loading UI; no new deps; no SPEC-47 document edit |

RFC 2119 terminology (MUST/MUST NOT/SHOULD) applies.

## Context

Two follow-ups from the pay-sheet thread (user calls 2026-10-10). (1) The
user wants the user-facing concept called Payment Source, not Payment
Method. Repo-wide inventory (case-insensitive, 2026-10-10) finds exactly 7
user-visible strings: `edit-transaction.tsx:247` label, `payment-methods.
tsx:92` title / `:115` dialog title / `:149` delete message,
`transaction-details.tsx:189` section label, `(tabs)/learning-detail.
tsx:16` literacy copy, `PaymentMethodChart.tsx:39` chart title. (The v1.2
pay sheet itself carries no such label — already removed.) (2) The pay
sheet blinks on open by construction: `openPayDialog` (`dues.tsx:242`)
sets `payTarget` first (sheet opens on fallback/stale list) and resolves
the API list after (SPEC-47 instant-open) — the list visibly pops in a
beat later.

Overlap note (§1.14): SPEC-47 owns picker behavior — its instant-open
slice is superseded here, document NOT edited. No other spec owns these
strings.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay
  Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, or third-party code
  (AGENTS §1.12).
- **CON-03** Rename rule (copy ONLY, plurality preserved): `Payment
  Method(s)` → `Payment Source(s)` in titles/labels; `payment method` →
  `payment source` in-sentence (learning copy, delete message);
  `PAYMENT METHOD / ACCOUNT` → `PAYMENT SOURCE / ACCOUNT` (suffix kept).
  Explicitly UNTOUCHED: identifiers (`PaymentMethod`, `paymentMethod`,
  `fetchPaymentMethods`, `FALLBACK_PAY_METHODS`, …), API endpoints/
  fields (`paymentMethods`), the `payment-methods` route + all file and
  component names, comments, and console strings.
- **CON-04** `openPayDialog` MUST resolve methods BEFORE opening: fetch →
  then set list + selection + `setPayTarget(due)` last, in ALL branches.
  Selection semantics stay byte-identical (API ok → `data[0].name`;
  else → `FALLBACK_PAY_METHODS` + `"Cash"`). No loading indicator, no new
  state, no button change — a slow network means the sheet simply appears
  later; concurrent double-taps are idempotent (same end state) and
  accepted without a guard.
- **CON-05** No pay-flow change: validation, busy states, fallback const,
  surfaced-message dialog, and `recordTransaction(due, method)` MUST stay
  byte-identical.
- **CON-06** Identical on Android, iOS, and Web — no `Platform.OS` branch.
  Any platform branch needs its own amendment first (§1.10).
- **CON-07** No new import, dep, or storage/API/route change in any
  touched file.
- **CON-08** No code, config, or dependency change before this spec is marked
  FINAL by the user (AGENTS §1.1, §1.10 CON-10 pattern).

## Goal

No user-visible "payment method" text remains anywhere; the pay sheet
opens exactly once, already holding its final method list.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Edit screen, methods screen, details, chart, literacy | View | `Payment Source(s)` copy; all actions work as before |
| Scheduled | Tap Pay (online) | Brief pause, then sheet opens once with the API list (no blink, no list pop-in) |
| Scheduled | Tap Pay (offline/API fail) | Sheet opens with fallback list + `Cash` (as today, minus the pop-in) |
| API identifiers/routes | Inspect code/network | `paymentMethods`, types, filenames all unchanged |

### Decisions

- **DEC-01** Copy-only rename (user call "payment source"; rejected:
  renaming identifiers/routes/files — breaking and out of scope).
- **DEC-02** Fetch-then-open (user call "dapat hindi ganon"; rejected:
  keeping SPEC-47 instant-open).
- **DEC-03** No loading indicator (bare-minimum; rejected: new button
  states for the fetch window).
- **DEC-04** New SPEC-80 file owns both tracks; SPEC-47's document stays
  untouched (§1.14).

### Acceptance

Objective — deterministic, machine-checkable (jest, parameterized by
`Platform.OS` = `android` / `ios` / `web` via mock):

- **ACC-01** Source scan: the 7 sites carry the new copy verbatim; no
  `Payment Method` / `payment method` / `PAYMENT METHOD` UI literal
  remains in `app/` + `components/` (console strings and identifiers
  excluded by exact-match scoping); API endpoint, type/interface names,
  route and file names (`payment-methods.tsx`, `PaymentMethodChart.tsx`)
  intact. Holds on android/ios/web.
- **ACC-02** Source scan: in `openPayDialog`, `setPayTarget(due)` occurs
  textually AFTER the fetch resolution in every branch; selection lines
  (`data[0].name`, `"Cash"` + `FALLBACK_PAY_METHODS`) intact; no new
  state/loading UI on the path. Holds on android/ios/web.
- **ACC-03** Source scan: `recordTransaction(due, method)`, validation,
  busy/disable, fallback const, and surfaced-message lines intact; no
  new import/dep/`Platform.OS`. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit
pass/fail observation steps, user-run per AGENTS §1.3 — agent never runs CLIs):

- **ACC-S01** Reviewer on Android/iOS (Expo Go, light AND dark) confirms:
  `Payment Source(s)` everywhere incl. chart/details/methods screens;
  tapping Pay opens the sheet once with the final list (no flash, no
  pop-in); offline still falls back. FAIL = old copy, blink, or dead tap.
- **ACC-S02** Reviewer on Web confirms ACC-S01 identically, no console
  error. FAIL = any web-only deviation (triggers a CON-06 amendment, not a
  silent branch).

TDD coverage (§1.10): `utils/paySourceRename.test.ts` covers
ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02
are user-run manual checks exactly as written above.

## Deliverables

- **D-01** Copy edits ONLY at the 7 inventoried sites (5 files) per
  CON-03. No other line in those files changes.
- **D-02** `app/dues.tsx` ONLY: `openPayDialog` reorder per CON-04.
  No other line in the file changes.
- **D-03** `utils/paySourceRename.test.ts` (new file, named here
  per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-04** Docs after implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the
  spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Copy-only:** user-visible strings change; code identifiers, API,
  routes, and filenames never do.
- **Fetch-then-open:** methods resolve before the sheet opens (one paint).

## References

- `AGENTS.md` (§1.4 compat, §1.9 spec format, §1.10 TDD/platform matrix,
  §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/47-due-payment-method-picker.md` (SPEC-47 — instant-open home;
  document NOT amended; slice superseded here)
- `specs/79-pay-chip-grid-styling.md` (pay-sheet styling home; untouched)
- Inventory: `edit-transaction.tsx:247`, `payment-methods.tsx:92/115/149`,
  `transaction-details.tsx:189`, `(tabs)/learning-detail.tsx:16`,
  `PaymentMethodChart.tsx:39`; `app/dues.tsx:242-256` (`openPayDialog`)

---

## v1.2 Amendment — Sheet subtitle Amount copy (PROPOSED, not yet FINAL)

User call 2026-10-10 (placed here per user direction "to 80" — the sheet
shape itself stays owned by SPEC-79, whose document is NOT edited): the pay
sheet subtitle reads `hhhh (₱100.00)` (`{title} ({amount})`); change it to
`Amount: ₱100.00`. v1.0/v1.1 sections stay normative; where this amendment
conflicts, v1.2 governs once marked FINAL.

### v1.2 Constraints (delta)

- **CON-10** The subtitle template becomes `` `Amount:
  ${formatAmount(payTarget.amount)}` `` — title dropped, `Amount:` prefix
  added (user-supplied copy, verbatim). The surrounding ternary guard,
  style, and every other sheet line stay byte-identical.
- **CON-11** No v1.2 code beyond D-08/D-09. SPEC-79's document stays
  unedited (copy line owned here, §1.14).

### v1.2 Goal (delta)

| Surface | Action | Expected |
|---|---|---|
| Sheet | Open for any due | Subtitle reads `Amount: ₱X.XX` (no title echo) |

Decisions:

- **DEC-08** Subtitle shows amount only with an `Amount:` prefix (user
  call; rejected: keeping the `{title} ({amount})` echo).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-06** Source scan: subtitle line reads `` `Amount:
  ${formatAmount(payTarget.amount)}` ``; the old
  `` `(${formatAmount(payTarget.amount)})` `` parenthesized pattern is
  gone from the file (title row keeps its own `Pay "[t]"?` copy
  untouched).
- **ACC-S01/S02** (v1.0/v1.1) stand, re-run — subtitle copy confirmed
  visually in the same pass.

### v1.2 Deliverables (delta)

- **D-08** `app/dues.tsx` ONLY: subtitle template per CON-10. No other
  line in the file changes.
- **D-09** `utils/paySourceRename.test.ts`: EXTENDED with the ACC-06
  guard × android/ios/web (existing guard home).
- **D-10** Docs after v1.2 implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line.

---

## v1.1 Amendment — Fixed source options (PROPOSED, not yet FINAL)

User call 2026-10-10 (folded here per user choice — the standalone
`specs/81-pay-sheet-fixed-source-options.md` DRAFT is deleted instead of
implemented, keeping one home per §1.14): the pay sheet MUST offer exactly
5 static source types — Cash, Card, Bank, E-Wallet, Other (the data-model
`cash | card | bank | e_wallet | other` taxonomy) — and nothing else. v1.0
sections above stay normative; where this amendment conflicts, v1.1
governs once marked FINAL. Explicit supersessions: CON-04/D-02/ACC-02
(fetch-then-open) → deleted with the fetch it ordered (days later,
recorded honestly); v1.0 rename + SPEC-79 styling stand untouched.

### v1.1 Constraints (delta)

- **CON-10** New module-scope const `PAY_SOURCE_OPTIONS: { id: string;
  name: string }[]` (named here per §1.11) holding exactly: Cash, Card,
  Bank, E-Wallet, Other (labels verbatim — FINAL-adjustable casing). The
  sheet maps over it; the recorded `paymentMethod` value is the option
  label (name-passing convention); default selection stays `"Cash"`.
- **CON-11** `openPayDialog` becomes synchronous: reset selection to
  `"Cash"`, then `setPayTarget(due)` — no fetch, no branches. The
  `FALLBACK_PAY_METHODS` const (+ SPEC-47 comment), `payMethods` state,
  `PaymentMethodInfo` import, and `authFetch` import (verified used
  nowhere else in `dues.tsx` — 2 occurrences: import + fetch) MUST all
  be removed with it. `payMethod` state, card JSX (keyed by `m.id`,
  selected by `m.name`), and the Confirm flow stay byte-identical in
  behavior.
- **CON-12** Historical rows keep old values (no migration, no backfill);
  customs/API/add-edit pickers/Sources screen untouched (sheet-only
  lock). Reports group new labels going forward by existing behavior.
- **CON-13** No v1.1 code beyond D-05/D-06. SPEC-47's document stays
  unedited (fetch slices now fully dead for the sheet).

### v1.1 Goal (delta)

| Surface | Action | Expected |
|---|---|---|
| Scheduled | Tap Pay (any network) | Sheet opens instantly with Cash/Card/Bank/E-Wallet/Other (no fetch, no blink, offline-identical) |
| Sheet | Tap a card → Confirm | Transaction records with the label (e.g. `E-Wallet`); flow identical |

Decisions:

- **DEC-05** Five static labels, sheet-only lock (user calls; rejected:
  grouping API methods under headers, global lock with migration).
- **DEC-06** Recorded value = label; no migration by design (rejected:
  backfilling historical rows).
- **DEC-07** Fetch deleted with the list it fed (rejected: keeping a dead
  fetch); orphans go in the same diff (otherwise unused-var lint
  failures). Folded from the SPEC-81 draft, which is deleted
  unimplemented.

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-04** Source scan: `PAY_SOURCE_OPTIONS` holds exactly the 5 labels
  in order (Cash, Card, Bank, E-Wallet, Other); the sheet maps over it.
  (ACC-01 rename + ACC-03 flow pins stand, re-run.)
- **ACC-05** Source scan: `FALLBACK_PAY_METHODS`, `payMethods`,
  `PaymentMethodInfo` (import), and the `apiClient` import are all gone
  from `app/dues.tsx`; `openPayDialog` is synchronous with `setPayTarget`
  and no `authFetch`; default `useState("Cash")` intact.
- **ACC-S01/S02** (v1.0) stand, re-run: offline-identical now trivially
  true (no network on the path at all).

### v1.1 Deliverables (delta)

- **D-05** `app/dues.tsx` ONLY: const + render + simplified opener +
  orphan cleanup per CON-10/CON-11. No other line in the file changes.
- **D-06** `utils/paySourceRename.test.ts`: EXTENDED with ACC-04/05
  guards × android/ios/web (existing guard home — pin extension, not a
  new file, per §1.11/§1.14). Plus `utils/duePayment.test.ts` ACC-02a/b
  rewritten to the v1.1 norm (static set, sync opener — the SPEC-47 fetch
  pins they replaced were superseded here; all other pins untouched).
- **D-07** Docs after v1.1 implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line.
