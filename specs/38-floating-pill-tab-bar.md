# Spec 38: Floating Pill Bottom Navigation Bar & Action Button

| Field | Value |
|---|---|
| ID | SPEC-38 |
| Title | Floating Pill Bottom Navigation Bar & Action Button |
| Status | **FINAL** (2026-10-04 per user call "i choose Option 1 code this for me , and stick mo yung color non pag pinipindot") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx` |
| Non-goals | Changing tab routes, removing existing screens, or modifying screen-level business logic |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

---

## 1. Context

### 1.1 Problem

Currently, the bottom tab bar is a standard edge-to-edge full-width bar attached to the bottom edge of the viewport. On the Dashboard (`app/(tabs)/index.tsx`), a separate floating action button (`FAB` "+ Transaction") floats on the bottom right.

The user requested a modern **Floating Pill Capsule Navigation Bar** matching the provided reference design:
1. A floating capsule/pill container holding the navigation tabs (`Home`, `Reports`, `Learning`, `Settings`), elevated with rounded edges and soft shadow.
2. An active tab highlight pill indicator that "sticks" to WiseWallet's brand colors when pressed/focused (`theme.colors.primaryContainer` pill background, `theme.colors.primary` icon and text).
3. A detached circular floating `+` action button positioned directly to the right of the navigation pill, which routes to `/add-transaction`.
4. Removal of the redundant bottom-right FAB on the Dashboard to avoid visual duplication.

---

## 2. Constraints

- **CON-01 (Floating Pill Container):** The tab navigation bar MUST float above the bottom viewport edge (using bottom margin/offset considering safe-area insets). It MUST feature capsule border radius (`borderRadius: 36`), surface background, and subtle shadow/elevation across Android, iOS, and Web.
- **CON-02 (Brand Color Sticking for Active Tab):** The active tab MUST display a rounded pill highlight container using `theme.colors.primaryContainer` (or soft primary tint). The active icon and label MUST stick to WiseWallet's theme primary color (`theme.colors.primary`). Inactive tabs MUST use `theme.colors.outline` / `theme.colors.onSurfaceVariant`.
- **CON-03 (Detached Circular Action Button):** A circular floating button (`width: 56`, `height: 56`, `borderRadius: 28`) MUST be positioned adjacent to the floating navigation pill. On press, it MUST navigate to `/add-transaction`.
- **CON-04 (De-duplicate FAB on Dashboard):** The standalone `FAB` in `app/(tabs)/index.tsx` MUST be removed so that transaction creation is exclusively handled by the detached circular `+` button in the navigation bar.
- **CON-05 (All Four Tabs Preserved):** The four main tabs (`Home`, `Reports`, `Learning`, `Settings`) MUST remain present, functional, and navigate to their respective screens. Hidden routes (`learning-detail` with `href: null`) MUST NOT appear in the tab bar.
- **CON-06 (SPEC-32 Unit Test Parity):** All source assertions in `utils/tabBarMetrics.test.ts` (tab titles, icon names, metric helpers, theme values) MUST continue to pass without regressions.
- **CON-07 (Cross-Platform Parity):** The floating layout MUST render cleanly and responsively on Android, iOS, and Web without clipping or layout breaking.

---

## 3. Goal & Acceptance Criteria

### 3.1 Interaction Matrix

| Element | Interaction | Visual Behavior | Resulting Action |
|---|---|---|---|
| Tab Item (Inactive) | Idle | Transparent item background, outline color icon/text | - |
| Tab Item | Tap | Changes active index, shows `primaryContainer` pill background, `primary` icon/text | Navigates to selected tab screen |
| Circular `+` Button | Tap | Ripple / opacity feedback | Navigates to `/add-transaction` |

### 3.2 Acceptance Criteria

- **ACC-01 (Objective):** In `app/(tabs)/_layout.tsx`, `<Tabs>` renders a custom floating tab bar component (`tabBar={(props) => <FloatingTabBar {...props} />}`).
- **ACC-02 (Objective):** The floating tab bar contains a pill container for tabs and an adjacent circular button with a plus icon.
- **ACC-03 (Objective):** The active tab displays a pill highlight background with `theme.colors.primary` icon and label color.
- **ACC-04 (Objective):** Tapping the circular `+` button triggers `router.push("/add-transaction")`.
- **ACC-05 (Objective):** In `app/(tabs)/index.tsx`, the inline `<FAB label="Transaction" ... />` is removed to prevent UI duplication.
- **ACC-06 (Objective):** `utils/tabBarMetrics.test.ts` passes all tests.
- **ACC-07 (Subjective):** Reviewer visually confirms the bottom navigation matches the floating pill and circular plus button design aesthetic.

---

## 4. Platform Matrix

| Platform | Objective Checks (`ACC-01..06`) | Subjective Checks (`ACC-07`) |
|---|---|---|
| **Android** | Floating pill renders, elevation works, active tab highlights | Pill floats cleanly above navigation bar |
| **iOS** | Floating pill renders, safe-area insets respected | Pill floats cleanly above home indicator |
| **Web** | Floating pill renders with `boxShadow`, centered container | Responsive layout on mobile and desktop web |

---

## 5. Deliverables

- **D-01 (`app/(tabs)/_layout.tsx`):** Implement `FloatingTabBar` component with floating capsule container, active pill highlight with brand theme color, and detached circular `+` action button.
- **D-02 (`app/(tabs)/index.tsx`):** Remove redundant standalone FAB from Dashboard.

---

## 6. Glossary

- **Floating Pill Bar:** A bottom navigation bar styled as an elevated capsule detached from viewport boundaries.
- **Detached Circular Button:** A circular floating action button placed adjacent to the floating navigation capsule.
