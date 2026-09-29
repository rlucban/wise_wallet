# Spec 33: Remove "(JSON)" Label from Settings Export & Import Buttons

| Field | Value |
|---|---|
| ID | SPEC-33 |
| Title | Remove "(JSON)" Label from Settings Export & Import Buttons |
| Status | **FINAL** (2026-09-30 per user call "code this for me") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/settings.tsx` |
| Non-goals | Changing export/import formats, file extensions, logic, or dependencies |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

---

## 1. Context

### 1.1 Problem

In `app/(tabs)/settings.tsx` under the **Data Management** section, the export and import buttons currently display technical format details in their visible labels:
- `"Export Data (JSON)"`
- `"Import Data (JSON)"`

The user explicitly requested to simplify the visible button text by removing the word `JSON`:
- `"Export Data (JSON)"` MUST become `"Export Data"`
- `"Import Data (JSON)"` MUST become `"Import Data"`

---

## 2. Constraints

- **CON-01 (Label Simplicity):** The button labels in `app/(tabs)/settings.tsx` MUST be updated to `"Export Data"` and `"Import Data"`. The substring `(JSON)` MUST NOT appear in the button labels.
- **CON-02 (Logic Preservation):** Underlying export and import functionality (`handleExportJSON`, `handleImportJSON`, web/mobile file handlers, JSON format validation) MUST remain completely unchanged.
- **CON-03 (Cross-Platform Parity):** The UI change MUST apply identically across Android, iOS, and Web.
- **CON-04 (No New Dependencies):** Zero native dependencies or external packages may be added.

---

## 3. Goal & Acceptance Criteria

### 3.1 Interaction Matrix

| Surface | Current Label | New Label | Action Behavior |
|---|---|---|---|
| `app/(tabs)/settings.tsx` (Export) | `Export Data (JSON)` | `Export Data` | Triggers `handleExportJSON` (unchanged) |
| `app/(tabs)/settings.tsx` (Import) | `Import Data (JSON)` | `Import Data` | Triggers `handleImportJSON` (unchanged) |

### 3.2 Acceptance Criteria

- **ACC-01 (Objective):** In `app/(tabs)/settings.tsx`, the export button child text is `"Export Data"`.
- **ACC-02 (Objective):** In `app/(tabs)/settings.tsx`, the import button child text is `"Import Data"`.
- **ACC-03 (Objective):** Clicking either button triggers the respective backup download/share or document picker without regression.
- **ACC-04 (Subjective):** Reviewer visually confirms in Settings under Data Management that only "Export Data" and "Import Data" are displayed without "(JSON)".

---

## 4. Platform Matrix

| Platform | Objective Checks (`ACC-01..03`) | Subjective Checks (`ACC-04`) |
|---|---|---|
| **Android** | Button text matches; export/import functional | Clean button UI without `(JSON)` |
| **iOS** | Button text matches; export/import functional | Clean button UI without `(JSON)` |
| **Web** | Button text matches; export/import functional | Matches web screenshot requirement |

---

## 5. Deliverables

- **D-01 (`app/(tabs)/settings.tsx`):** Update the button labels from `"Export Data (JSON)"` and `"Import Data (JSON)"` to `"Export Data"` and `"Import Data"`.

---

## 6. Glossary

- **Data Management:** Settings screen section containing backup, sync status, export, import, and data wipe actions.
