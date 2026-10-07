# Spec 51: Category Settings Alphabetical Sorting

| Field | Value |
|---|---|
| ID | SPEC-51 |
| Title | Category Settings Alphabetical Sorting |
| Status | **FINAL** |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/category-settings.tsx`: Add A-Z and Z-A sorting toggle action in `Appbar.Header` and sort category list |
| Non-goals | Persisting category sort order across sessions; changing category database models or sync logic |
| Normative source | This file. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## 1. Context

### 1.1 Problem
In `app/category-settings.tsx` ("Manage Categories"), categories are currently rendered in their default database retrieval order. Users have no way to sort categories alphabetically to quickly locate specific categories in either ascending (A-Z) or descending (Z-A) order.

---

## 2. Constraints (normative)

- **CON-01 — Header Placement:** The sort toggle action MUST be placed on the right side of `Appbar.Header` using `<Appbar.Action />`.
- **CON-02 — Dynamic Icon Representation:** When sorting in ascending order (A-Z), the button icon MUST represent A-Z ascending (`sort-alphabetical-ascending`). When sorting in descending order (Z-A), the button icon MUST represent Z-A descending (`sort-alphabetical-descending`).
- **CON-03 — Non-Destructive In-Memory Sorting:** Sorting MUST be applied to the rendered display list (`sortedCategories`) without altering the underlying database records or modifying timestamps.
- **CON-04 — Tab Parity:** Sorting MUST apply consistently to both Expense and Income category lists across tab switches.
- **CON-05 — Cross-Platform Parity:** The sort action MUST function consistently across Web, Android, and iOS.

---

## 3. Goal & Acceptance Criteria

### 3.1 Decisions

- **DEC-01 (Sort Order State):** Introduce a `sortOrder` state in `CategorySettings` initialized to `"asc"`:
  ```typescript
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  ```
- **DEC-02 (Toggle Handler):** Provide `toggleSortOrder` switching between `"asc"` and `"desc"`:
  ```typescript
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };
  ```
- **DEC-03 (Sorted List Derivation):** Derive `sortedCategories` from `filteredCategories`:
  ```typescript
  const sortedCategories = [...filteredCategories].sort((a, b) => {
    return sortOrder === "asc"
      ? a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      : b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
  });
  ```
- **DEC-04 (Header Action):** Render `<Appbar.Action icon={sortOrder === "asc" ? "sort-alphabetical-ascending" : "sort-alphabetical-descending"} onPress={toggleSortOrder} />` on the right side of `Appbar.Header`.

### 3.2 Platform Matrix & Acceptance Criteria

| Platform | Type | Criteria |
|---|---|---|
| Web | Objective (`ACC-01`) | Clicking the sort action toggles sort order between ascending (A-Z) and descending (Z-A) and updates category card ordering accordingly. |
| Android | Objective (`ACC-02`) | Tapping the sort action toggles sort order between ascending (A-Z) and descending (Z-A) and updates category card ordering accordingly. |
| iOS | Objective (`ACC-03`) | Tapping the sort action toggles sort order between ascending (A-Z) and descending (Z-A) and updates category card ordering accordingly. |
| All | Objective (`ACC-04`) | Switching between Expenses and Income tabs maintains the active sort order. |
| All | Subjective (`ACC-05`) | Reviewer verifies icon arrow clearly reflects ascending/descending state and cards animate or reorder cleanly without layout shift. |

---

## 4. Deliverables

- **D-01 (`app/category-settings.tsx`):**
  - Add `sortOrder` state and `toggleSortOrder` function.
  - Compute `sortedCategories` and update `ScrollView` map source.
  - Add `<Appbar.Action>` to `Appbar.Header`.

---

## 5. Glossary

- **`sort-alphabetical-ascending`:** MaterialCommunityIcons icon showing A-Z with an arrow down.
- **`sort-alphabetical-descending`:** MaterialCommunityIcons icon showing Z-A with an arrow up.
- **`CategorySettings`:** Screen component allowing users to add, view, and delete custom categories.

---

## 6. References

- `specs/15-theme-contrast-category-settings.md`
- `specs/46-transaction-category-persistence.md`
