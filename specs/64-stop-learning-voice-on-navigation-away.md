# Spec 64: Stop Learning Read-Aloud on Navigation Away

| Field | Value |
|---|---|
| ID | SPEC-64 |
| Title | Stop Learning Read-Aloud on Navigation Away |
| Status | **FINAL** (2026-10-08 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | Stop `expo-speech` read-aloud and reset its playing UI when either Financial Literacy screen loses navigation focus. |
| Non-goals | Changing voice selection, spoken text, rate, pitch, controls, copy, navigation routes, or other speech surfaces. Scrolling within a Learning screen does not count as leaving it. |
| Normative source | This file. |

> RFC 2119 keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** express
> normative requirements below are active because this spec is FINAL.

## 1. Context

Both `app/(tabs)/learning.tsx` and `app/(tabs)/learning-detail.tsx` stop speech
from a `useEffect` unmount cleanup. Expo Router can keep a screen mounted after
it loses focus, so navigating to another route or tab may leave read-aloud
playing. The desired behavior is to stop playback as soon as the user leaves
either Learning screen, including when a screen remains mounted underneath
another route.

## 2. Constraints

- **CON-01 — Focus lifecycle.** Both Learning surfaces MUST stop `expo-speech`
  when their route loses focus, not only when the component unmounts. The
  implementation MUST use the existing Expo Router focus lifecycle pattern.
- **CON-02 — UI reset.** On loss of focus, `learning.tsx` MUST clear
  `activeArticleId`, and `learning-detail.tsx` MUST set `isPlaying` to `false`.
  Returning to the screen MUST show its idle play state.
- **CON-03 — Scope.** Playback MUST continue while the user stays on the same
  Learning route, including scrolling its content. Existing play/stop controls,
  voice configuration, spoken content, labels, and routes MUST remain unchanged.
- **CON-04 — Platform and project invariants.** The change MUST work on Android,
  iOS, and Web; add no dependency; change no storage/API/native contract; remain
  Expo Go-safe and Vercel-exportable.
- **CON-05 — Verification.** Jest MUST include a focused regression guard
  parameterized for `Platform.OS` (`android`, `ios`, `web`). The user-run manual
  matrix MUST check route blur and idle UI in Expo Go and a web export.

## 3. Goal

| Platform | Objective (machine-checkable) | Subjective (reviewer check) |
|---|---|---|
| Android | **ACC-01:** The focused regression test passes with `Platform.OS = "android"`; both Learning screens register focus-loss cleanup that stops speech and resets their playing state. | **ACC-S01:** In Expo Go, start read-aloud on each Learning screen, navigate to another screen/tab, and confirm speech stops and the play control returns to idle. Scroll without navigating and confirm speech continues. |
| iOS | **ACC-02:** The focused regression test passes with `Platform.OS = "ios"` and asserts the same lifecycle behavior. | **ACC-S02:** Repeat ACC-S01 on iOS Expo Go; confirm no red-box or stuck playing indicator. |
| Web | **ACC-03:** The focused regression test passes with `Platform.OS = "web"` and asserts the same lifecycle behavior. | **ACC-S03:** After `expo export --platform web`, start read-aloud on each Learning screen, navigate away, and confirm speech stops and the play control returns to idle. |

Resolved decisions (FINAL per user call 2026-10-08):

- **DEC-01:** “Leave the page” means route blur caused by navigation, including tab
  changes and pushing another route; it does not mean scrolling within the page.
- **DEC-02:** Both the Recommended Reading list and article detail are in scope.

### Acceptance criteria — Objective (machine-checkable)

- **ACC-01..03:** `utils/learningSpeechLifecycle.test.ts` MUST verify that each
  screen uses the focus lifecycle cleanup to call `Speech.stop()` and reset its
  playing state. The test MUST be parameterized by `Platform.OS` for Android,
  iOS, and Web.

### Acceptance criteria — Subjective (reviewer-judged)

- **ACC-S01..S03:** Follow the per-platform steps in the Goal matrix. Pass only
  if voice stops promptly after navigation, the screen shows its idle play
  state when revisited, and playback is unaffected by scrolling on the same
  screen.

## 4. Deliverables

- **D-01:** Update `app/(tabs)/learning.tsx` and
  `app/(tabs)/learning-detail.tsx` to stop speech and reset playback state on
  route blur, using Expo Router's focus lifecycle. Preserve all current voice,
  content, controls, and copy behavior.
- **D-02:** Add `utils/learningSpeechLifecycle.test.ts` covering ACC-01..03 for
  Android, iOS, and Web.
- **D-03:** Update `docs/savepoint.md` and append a Current status entry to
  `AGENTS.md` after implementation and verification.

## 5. Glossary

- **Route blur:** The Learning route is no longer the active focused route,
  whether or not its component remains mounted.
- **Read-aloud:** Speech started by the play control on the Learning list or
  article detail screen.

## 6. References

- `app/(tabs)/learning.tsx`
- `app/(tabs)/learning-detail.tsx`
- `specs/11-female-tts-voice-for-recommended-reading.md`
- `AGENTS.md` sections 1.1, 1.8, 1.10, and 1.11–1.14
