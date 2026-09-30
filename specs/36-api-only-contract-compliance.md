# Spec 36: API-Only Contract Compliance (Client Adapts, No Server Change)

| Field | Value |
|---|---|
| ID | SPEC-36 |
| Title | API-only plane matches `wallet-api` as implemented: profile ensure via PUT-by-userId, schema-valid transaction POST, envelope-aware reads |
| Status | **FINAL** (2026-09-30 per user call) |
| Owner | User (final authority) |
| Version | 1.0 — FINAL: v0.1 draft approved as-is; implement exactly this |
| Scope | `utils/apiOnly.ts` + `utils/apiOnly.test.ts` only (normalizer, ensure, serializer, list/create unwrap) |
| Non-goals | Any `wallet-api` change (out of scope per user 2026-09-30); local-persist plane behavior; 204-delete handling (observed, future spec); transaction `title` fidelity (server has no title column — silent strip stands); other entities' create-validation |
| Normative source | This file, once marked FINAL. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently", "observed") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Server contract (verified read-only 2026-09-30, `ninalamo/wallet-api` master + live probes)

- `src/routes/profileRoutes.js`: `GET /`, `GET /:userId`, `PUT /:userId` under
  `/api/userProfiles`. **No `POST` route** — live `POST /api/userProfiles`
  returns Express `Cannot POST /api/userProfiles` (404, user-captured).
- `src/controllers/profileController.js`: `getProfile` returns
  `data: { profile }` (or 404 `Profile not found` when missing);
  `updateProfile` resolves the id from `query.userId || params.userId` and
  treats it as the **user** id.
- `src/repositories/profileRepository.js`: `updateProfile` is update-only
  (`.update().eq('userId', …).single()` — zero rows throws); `createProfile`
  exists but has **no controller method and no route**.
- `src/services/authService.js`: `register` creates user + profile row
  (`isFirstRun: true`). Every fresh Cloud account HAS a server profile row.
- `src/schemas/transactionSchema.js` (`createTransactionSchema`, zod):
  `paymentMethod: z.string().min(1)` is REQUIRED; unknown keys are stripped
  (zod default), not rejected.
- List/create envelopes (all controllers): `GET` →
  `data: { transactions | categories | dues | savingsItems: [...] }`;
  `POST` → `data: { transaction | category | due | savingsItem: {…} }`.
  `authFetch` (`utils/apiClient.ts`) unwraps only the outer `data`, leaving
  the inner envelope to callers.

### 1.2 Client defects (all in `utils/apiOnly.ts`, all api-only plane)

1. **Profile 404 + wizard loop.** `normalizeUserProfileResponse`
   (`apiOnly.ts:75-92`) does not unwrap the `{ profile }` envelope, so a
   present row normalizes to `null`. `ensureCloudProfile` (`apiOnly.ts:186-205`)
   then takes the create branch and `POST`s a nonexistent route (404). The
   update branch `PUT`s `found.id` (profile-row UUID) where the server expects
   the user id (→ 0 rows → 500). Net: `fetchProfile`
   (`context/UserProfileContext.tsx:72-84`) always falls back to
   `DEFAULT_PROFILE` (`isFirstRun: true`) → `app/_layout.tsx:197-201`
   re-routes to `/intro` on every reload/refocus/second-device login.
2. **Transaction 400.** `toApiBody` (`apiOnly.ts:133-148`) passes
   `paymentMethod: ""` through (set by `sanitizeTransaction`,
   `context/TransactionsContext.tsx:53`) for writers that omit it —
   `app/onboarding.tsx:45` (Opening Balance) and `app/dues.tsx:272`
   (due payment). Server `min(1)` rejects it. (`app/add-transaction.tsx:44`
   defaults `"cash"`, so the form path is unaffected.)
3. **Latent envelope blindness (same root cause).** All five api-only readers
   gate on `Array.isArray(data)` (`TransactionsContext.tsx:117`,
   `CategoriesContext.tsx:55`, `hooks/useSavings.ts:70`,
   `hooks/useDues.ts:63`) but receive envelope objects → permanent empty
   state; all four `apiCreate` consumers (`TransactionsContext.tsx:226-228`,
   `CategoriesContext.tsx:122-124`, `useSavings.ts:161-163`,
   `useDues.ts:133-135`) append the un-unwrapped envelope as a phantom row.
   Fixing (1)+(2) without (3) leaves onboarding succeeding into an empty,
   self-corrupting dashboard.

