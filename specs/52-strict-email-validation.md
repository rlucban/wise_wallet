# Spec 52: Strict Email Format Validation on Registration

| Field | Value |
|---|---|
| ID | SPEC-52 |
| Title | Strict Email Format Validation on Registration |
| Status | **FINAL** (2026-10-04 per user call "final"; copy: example hint) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `utils/registerValidation.ts`, `utils/registerValidation.test.ts` |
| Non-goals | Login flow, cloud API contract, PIN rules, UI copy beyond the one error string |
| Normative source | This file. |

---

## 1. Context

`utils/registerValidation.ts` currently uses
`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, which already rejects `rclucban@` and
`rclucban@gmail` but still accepts edge inputs like `a@b..com` (empty label)
and `a@b.c` (1-char TLD). The user wants a standard, strict format:
local name `@` domain labels `.` TLD (2+ chars).

---

## 2. Constraints

- **CON-01 (Regex):** `EMAIL_REGEX` MUST reject empty labels and require a
  TLD of at least 2 characters. A conforming form:
  `/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/`
  (local part non-space/non-@, one or more domain labels, final TLD letters
  ≥ 2). Exact regex MAY differ if it passes the same accept/reject matrix.
- **CON-02 (Behavior):** `isValidEmail` and `validateRegisterInput` keep
  their signatures; invalid emails still produce
  `INVALID_EMAIL_ERROR` ("Please enter a valid email address"). Append the
  example hint only if the copy change is acceptable:
  `'Please enter a valid email address (e.g., name@example.com)'` —
  DEFAULT decided by user; see Open Question in §3.
- **CON-03 (Test matrix):** `utils/registerValidation.test.ts` MUST cover,
  in both positive and negative expectations:
  - Accept: `rclucban@gmail.com`, `user@domain.org`, `a@b.co`,
    `first.last@sub.domain.ph`
  - Reject: `rclucban@`, `rclucban@gmail`, `@b.com`, `a b@c.com`, `a@b`,
    `a@@b.com`, `a@b..com`, `a@b.c`, empty/whitespace
- **CON-04 (Cross-Platform):** Validation runs identically on
  Android/iOS/Web; jest suite parameterized by `Platform.OS`.

---

## 3. Open Question

**Error copy** — keep `"Please enter a valid email address"` (current) or
switch to `"Please enter a valid email address (e.g., name@example.com)"`?

---

## 4. Acceptance

- **ACC-01 (Objective):** `EMAIL_REGEX` enforces CON-01; the test matrix in
  CON-03 passes across `Platform.OS` android/ios/web.
- **ACC-02 (Objective):** `npx tsc --noEmit`, `npm run lint`, and the jest
  suite are green.
- **ACC-03 (Subjective):** Reviewer registers with `rclucban@gmail` and sees
  the inline error; `rclucban@gmail.com` proceeds.

---

## 5. Deliverables

- **D-01 (`utils/registerValidation.ts`):** Update `EMAIL_REGEX` per CON-01;
  apply the user's error-copy decision.
- **D-02 (`utils/registerValidation.test.ts`):** Extend the matrix per CON-03
  with `Platform.OS` parameterization.

---

## 6. References

- `AGENTS.md §1.9`, `§1.10`
