# SPEC-22: Settings — Export/Import JSON Cross-Platform Compatibility

| Field | Value |
|-------|-------|
| **ID** | SPEC-22 |
| **Title** | Settings — Export/Import JSON Cross-Platform Compatibility |
| **Status** | FINAL |
| **Owner** | @rcluc |
| **Version** | 1.0 |
| **Scope** | `app/(tabs)/settings.tsx`, `utils/db.ts` |
| **Non-goals** | No changes to cloud sync, no changes to local storage schema, no changes to passcode/security |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

The Settings screen has "Export Data (JSON)" and "Import Data (JSON)" buttons. Currently:

- **Export** (`handleExportJSON`): Uses `expo-file-system` + `expo-sharing` — **only works on mobile**, crashes/does nothing on web.
- **Import** (`handleImportJSON`): Uses `expo-document-picker` + `expo-file-system` — **only works on mobile**, crashes/does nothing on web.
- **Data structure**: `exportData()` in `utils/db.ts` returns JSON string with `profile`, `settings`, `categories`, `transactions`, `dues`, `savingsItems`. `importData()` parses and overwrites local AsyncStorage.

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | **MUST** work on Android, iOS, and Web (Expo SDK 57). |
| **CON-02** | **MUST** use platform detection: `Platform.OS === "web"` vs `Platform.OS !== "web"`. |
| **CON-03** | **MUST NOT** change the JSON data structure exported/imported by `utils/db.ts`. |
| **CON-04** | **MUST** use existing `showMessage` dialog (success/error) for user feedback instead of `alert()`. |
| **CON-05** | **MUST** validate imported JSON structure before overwriting local data. |
| **CON-06** | **MUST** keep existing mobile implementation intact (expo-file-system, expo-sharing, expo-document-picker). |
| **CON-07** | **MUST** use semantic theme colors — no hardcoded hex. |

---

## Goal

### Interaction Matrix

| User Action | Current Behavior | New Behavior |
|-------------|------------------|--------------|
| **Web: Click Export** | Crashes/does nothing | Creates `Blob` from JSON, triggers `<a download>` click, downloads `wisewallet_backup_<timestamp>.json` |
| **Mobile: Click Export** | Works (file saved + share sheet) | Unchanged |
| **Web: Click Import** | Crashes/does nothing | Opens hidden `<input type="file" accept=".json">`, reads via `FileReader`, validates, imports |
| **Mobile: Click Import** | Works (document picker) | Unchanged |
| **Import invalid JSON** | Alerts "Import failed" | Shows error toast/dialog: "Invalid backup file. Please select a valid WiseWallet backup." |
| **Import valid JSON** | Alerts success | Shows success dialog: "Data imported successfully! Please restart the app to see changes." |

### Decisions

| ID | Decision |
|----|----------|
| **DEC-01** | Export on web: `Blob` + `URL.createObjectURL()` + `<a href download>` click pattern. |
| **DEC-02** | Import on web: Hidden `<input type="file" accept=".json">` rendered in DOM, programmatically clicked, `onChange` reads via `FileReader`. |
| **DEC-03** | Validation: Check that parsed JSON has at least `profile` or `transactions` or `categories` keys (known structure). |
| **DEC-04** | Use existing `showMessage` dialog for success/error feedback (already defined in settings.tsx). |
| **DEC-05** | Keep mobile code paths exactly as-is — only wrap in `Platform.OS !== "web"` guards. |
| **DEC-06** | Timestamp in filename: `wisewallet_backup_YYYYMMDD_HHmmss.json` for readability. |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | Web: Export button downloads valid `.json` file with correct structure. | Objective |
| **ACC-02** | Web: Import button opens file picker, accepts `.json`, imports on valid file. | Objective |
| **ACC-03** | Mobile: Export/Import unchanged (expo-file-system + sharing + document-picker). | Objective |
| **ACC-04** | Import validates JSON structure — rejects files missing expected keys. | Objective |
| **ACC-05** | Success/error feedback uses `showMessage` dialog (not `alert`). | Objective |
| **ACC-06** | Lint clean, TypeScript clean. | Objective |
| **ACC-07** | Reviewer confirms on Web (Chrome/Firefox/Safari), Android, iOS. | Subjective |

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | Refactor `handleExportJSON` in `settings.tsx`: split into `exportJSONWeb()` and `exportJSONMobile()`, call based on `Platform.OS`. |
| **D-02** | `exportJSONWeb()`: call `exportData()`, create `Blob`, create object URL, create `<a>` with `download="wisewallet_backup_<timestamp>.json"`, click, revoke URL, show success message. |
| **D-03** | `exportJSONMobile()`: keep existing `expo-file-system` + `expo-sharing` logic. |
| **D-04** | Refactor `handleImportJSON` in `settings.tsx`: split into `importJSONWeb()` and `importJSONMobile()`. |
| **D-05** | `importJSONWeb()`: render hidden `<input type="file" accept=".json" style={{display:"none"}} ref={fileInputRef} onChange={handleFileChange} />`, programmatically click, `FileReader` reads text, validate, call `importData()`, show success/error. |
| **D-06** | `importJSONMobile()`: keep existing `expo-document-picker` + `expo-file-system` logic. |
| **D-07** | Add validation function `isValidWiseWalletBackup(json)` checking for expected keys (`profile`, `transactions`, `categories`, `dues`, `savingsItems`, `settings`). |
| **D-08** | Replace `alert()` calls with `showMessage("success"|"error", ...)`. |
| **D-09** | Add `useRef` for hidden file input on web. |

---

## Glossary

| Term | Definition |
|------|------------|
| **Blob** | Binary Large Object — web API for file-like data. |
| **FileReader** | Web API to read file contents asynchronously. |
| **Object URL** | `URL.createObjectURL(blob)` — temporary URL for blob download. |

---

## References

- `app/(tabs)/settings.tsx` lines 694-721 (current export/import handlers)
- `utils/db.ts` lines 295-375 (`exportData`, `importData`)
- `expo-sharing`, `expo-file-system`, `expo-document-picker` (mobile implementations)
- Web File API: https://developer.mozilla.org/en-US/docs/Web/API/File_API