### 1.3 Definitions

**Envelope** — the server's inner named wrapper (`{ profile }`,
`{ transactions }`, …) inside `body.data`.

**Ensure** — `ensureCloudProfile`: converge the server profile row to the
given values, creating the effect when missing (via PUT, never POST).

## 2. Constraints (normative once FINAL)

- **CON-01 — No server change.** The fix MUST NOT require any `wallet-api`
  change. The client adapts to the routes as implemented (§1.1).
- **CON-02 — Profile ensure is PUT-by-userId.** `ensureCloudProfile` MUST
  NEVER `POST` the `userProfiles` collection. Missing row → `PUT`
  `userProfiles/{userId}`; present row → `PUT` `userProfiles/{userId}`
  (MUST use the user id in the URL, NEVER `found.id`). Rationale: no POST
  route exists; the `:userId` param is interpreted as the user id; register
  always pre-creates the row so PUT converges the reported flows.
- **CON-03 — Envelope-aware profile normalizer.** `normalizeUserProfileResponse`
  MUST descend into a `{ profile }` envelope before applying today's
  array/object rules (array → userId match else first; object → as-is;
  nameless → null). Existing array/object/empty behaviors MUST be preserved
  (local-plane callers pass raw shapes).
- **CON-04 — Schema-valid transaction POST.** The api-only transaction body
  MUST satisfy `createTransactionSchema`: empty/missing `paymentMethod` MUST
  serialize as `"cash"`. Rationale: matches the existing display fallback
  (`app/transaction-details.tsx:151` renders method-less as `"Cash"`) and the
  form default (`app/add-transaction.tsx:44`). No other field mapping changes;
  `categoryId` derivation and `userId` injection stay as-is. Plane-scoped to
  the serializer — local-plane stored values (`""`) are untouched.
- **CON-05 — Envelope-aware list/create.**
  `apiList("transactions" | "categories" | "dues" | "savingsItems")` MUST
  resolve to the inner array when the payload is the documented envelope;
  `apiCreate` MUST resolve to the inner row for the documented single
  envelopes (`{ transaction }`, `{ category }`, `{ due }`,
  `{ savingsItem }`, `{ profile }`). Unknown shapes MUST pass through
  unchanged (forward-compatible). `apiUpdate`/`apiDelete` are untouched
  (consumers check `ok` only). Local-persist plane untouched (SPEC-34 CON-09
  scoping stands).
- **CON-06 — Honest failure.** A truly-missing profile row (GET 404 + PUT
  non-ok) MUST still surface a visible error/notice per SPEC-34 (never silent,
  never queued). `completeSetup` ignoring the ensure boolean is UNCHANGED.
- **CON-07 — Standing repo invariants (AGENTS.md §1).** MUST keep Android +
  iOS + Web working; MUST keep web Vercel-deployable; Expo Go MUST NOT crash;
  no new native deps; no storage-key, route, or `wallet-api` contract change.
  The existing `apiOnly.test.ts` case `"ensureCloudProfile: POSTs when
  missing, PUTs when present"` encodes the buggy behavior and MUST be
  rewritten, not deleted.

## 3. Goal

| Scenario | After (FINAL) |
|---|---|
| Fresh Cloud register → onboarding with balance (any platform) | Opening Balance POST 201; no 400, no `Cloud create failed` |
| Onboarding completes → Dashboard | Balance row visible (list envelope unwrapped, created row unwrapped) |
| Reload / refocus / second-device login (same id) | Profile GET unwrapped → `isFirstRun: false` persists; intro/stepper NEVER reappears |
| Pay a due while Cloud+ON | Due-payment POST 201 (serializer default), no 400 |
| Categories/dues/savings in api-only | Lists populate; creates append real rows, not envelopes |
| Profile row truly missing server-side | Visible error notice; no silent drop, no queue write |
| Local account / Cloud+OFF (mobile) | Byte-identical behavior (zero `fetch` delta, `""` method preserved locally) |

Open decisions: none — DEC-01 (adapt client, no server change) per user
2026-09-30; DEC-02 (PUT-by-userId for both ensure branches); DEC-03 (fix in
the shared `apiOnly` layer, not per call site — covers onboarding + dues +
future writers); DEC-04 (include list/create envelope unwrap — required for
the fixed flow to render correctly).

