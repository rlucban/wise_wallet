# Spec 53: Onboarding Logo Consistency & Optional Initial Balance

| Field | Value |
|---|---|
| ID | SPEC-53 |
| Title | Onboarding Logo Consistency & Optional Initial Balance |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/onboarding.tsx` |
| Non-goals | Validation logic beyond what's required, styling of other fields, navigation |
| Normative source | This file. |

---

## 1. Context

`app/onboarding.tsx` shows an emoji in `styles.walletEmoji` above the
WiseWallet title, while the Login screen uses
`<MaterialCommunityIcons name="wallet" size={42} color="#fff" style={styles.logo} />`.
The Initial Balance field is labeled as required-looking and its empty/zero
behavior isn't explicit to the user.

---

## 2. Constraints

- **CON-01 (Logo):** Replace the emoji `Text` (`styles.walletEmoji`) with
  the same wallet icon as login: `MaterialCommunityIcons name="wallet"`,
  `size={42}`, `color="#fff"`, styled with the existing logo container
  (e.g. `styles.logo`-equivalent circle/background matching Login). The
  `walletEmoji` style + emoji Text MUST be removed if unused after.
- **CON-02 (Label):** The balance TextInput label MUST read
  `"Initial Balance (Optional)"`.
- **CON-03 (Optional logic):** Empty or `0` balance MUST proceed with
  `initialBalance = 0` and MUST NOT surface a validation error. If a
  non-zero amount is entered, behavior stays as today (creates the
  "Initial account setup" income transaction). Amount cap rules (≤
  ₱10,000,000) still apply.
- **CON-04 (Cross-Platform):** Identical rendering on Android/iOS/Web.

---

## 3. Acceptance

- **ACC-01 (Objective):** Onboarding contains no emoji Text; the wallet
  `MaterialCommunityIcons` is used instead.
- **ACC-02 (Objective):** Label reads exactly `Initial Balance (Optional)`.
- **ACC-03 (Objective):** Submitting with an empty balance field resolves to
  `0` and proceeds without a validation error.
- **ACC-04 (Subjective):** Reviewer confirms the logo matches the Login
  screen.

---

## 4. Platform Matrix

| Platform | Objective Checks | Subjective Checks |
|---|---|---|
| **Android** | ACC-01..03 | Logo matches Login |
| **iOS** | Same | Same |
| **Web** | Same | Same |

---

## 5. Deliverables

- **D-01 (`app/onboarding.tsx`):** Swap emoji for wallet icon, update label,
  ensure empty/0 proceeds at 0.

---

## 6. References

- `app/login.tsx` (logo reference), `specs/` §1.9 (format)
