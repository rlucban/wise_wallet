# SPEC-19: Reports Screen — Dark Mode Contrast & Background Fixes

| Field | Value |
|-------|-------|
| **ID** | SPEC-19 |
| **Title** | Reports Screen — Dark Mode Contrast & Background Fixes |
| **Status** | FINAL |
| **Owner** | @rcluc |
| **Version** | 1.0 |
| **Scope** | `app/(tabs)/reports.tsx`, `components/MonthlyTrendChart.tsx`, `components/DonutChart.tsx` |
| **Non-goals** | No changes to chart logic, data computation, or export functionality |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

The Reports screen (`app/(tabs)/reports.tsx`) displays financial summaries with three summary cards, a monthly bar chart, a donut chart, and category breakdowns. Currently:

- **Hardcoded white backgrounds** (`#fff`, `#FFFFFF`, `#F1F5F9`, `#FEE2E2`, `#DCFCE7`, `#DBEAFE`, `#FEF2F2`, `#F0FDF4`) used throughout
- **Hardcoded text colors** (`#1E293B`, `#94A3B8`, `#DC2626`, `#16A34A`, `#1E3A8A`) not adapting to dark mode
- **Menu dropdown** uses white background with blue text, invisible in dark mode
- **Charts** already use `theme.colors.*` internally (good), but receive hardcoded `textColor="#1E293B"` and `mutedColor="#94A3B8"` props
- **CARD_SHADOW** uses hardcoded `#000` shadows

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | **MUST** work on Android, iOS, and Web (Expo SDK 57). |
| **CON-02** | **MUST** use `theme.colors.*` semantic tokens only — no hardcoded hex colors. |
| **CON-03** | **MUST NOT** change chart component logic or data computation. |
| **CON-04** | **MUST** pass appropriate theme colors to chart components via props. |
| **CON-05** | **MUST** keep existing layout/spacing — only color/background changes. |

---

## Goal

### Mapping of Hardcoded → Semantic Colors

| UI Element | Current Hardcoded | New Semantic Token |
|------------|-------------------|-------------------|
| Screen background | `theme.colors.background` ✓ | `theme.colors.background` |
| Summary cards (3) | `#fff` | `theme.colors.surface` |
| Card icon backgrounds | `#FEE2E2`/`#DCFCE7`/`#DBEAFE` | `theme.colors.errorContainer`/`successContainer`/`primaryContainer` |
| Card label text | `#94A3B8` | `theme.colors.onSurfaceVariant` |
| Card amount text | `#DC2626`/`#16A34A`/`#1E3A8A` | `theme.colors.error`/`success`/`primary` |
| Chart containers | `#fff` | `theme.colors.surface` |
| Chart titles | `#1E293B` | `theme.colors.onSurface` |
| Date banner | `#1E3A8A` | `theme.colors.primaryContainer` |
| Date banner text | `#FFFFFF` | `theme.colors.onPrimaryContainer` |
| Menu dropdown | `#FFFFFF` bg, `#1E3A8A` text | `theme.colors.surface`, `theme.colors.primary` |
| Breakdown cards | `#fff` | `theme.colors.surface` |
| Breakdown headers | `#1E293B` | `theme.colors.onSurface` |
| Breakdown category names | `#1E293B` | `theme.colors.onSurface` |
| Progress bar backgrounds | `#FEE2E2`/`#DCFCE7` | `theme.colors.errorContainer`/`successContainer` |
| Export card | `#fff` | `theme.colors.surface` |
| Export buttons | `#F1F5F9` | `theme.colors.surfaceVariant` |
| Export icons/text | `#1E3A8A`/`#DC2626` | `theme.colors.primary`/`error` |
| DonutChart `textColor` | `#1E293B` | `theme.colors.onSurface` |
| DonutChart `mutedColor` | `#94A3B8` | `theme.colors.onSurfaceVariant` |
| CARD_SHADOW | `#000` | `theme.colors.shadow` (or remove — Paper cards have elevation) |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | No hardcoded hex colors remain in `reports.tsx` (except chart segment colors from constants). | Objective |
| **ACC-02** | All card backgrounds use `theme.colors.surface` (or `surfaceVariant`/`*Container` for accent areas). | Objective |
| **ACC-03** | All text uses `theme.colors.onSurface`, `onSurfaceVariant`, `onPrimaryContainer`, `primary`, `error`, `success`. | Objective |
| **ACC-04** | Menu dropdown visible and styled correctly in both light/dark modes. | Subjective (reviewer) |
| **ACC-05** | Charts readable in dark mode: axis labels, gridlines, legends, center text. | Subjective (reviewer) |
| **ACC-06** | Date banner uses primaryContainer/onPrimaryContainer. | Objective |
| **ACC-07** | Lint clean, TypeScript clean. | Objective |

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | Replace all `backgroundColor: "#fff"` / `#FFFFFF` with `theme.colors.surface` in `reports.tsx`. |
| **D-02** | Replace icon background colors with `theme.colors.errorContainer`, `successContainer`, `primaryContainer`. |
| **D-03** | Replace all text color hardcodes with semantic `theme.colors.*`. |
| **D-04** | Update Menu dropdown: `backgroundColor: theme.colors.surface`, text `theme.colors.primary`, border `theme.colors.outline`. |
| **D-05** | Update date banner: `backgroundColor: theme.colors.primaryContainer`, text/icons `theme.colors.onPrimaryContainer`. |
| **D-06** | Update chart container cards: `theme.colors.surface`, titles `theme.colors.onSurface`. |
| **D-07** | Update breakdown cards: headers `theme.colors.onSurface`, category names `theme.colors.onSurface`, progress backgrounds `theme.colors.errorContainer`/`successContainer`, amounts `theme.colors.error`/`success`, percentages `theme.colors.onSurfaceVariant`. |
| **D-08** | Update export card: `theme.colors.surface`, button backgrounds `theme.colors.surfaceVariant`, icons/text `theme.colors.primary`/`error`. |
| **D-09** | Pass `textColor={theme.colors.onSurface}` and `mutedColor={theme.colors.onSurfaceVariant}` to `DonutChart`. |
| **D-10** | Update `CARD_SHADOW` to use `theme.colors.shadow` or remove (rely on Paper elevation). |
| **D-11** | Verify `MonthlyTrendChart` and `DonutChart` render correctly with new props (no chart logic changes). |
| **D-12** | Test on Android, iOS, Web in both light and dark modes. |

---

## Glossary

| Term | Definition |
|------|------------|
| **Semantic Token** | Theme color from `theme.colors.*` that adapts to light/dark mode. |
| **Surface** | `theme.colors.surface` — main card/container background. |
| **SurfaceVariant** | `theme.colors.surfaceVariant` — secondary container background. |
| **\*Container** | `primaryContainer`, `errorContainer`, `successContainer` — tonal containers for accent colors. |
| **On\*** | `onSurface`, `onSurfaceVariant`, `onPrimaryContainer` — text/icon colors for corresponding backgrounds. |

---

## References

- `app/(tabs)/reports.tsx` (current implementation)
- `components/MonthlyTrendChart.tsx` (uses `theme.colors.*` internally ✓)
- `components/DonutChart.tsx` (accepts `textColor`/`mutedColor` props)
- Material 3 color system: https://m3.material.io/styles/color/the-color-system/color-roles