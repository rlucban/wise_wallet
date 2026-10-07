# SPEC-63 — Settings Sort, Reports Icon, Literacy Guide, Dashboard Add Control, Scheduled Pay UI, Dark-Mode Surface

| Field | Value |
|---|---|
| ID | SPEC-63 |
| Title | Settings Sort, Reports Icon, Literacy Guide, Dashboard Add Control, Scheduled Pay UI, Dark-Mode Surface |
| Status | FINAL |
| Owner | WiseWallet |
| Version | 1.0 |
| Scope | `app/(tabs)/category-settings.tsx`, `app/(tabs)/reports.tsx`, `utils/learningData.ts`, `app/(tabs)/learning.tsx`, `app/(tabs)/learning-detail.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/_layout.tsx`, `app/dues.tsx`, `app/completed-dues.tsx`, `context/ThemeContext.tsx` |
| Non-goals | No dependency additions, no merge/rebase from `features/floating-tab-bar`, no new calculator feature, no scheduled edit/delete, no API/backend changes, no commits |

## Context
WiseWallet has user-facing UI gaps: Manage Categories lacks a visible Sort by control, the Reports period menu can render a literal `?` because of an invalid MaterialCommunityIcons name, Financial Literacy lacks a WiseWallet app guide, the Dashboard add-transaction control should be circle-only and sit beside the bottom tab bar, scheduled dues need a cleaner pay flow and completed-dues presentation, and dark mode has mixed white surfaces.

## Constraints
- **CON-01** All changes MUST remain compatible with Android, iOS, and Web.
- **CON-02** No new npm packages, native modules, or fonts are allowed.
- **CON-03** No code path may import an invalid `MaterialCommunityIcons` glyph statically and render a literal `?`.
- **CON-04** The dashboard add-transaction affordance MUST be circle-only and placed adjacent to the existing floating bottom tab bar.
- **CON-05** `features/floating-tab-bar` is a reference only; no merge/rebase/merge commit is allowed.
- **CON-06** Scheduled edit/delete is out of scope unless a later spec expands it.
- **CON-07** Edit/delete for transactions remains on `transaction-details.tsx`.
- **CON-08** Completed dues remain read-only for editing/deleting, but their UI may gain refresh and clearer totals.
- **CON-09** Dark mode must use the current theme surface token for dashboard cards; no light-white card background should remain under dark mode.
- **CON-10** No code changes may run before this spec is marked FINAL.

## Goal
1. Settings → Manage Categories gains a deterministic Sort by control.
2. Reports period dropdown no longer renders `?`.
3. Literacy gains a WiseWallet app guide article.
4. Dashboard add-transaction control is circle-only beside the floating tab bar.
5. Scheduled pay flow and completed dues receive clearer UI states.
6. Dashboard dark-mode white surfaces align with theme surface.

### Interaction matrix
| Surface | Action | Expected |
|---|---|---|
| Settings | Select Sort by Name | Categories sort alphabetically A–Z |
| Settings | Select Sort by Type | Categories sort expense/income preserving current filter context |
| Settings | Select Sort by Recent | Categories sort by `updatedAt` descending |
| Reports | Open period dropdown | No literal `?`; Weekly/Monthly/Yearly icons render valid glyphs |
| Literacy | Open article list | WiseWallet app guide article is present |
| Dashboard | View bottom bar | Circle `+` appears beside the floating tab pill |
| Dashboard | Dark mode | Cards/surfaces match dark theme surface |
| Scheduled | Pay dues | Payment dialog has clear loading/error/confirm state |
| Completed dues | Refresh list | Pull-to-refresh or refresh control is present |

### Decisions
- **DEC-01** Sort by options are `Name`, `Type`, `Recent`.
- **DEC-02** Reports icon fix uses an existing glyph name (`calendar-range` as first preference).
- **DEC-03** Literacy guide uses topic `App Guide` and a matching filter chip.
- **DEC-04** Dashboard `+` remains the existing `/add-transaction` action.
- **DEC-05** Pay UI uses the existing payment-method fetch and `recordTransaction` flow; no backend contract change.

### Acceptance
- **ACC-01** Category list order changes deterministically according to the selected sort key on Android, iOS, and Web.
- **ACC-02** Reports period dropdown shows Weekly, Monthly, and Yearly rows with valid icons; no literal `?` appears.
- **ACC-03** Literacy article list includes a WiseWallet app guide article and opening it renders a full body.
- **ACC-04** Dashboard shows a circle-only `+` add button adjacent to the bottom tab bar.
- **ACC-05** Dark mode dashboard surfaces use the dark theme surface token.
- **ACC-06** Dues pay dialog has disabled confirm while processing and shows a clear error when payment fails.
- **ACC-07** Completed dues screen supports refresh and clearly totals completed dues.

## Deliverables
- **D-01** Add Sort by selector and deterministic ordering in `app/(tabs)/category-settings.tsx`.
- **D-02** Replace invalid `calendar-year` icon in `app/(tabs)/reports.tsx`.
- **D-03** Add WiseWallet app guide resource and detail content.
- **D-04** Add `App Guide` topic/filter handling in literacy surfaces.
- **D-05** Restyle/reposition dashboard add-transaction circle button beside tab bar.
- **D-06** Polish dues pay dialog and completed dues refresh/total display.
- **D-07** Align dashboard dark-mode card backgrounds with theme surface.
- **D-08** Add focused tests/guards for deterministic sort and any new pure helper.

## Glossary
- **Sort by:** the user-visible ordering control in Manage Categories.
- **Completed dues:** dues whose transaction has been recorded.
- **Surface token:** the active Paper theme `surface` color.

## References
- `AGENTS.md`
- `specs/04-connection-status-vs-offline-mode.md`
- `specs/52-floating-tab-bar.md`
- `specs/56-overlay-tab-bar-and-clearance.md`
- `specs/47-due-payment-method-picker.md`
- `specs/48-paid-due-visibility.md`