### Acceptance criteria

Objective (machine-checkable, `jest` parameterized by `Platform.OS` =
`android`/`ios`/`web` via mock):

- **ACC-01:** normalizer maps `{ profile: { userId: "U", name: "n" } }` →
  the row; array-with-match, array-first-fallback, bare object, and
  `[]`/`null`/nameless → `null` behaviors unchanged.
- **ACC-02:** ensure with GET-missing performs zero `POST` calls and one
  `PUT` to `userProfiles/U`; ensure with GET-present (row id `p1 ≠ U`)
  `PUT`s `userProfiles/U` (never `userProfiles/p1`); failed PUT → `false`.
- **ACC-03:** `toApiBody("transactions", …)` maps `""`/missing
  `paymentMethod` → `"cash"`, preserves a set method, keeps `categoryId`
  derivation + `userId` injection byte-identical.
- **ACC-04:** `apiList` unwraps all four list envelopes to arrays and passes
  unknown shapes through untouched.
- **ACC-05:** `apiCreate` unwraps all five single envelopes to rows and
  passes unknown shapes through untouched.

Subjective (human-judged, observable reviewer checks):

- **ACC-06:** reviewer on Android (Expo Go) fresh-registers Cloud, completes
  onboarding with ₱15: Dashboard shows the Opening Balance; reload keeps it;
  intro/stepper never reappears; no red-box.
- **ACC-07:** reviewer on web export repeats ACC-06, then logs in on a second
  tab (same credentials): name + ₱15 converge; paying a due online succeeds
  with no `Cloud create failed` notice.
- **ACC-08:** reviewer with a mobile Local account completes onboarding
  airplane-mode: flow byte-identical to today (offline-first, zero `fetch`).

## 4. Deliverables

- **D-01 — `utils/apiOnly.ts` changes only.** Normalizer envelope descent
  (CON-03); ensure PUT-by-userId both branches, POST call removed (CON-02);
  serializer `paymentMethod` default (CON-04); list/create envelope unwrap
  (CON-05). No consumer-file edits (all five readers and four create sites
  converge via the shared layer).
- **D-02 — Tests.** Extend `utils/apiOnly.test.ts` for ACC-01..05 ×
  android/ios/web (repo's `describe.each` pattern, `authFetch` mocked);
  rewrite the `"POSTs when missing"` case per CON-07.
- **D-03 — Docs.** `docs/savepoint.md` + `AGENTS.md §3` append implementation
  entry (per `.agents/rules/wisewallet.md`); this file's Status → FINAL with
  date upon user approval.
- **D-04 — User-run verification.** `npx tsc --noEmit`,
  `npx tsc -p tsconfig.test.json --noEmit`, `npm test`, `npx eslint .`,
  Expo Go Android+iOS (ACC-06/08) + `expo export --platform web` (ACC-07).

## Glossary

| Term | Meaning |
|---|---|
| Envelope | Server's inner named wrapper (`{ profile }`, `{ transactions }`, …) inside response `data` |
| Ensure | Converge the server profile row to given values (PUT-by-userId, never POST) |
| Local-persist plane | Mobile-Local + mobile-OFF; AsyncStorage-backed, untouched by this spec |

## References

- `AGENTS.md §1` — spec-first, no CLI, invariants, docs.
- `specs/34-api-only-online-mode.md` — CON-02/CON-09 (api-only layer, local-plane scoping).
- `utils/apiOnly.ts` (`normalizeUserProfileResponse:75-92`, `apiList:125-131`,
  `toApiBody:133-148`, `apiCreate:150-160`, `ensureCloudProfile:186-205`),
  `utils/apiClient.ts` (outer-`data` unwrap), `utils/apiOnly.test.ts:348`
  (case to rewrite), `context/UserProfileContext.tsx:72-84,138-150`,
  `context/TransactionsContext.tsx:53,116-117,217-228`,
  `app/onboarding.tsx:45`, `app/dues.tsx:272`, `app/_layout.tsx:197-201`.
- `ninalamo/wallet-api` (read-only, verified 2026-09-30):
  `src/routes/profileRoutes.js`, `src/controllers/profileController.js`,
  `src/services/profileService.js`, `src/repositories/profileRepository.js`,
  `src/schemas/transactionSchema.js`,
  `src/controllers/{transaction,category,due,savingsItem}Controller.js`.
