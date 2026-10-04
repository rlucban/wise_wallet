# Deferred TODO Specs

Backlog of diagnosed-but-unimplemented work. Each entry is **not** an approved
spec — no `specs/` file exists, nothing is authorized for implementation. They
are recorded here so the investigation survives the session and can be picked up
later via `/plan-fix`.

Status key: `OPEN` (diagnosed, unstarted) · `BLOCKED` (needs a decision first)

---

## T-01 — `GO_BACK` unhandled on sub-screens after web refresh

| Field | Value |
|---|---|
| Status | OPEN — no spec written |
| Severity | Low — development-only warning; no user-visible failure |
| Platform | Web (reachable). Native unaffected in practice (tabs keep history) |
| Found | 2026-10-05, during SPEC-40 session |

### Symptom

```
The action 'GO_BACK' was not handled by any navigator.
Is there any screen to go back to?
```

`expo-router` dev warning, emitted from `ExpoRoot.js:183` via
`useNavigationBuilder.js:611`. It fires when `router.back()` is dispatched with
an empty navigation history.

### Evidence

- **16 screens** call `router.back()` behind an `Appbar.BackAction`:
  `add-due.tsx:89`, `add-allocation.tsx:80`, `calendar.tsx:51`,
  `add-transaction.tsx:231`, `edit-transaction.tsx:173`, `transaction-details.tsx:76`,
  `archived-allocations.tsx:66`, `category-settings.tsx:43`,
  `completed-dues.tsx:167`, `dues.tsx:471`, `help.tsx:13`,
  `notifications.tsx:328`, `payment-methods.tsx:90`, `savings.tsx:241`,
  plus the post-save `router.back()` calls at `add-due.tsx:78`,
  `add-allocation.tsx:62`, `add-transaction.tsx:213`, `edit-transaction.tsx:161`,
  `transaction-details.tsx:51`.
- **Zero** of them guard with `router.canGoBack()`.
- **`learning-detail.tsx:131` is the one screen that avoids it** — it uses
  `router.push('/(tabs)/learning')` instead of `router.back()`. A known-good
  pattern already exists in the codebase.

### Likely trigger (hypothesis — not reproduced)

SPEC-30 v2.4 made web refresh **preserve the session** (previously it forced
login). A refresh on a sub-screen now renders that screen with a BackAction and
no history to pop, where before the user was bounced to `/login` (which has no
BackAction). The v2.4 fix did not create this, but it plausibly made it
reachable. **Confirm before writing a spec** — reproduce by signing in on web,
navigating to `/savings` or `/dues`, then pressing F5 and tapping Back.

### Candidate fix directions (undecided)

- Guard each `onPress` with `router.canGoBack()` and fall back to
  `router.replace('/')` (or `/(tabs)`) when there is nothing to pop.
- Or adopt `learning-detail`'s `router.push('/(tabs)')` pattern.
- Native behavior must not regress; tabs and modal presentations differ.

### Notes

- Dev-only warning, explicitly "won't be shown in production" — no shipped
  breakage, but it signals unreachable routes after refresh.
- Fixing this means touching up to 16 files; scope needs a decision before spec.

---

## T-02 — Web update/delete consult `txRepo` before the API call

| Field | Value |
|---|---|
| Status | OPEN — no spec written |
| Severity | Low — no user-visible symptom today |
| Platform | Web (branch below is web-only); native queue path unaffected |
| Found | 2026-10-05, during SPEC-40 session |

### Symptom

On web, `updateTransaction` and `deleteTransaction` touch the local repository
before the API call, so a stale local copy can diverge from the server. Because
web is API-direct (SPEC-36), the reload discards the local value — the API
wins. Visible as "my edit didn't stick," **not** as wrong data shown as truth.

### Evidence — corrected severity

Earlier in the SPEC-40 session this was described as a localStorage leak on
every web write. That was wrong; re-reading the code:

- `context/TransactionsContext.tsx:211-217` — `updateTransaction`:
  ```ts
  const item = await txRepo.getById(id);
  if (item) {                                  // ← conditional
      await txRepo.upsert(...);
  }
  ```
  On a clean web install nothing is in localStorage for that record, so
  `getById` returns null and **the local write is skipped entirely**. The
  divergence only occurs when local data already exists — legacy pre-SPEC-36
  data, or something a JSON import wrote.
- `context/TransactionsContext.tsx:249` — `deleteTransaction`:
  `txRepo.deleteById` is unconditional, but removing an absent key is a no-op.

So the practical exposure is narrow. It is **not** "transaction data written to
localStorage on every web write."

### Spec-accuracy finding

SPEC-36 D-W-03 claims Transactions is "full API-direct… no local repo." That is
inaccurate: reads (`:89-98`) and adds (`:178-190`) are pure API-direct, but
update and delete consult `txRepo` first. **SPEC-36's claim overstates what is
implemented** and should be corrected regardless of whether this is ever fixed.

### Why deferred

- No user-visible symptom; failure mode self-corrects on reload (API is
  authoritative on web).
- Reordering update/delete is the risky part: the **native queue branch sits
  below** the web branch, and a careless reorder would silently break sync.
- Not worth spending regression risk on after three rounds in this session where
  behavior was assumed rather than read.

### Candidate fix directions (undecided)

- Move the web branch above the local repo read and early-return, mirroring the
  pattern `addTransaction` (`:178`) and `fetchTransactions` (`:89`) already use.
- Native branch and its queue enqueue stay byte-identical.

---

## T-03 — Stale `98/98` constraint in SPEC-28 CON

| Field | Value |
|---|---|
| Status | OPEN — documentation only |
| Severity | Cosmetic — no runtime effect |
| Found | 2026-10-05, during the SPEC-30 v2.3/v2.4 session |

`specs/28-passcode-screen-ref-type.md:90` states `npm test MUST stay at 98/98`
as a **constraint** (not just an acceptance criterion). That baseline was
already invalidated by SPEC-37/38/39, which added three test files. The current
suite is 361 tests.

SPEC-30 v2.3 annotated the equivalent pins in SPEC-27 (ACC-01) and SPEC-28
(ACC-05) as historical record. **This line 90 constraint was left unannotated**
and is the one remaining stale count.

SPEC-31's `CON-07`/`ACC-04` pins the same number but that spec is still DRAFT
and unimplemented; deferred to its own implementation cycle.

### Fix

Annotate line 90 the same way as SPEC-27/SPEC-28 — preserve `98/98` as the
verified baseline when that spec shipped, note the suite has grown, and state
that the real gate is **0 failed**.

---

## T-04 — Rotate a JWT that was pasted into the transcript

| Field | Value |
|---|---|
| Status | OPEN — manual action, no code |
| Severity | **High** — live credential exposed |
| Found | 2026-10-05, during the SPEC-40 session |

A full bearer token was pasted in chat while inspecting localStorage:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIzNDRjNmU1LTY3MzMtNGE5ZC1iZWI5LWU1ZGE2NWQ4MmRiOSIsImlhdCI6MTc5MTE1MTEwNiwiZXhwIjoxNzkxMjM3NTA2fQ…
```

Anyone holding it can act as that user until it expires. Sign out / re-login to
invalidate the session, or rotate the JWT secret server-side if the token
outlives it. **No code change needed — this is a manual step.**

---