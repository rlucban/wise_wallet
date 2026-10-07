# SPEC-70: Theme Hydration and Dark-Mode Canvas

| Field | Value |
|---|---|
| ID | SPEC-70 |
| Title | Prevent account-theme flash and keep the app canvas themed |
| Status | **FINAL v1.0** (user approved "FINAL" 2026-10-07) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/_layout.tsx` theme/profile loading gate + root canvas background; `utils/themeStartup.test.ts` |
| Non-goals | Changing saved theme values, system theme behavior while signed out, theme toggle behavior, splash assets/configuration, tab-bar layout/colors, login/authentication flow, routes, dependencies |
| Normative source | This file. Implement exactly the approved D-* items. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are interpreted as described in RFC 2119.

## 1. Context

### 1.1 Problem

On login, the UI can briefly use the device's system dark-mode value before the account profile containing the user's saved `isDarkMode` value finishes loading. The custom floating tab bar has a transparent outer wrapper, while the root `MainLayout` view has no background color; the bottom canvas can therefore expose the Web/native host's default white background in dark mode.

### 1.2 Local evidence

- `context/ThemeContext.tsx`: when `profile` is `null`, `isDarkMode` falls back to `useColorScheme()`; after profile load it switches to `profile.isDarkMode`.
- `app/_layout.tsx`: `MainLayout` receives `profileLoading` and `profile`, but renders the app stack without waiting for a logged-in profile to hydrate. Its full-screen wrapper currently has only `flex: 1`.
- `components/FloatingTabBar.tsx`: outer wrapper is transparent by design, so the screen/root canvas shows through its gutters.
- `specs/53-floating-pill-tab-bar.md` §5.2 DEC-10 requires that transparent wrapper and remains unchanged; this spec supplies the root canvas it relies on.

## 2. Constraints

- **CON-01 — Bare minimum (§1.11).** Only D-01 and D-02 files MAY change.
- **CON-02 — Preserve theme semantics.** Persisted `profile.isDarkMode`, the signed-out system-scheme fallback, and the existing theme toggle MUST remain unchanged.
- **CON-03 — Hydration gate.** When `activeUserId` exists and the account profile is not loaded (`profileLoading` or `profile === null`), authenticated route content MUST NOT render until the profile theme is available. Once loaded, the route tree MUST render with that profile's theme on its first visible frame. Signed-out routing MUST remain unchanged.
- **CON-04 — Root canvas.** The full-screen `MainLayout` canvas MUST use `theme.colors.background`, including behind the in-flow custom tab bar and bottom safe-area region. SPEC-53's transparent tab-bar wrapper and pill tokens MUST remain unchanged.
- **CON-05 — Cross-platform.** Android, iOS, and Web MUST retain their existing auth/theme behavior; no platform-only import or new dependency.
- **CON-06 — TDD.** Jest guards MUST run under mocked `Platform.OS` values Android/iOS/Web. Native/Web visual verification remains user-run.

## 3. Goal

### 3.1 Decisions (FINAL v1.0)

- **DEC-01:** In `MainLayout`, gate the route stack and passcode surface while an authenticated user's profile is unresolved. Render a full-screen loading surface instead; do not change auth actions, redirects, or profile fetch behavior.
- **DEC-02:** Give the full-screen `MainLayout` wrapper `backgroundColor: theme.colors.background`; keep `FloatingTabBar` transparent so this themed canvas fills its backdrop.

### 3.2 Platform matrix

| Platform | Objective checks | Subjective reviewer checks |
|---|---|---|
| Android | ACC-01..ACC-04 run with `Platform.OS="android"` | ACC-S01: On login with light and dark saved profiles, no account screen appears in the wrong theme during profile loading; bottom area matches the active screen background in Expo Go. |
| iOS | ACC-01..ACC-04 run with `Platform.OS="ios"` | ACC-S01: Same observation in Expo Go on iPhone, including the bottom safe-area region. |
| Web | ACC-01..ACC-04 run with `Platform.OS="web"` | ACC-S02: Login to light and dark profiles; no wrong-theme route flash and no white band below the dark Settings screen/tab bar. |

### 3.3 Acceptance criteria

| ID | Objective check |
|---|---|
| ACC-01 | `MainLayout` gates authenticated routes while `profileLoading || !profile` for an active user; signed-out flow is not gated. |
| ACC-02 | The route tree is rendered only after the profile theme is ready, so it uses the saved account theme on its first visible render. |
| ACC-03 | The full-screen MainLayout root has `backgroundColor: theme.colors.background`; FloatingTabBar remains transparent and SPEC-53 source guards remain valid. |
| ACC-04 | Focused Jest tests, full Jest, lint, and TypeScript pass (user-run per AGENTS §1.3). |

Subjective:

- **ACC-S01:** Android/iOS login to both light and dark accounts; reviewer confirms authenticated content never flashes in the device's other theme and the bottom safe-area canvas is not white in dark mode.
- **ACC-S02:** Web login to both light and dark accounts; reviewer confirms no wrong-theme route flash and no white strip below the tab bar.

### 3.4 Deliverables

- **D-01 (`app/_layout.tsx`):** Implement DEC-01/DEC-02 only.
- **D-02 (`utils/themeStartup.test.ts`):** Add cross-platform source guards for ACC-01..ACC-03.
- **D-03 (journal):** Update `docs/savepoint.md` and `AGENTS.md` §3 after approval and implementation.

## Glossary

- **Profile hydration:** Loading the active account's persisted `UserProfile`, including `isDarkMode`.
- **Wrong-theme flash:** Authenticated route content becoming visible under a system/default theme before the account's saved theme is applied.
- **Root canvas:** The full-screen app background behind route content, tab bar, and safe-area gutters.

## References

- `app/_layout.tsx` (`MainLayout`)
- `context/ThemeContext.tsx` (`profile.isDarkMode` / system-scheme fallback)
- `context/UserProfileContext.tsx` (profile loading lifecycle)
- `components/FloatingTabBar.tsx` (transparent outer wrapper)
- `specs/53-floating-pill-tab-bar.md` §5.2 DEC-10 (transparent wrapper retained)
- `AGENTS.md` §1.1, §1.3, §1.9, §1.10, §1.11, §1.13, §1.14
