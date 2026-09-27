# Spec 11: Female Text-to-Speech Voice for Financial Literacy Read-Aloud

| Field | Value |
|---|---|
| ID | SPEC-11 |
| Title | Female Text-to-Speech Voice for Financial Literacy Read-Aloud |
| Status | **FINAL** (2026-09-26 per user call — "finalize and implement") |
| Owner | User (final authority) |
| Version | 1.0 — initial final |
| Scope | `expo-speech` voice selection + pitch for the Financial Literacy read-aloud (Recommended Reading cards and article detail) |
| Non-goals | New voice/gender UI or Settings picker; bundled audio files or cloud TTS; changing read-aloud text, rate, language, or copy; `expo-speech` upgrade; any other TTS surface (there is none today) |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> Terminology below uses RFC 2119 keywords: **MUST**, **MUST NOT**, **SHOULD**,
> **MAY**. Informative prose (examples, "today", "currently") is non-normative
> unless restated as a requirement.

## 1. Context

### 1.1 Problem

`expo-speech@57.0.3` exposes **no gender field on any platform**. The `Voice`
type is `{ identifier, name, quality, language }` only
(`node_modules/expo-speech/src/Speech.types.ts:84-101`):

- **iOS** — the native `AVSpeechSynthesisVoice.gender` exists but is dropped by
  the module (`ios/SpeechModule.swift:63-76`).
- **Android** — `VoiceRecord` has no gender field
  (`android/.../VoiceRecord.kt:14-19`); `identifier` is set to `it.name`.
- **Web** — `WebVoice` is built from the Web Speech API
  `SpeechSynthesisVoice`, which has no gender property
  (`src/ExponentSpeech.web.ts:108-119`); `identifier === voiceURI`.

Therefore "use a female voice" **cannot** be implemented as gender detection. It
MUST be implemented as **curated name/identifier matching** over
`getAvailableVoicesAsync()`, with pitch as the secondary lever, and with a
silent, non-blocking fallback (see CON-03).

### 1.2 Current state (non-normative)

Both Financial Literacy surfaces call `Speech.speak()` directly with ad-hoc,
inconsistent options:

- `app/(tabs)/learning.tsx:50-56` — Recommended Reading cards:
  `{ language: "en-US", pitch: 1.0, rate: 0.9 }`, spoken text is
  `` `${article.title}. ${article.description}` ``, with a
  `Speech.isSpeakingAsync()` toggle-to-stop and `Speech.stop()` unmount cleanup
  (`learning.tsx:25-27, 41-57`).
- `app/(tabs)/learning-detail.tsx:121-126` — full-article read-aloud:
  `{ language: "en-US", rate: 0.9 }` (**no `pitch`**), plus a stop button at
  `learning-detail.tsx:175`.

No `voice` is ever passed today, so every platform uses its system default
voice for `en-US`, which is frequently male.

### 1.3 Platform risk register (why the constraints below exist)

| Risk | Platform | Source | Consequence |
|---|---|---|---|
| Invalid voice **throws** | iOS | `ios/SpeechModule.swift:36-42` (`InvalidVoiceException`) | `Speech.speak()` does not await/catch (`src/Speech.ts:105-110`) → **unhandled rejection, silent no-audio** |
| Voice miss falls back **silently** | Android | `android/.../SpeechModule.kt:125-129` (`firstOrNull`) | speaks with the default voice, no error surfaced |
| Voice miss falls back to `voices[0]` | Web | `src/ExponentSpeech.web.ts:65-78` (`Math.max(0, findIndex(...))`) | an unintended, possibly male, voice |
| `getVoices()` can **hang forever** | Web | `src/ExponentSpeech.web.ts:9-25` (resolves only on `voiceschanged`) | awaiting it before speaking would hang read-aloud |
| `getVoices()` resolves `[]` when TTS failed | Android | `android/.../SpeechModule.kt:51` | no female voice available |

`expo-speech` is safe to import in Expo Go (unlike `expo-notifications` on
SDK 53+), so the existing top-level `import * as Speech from "expo-speech"` in
both screens is not a CON-07 violation and MAY stay.

## 2. Constraints (normative)

- **CON-01 — Gender is inferred, never detected.** The implementation MUST NOT
  claim or attempt true gender detection. "Female voice" MUST be defined as: a
  voice from `getAvailableVoicesAsync()` whose `name` or `identifier` matches
  the curated markers in CON-02, within an English locale. If no such voice
  exists, the app MUST fall back per CON-03 and MUST NOT surface any error,
  notice, dialog, toast, or disabled control.

- **CON-02 — Curated matching rules (deterministic, in this order).** Given
  `Speech.getAvailableVoicesAsync()`, the resolver MUST:
  1. Build, per voice, a lowercased haystack of `` `${name} ${identifier}` ``
     and a token set from `haystack.split(/[^a-z0-9]+/)` with empty tokens
     removed.
  2. **Language filter:** consider ONLY voices whose `language` lowercased,
     split on `[-_]`, has first segment `en` (covers `en-US`, `en_us`,
     `en-GB`). Non-English voices MUST be excluded even if a marker matches.
  3. **Tier 0 (male exclusion, checked FIRST):** drop the voice if its token
     set intersects the male set
     `{ male, man, boy, guy, tpf, fred, alex, daniel, aaron, tom, george,
     oliver, david, mark, ryan, evan, james, arthur, ricky, bruce, albert }`.
  4. **Tier 1 (explicit gender markers, substring match on the haystack):**
     `female`, `woman`, `girl`, `lady` (e.g. `Google UK English Female`,
     `en-us-x-sfg#female_1-local`).
  5. **Tier 2 (known female voice names, token match):**
     `samantha, karen, moira, tessa, fiona, victoria, serena, allison,
     catherine, hazel, zira, susan, ava, aria, jenny, michelle, nicky, libby,
     kate` (e.g. `com.apple.voice.compact.en-US.Samantha`,
     `Microsoft Zira Online (Natural) - English (United States)`).
  6. Pick the **first** match in the array order returned by the OS, after
     Tier 0 removal; tiers MUST be evaluated in order, so Tier 1 wins over
     Tier 2.

  The marker sets are normative data and MUST be exported as constants so tests
  can assert against them.

- **CON-03 — Read-aloud MUST never block or break.** The voice lookup MUST be
  capped at **2000 ms** (see DEC-02). If the lookup resolves empty, times out,
  or rejects, the implementation MUST speak with the system default voice
  (no `voice` key) at `FEMALE_TTS_PITCH`. `Speech.speak` MUST be called exactly
  once in that path. The play/stop control MUST remain enabled and its label,
  icon, and copy MUST be unchanged.

- **CON-04 — iOS throw containment.** `Speech.speak(...)` MUST be wrapped in
  `try/catch`. If it throws (e.g. a listed-but-unavailable iOS voice), the
  implementation MUST retry **exactly once** with `voice: undefined` while
  keeping `language`, `pitch`, and `rate`, and MUST NOT let any rejection
  escape unhandled. `onError` MUST be wired to reset the UI playing state on
  every call, so the icon can never get stuck in the "playing" state.

- **CON-05 — Web specifics.** The resolver MUST NOT touch `window`,
  `speechSynthesis`, or any DOM global directly; it MUST go through
  `Speech.getAvailableVoicesAsync()` only (keeps the util testable under
  jest `testEnvironment: "node"` and Vercel-safely SSR-bundled). It MUST pass
  `voice: Voice.identifier` (on web `identifier === voiceURI`, which is the
  field expo-speech matches on, `src/ExponentSpeech.web.ts:65-78`) and MUST NOT
  pass the private `_voiceIndex` option. Web MUST tolerate a hung
  `voiceschanged` per CON-03.

- **CON-06 — Android specifics.** Because `VoiceRecord.identifier === Voice.name`
  on Android (`android/.../VoiceRecord.kt:98-103`), the resolver MUST pass the
  identifier unchanged (no transformation) so `firstOrNull { it.name == voiceName }`
  matches. A native miss is an acceptable silent fallback (CON-03); the app MUST
  NOT pre-empt it with an error.

- **CON-07 — Session memoization, zero storage.** The resolver MUST call
  `getAvailableVoicesAsync()` **at most once per app session**, memoized in a
  module-level cache. It MUST NOT write to AsyncStorage, MUST NOT introduce any
  new storage key, and MUST NOT change any existing `user_{id}_*` key. An
  exported `resetSpeechVoiceCache()` MUST exist for test isolation only and MUST
  NOT be called from app code.

- **CON-08 — Standing repo invariants (AGENTS.md §1).** The implementation MUST
  add **no new dependency** and change **no native dependency version**. It MUST
  keep Android + iOS + Web working, MUST NOT crash Expo Go on import, MUST keep
  the web export Vercel-deployable (no Node-only APIs, no secrets, `EXPO_PUBLIC_*`
  only), and MUST NOT change storage keys, the `wallet-api` contract, AsyncStorage
  shapes, or navigation routes. Static `import * as Speech from "expo-speech"`
  MAY remain at file top level in both screens (§1.3).

- **CON-09 — Fixed speech parameters.** Every `Speech.speak` call originating
  from the Financial Literacy surfaces MUST pass `language: "en-US"`,
  `rate: 0.9` (preserved from today), and `pitch: 1.15`. `learning-detail.tsx`
  gains the previously-absent `pitch`. No other parameter may be introduced.

- **CON-10 — No user-facing change.** No new screen, control, icon, label, or
  copy. Specifically unchanged: the cards' `volume-high` / `square` toggle and
  `#1E3A8A` / `#DBEAFE` styling (`learning.tsx:200-213`), and the detail
  screen's `play-circle` / `pause-circle` / `stop-circle-outline` controls and
  `"Listen to Article"` / `"Reading aloud..."` strings
  (`learning-detail.tsx:161-177`). Both screens MUST keep their existing
  `Speech.stop()` unmount cleanup.

- **CON-11 — Shared path (no duplication).** Both surfaces MUST obtain their
  options from one shared util (D-01). The inline `Speech.speak(...)` option
  objects in both screens MUST be removed so the voice logic cannot drift.

## 3. Goal

| Platform | Voice list contains a female marker | Female marker absent / lookup empty / timed out |
|---|---|---|
| **Android** | speak with that exact `Voice.name` (e.g. `en-us-x-sfg#female_1-local`), `pitch 1.15`, `rate 0.9`, `en-US` | speak with system default voice (no `voice` key), `pitch 1.15`, `rate 0.9`, `en-US` — silent |
| **iOS** | speak with that `identifier` (e.g. `com.apple.voice.compact.en-US.Samantha`); if native throws, retry once without `voice` | as Android — silent |
| **Web** | speak with `voice.identifier` (=== `voiceURI`, e.g. `Samantha` on macOS/iOS Safari, `Google UK English Female` on desktop Chrome); hung `voiceschanged` capped at 2000 ms | as Android — silent |

Resolved decisions (FINAL per user call 2026-09-26):

- **DEC-01:** curated per-platform name/identifier matching **plus** raised
  pitch — not pitch-only, not a bundled audio asset or cloud TTS.
- **DEC-02:** lookup cap **2000 ms**, prefetched on screen mount so the first tap
  is normally already resolved; on timeout speak anyway at `pitch 1.15`.
- **DEC-03:** no female voice found → speak anyway, **silently** (no notice).
- **DEC-04:** scope is **both** surfaces (Recommended Reading cards **and**
  article detail read-aloud) for a consistent voice.
- **DEC-05:** voice is **hardcoded** — no Settings picker, no gender toggle, no
  user override.
- **DEC-06:** memoized **once per app session**, no AsyncStorage persistence.
- **DEC-07:** pitch **1.15** (subtle), rate **0.9** preserved.

### Acceptance criteria — Objective (machine-checkable)

Verified by `utils/speechVoice.test.ts`, parameterized by `Platform.OS`
(`android` / `ios` / `web` via `jest.mock("react-native")`), per §1.10.

- **ACC-01:** `isLikelyFemaleVoice` / the resolver's matcher returns **true** for
  `Samantha`, `com.apple.voice.compact.en-US.Samantha`,
  `Google UK English Female`, `Google UK English Male` → *false*,
  `en-us-x-sfg#female_1-local` → *true*, `en-us-x-tpf-local` → *false*,
  `Alex` → *false*, `Daniel` → *false*.
- **ACC-02:** a non-English voice whose name matches a marker (e.g.
  `{ name: "Kyoko", identifier: "ja-jp-x-…", language: "ja-JP" }`) is **never**
  selected; the en filter excludes it.
- **ACC-03 (iOS):** mocked list containing `Samantha` →
  `resolveFemaleVoice()` returns
  `{ voice: "com.apple.voice.compact.en-US.Samantha", pitch: 1.15, rate: 0.9, language: "en-US", matched: true }`.
- **ACC-04 (Android):** mocked list `[{ identifier: "en-us-x-tpf-local", name: "en-us-x-tpf-local" }, { identifier: "en-us-x-sfg#female_1-local", name: "en-us-x-sfg#female_1-local" }]`
  → resolves `"en-us-x-sfg#female_1-local"` with `matched: true` (Tier 0 removes
  the `tpf` voice first).
- **ACC-05 (Web):** mocked list `[{ identifier: "Alex", name: "Alex", language: "en-US" }]`
  → `matched: false`, `voice: undefined`, and `speakWithFemaleVoice` calls
  `Speech.speak` **exactly once** with **no** `voice` key and **no** `_voiceIndex`
  key (never `voices[0]`).
- **ACC-06:** `getAvailableVoicesAsync` rejecting **and** hanging past the
  2000 ms cap (fake timers) each still produce **exactly one** `Speech.speak`
  call with `{ language: "en-US", pitch: 1.15, rate: 0.9 }` and **no** thrown
  error.
- **ACC-07 (CON-04):** `Speech.speak` mocked to throw on the first call
  (iOS invalid-voice simulation) produces **exactly two** calls — first with
  `voice`, second without — and no unhandled rejection.
- **ACC-08 (CON-07):** two `speakWithFemaleVoice` calls trigger **exactly one**
  `getAvailableVoicesAsync` call; after `resetSpeechVoiceCache()` the next call
  queries again.
- **ACC-09 (CON-09/CON-11):** every `Speech.speak` call from the util passes
  `language: "en-US"`, `rate: 0.9`, `pitch: 1.15`; neither screen contains a
  literal `Speech.speak(` call (grep-verifiable) and both keep a `Speech.stop()`
  unmount cleanup.
- **ACC-10 (CON-07):** AsyncStorage `setItem`/`removeItem` mocks are **not**
  called during the whole suite (zero storage writes, zero new keys).

### Acceptance criteria — Subjective (reviewer checks, per §1.10)

- **ACC-11:** reviewer opens Learning in Expo Go on an **Android** device or
  emulator, taps the volume button on all 6 Recommended Reading cards, and
  confirms a **clearly female** voice each time (pass = a woman is
  identifiable on ≥5 of 6; fail = male or robotic/unrecognizable).
- **ACC-12:** reviewer confirms the same female voice in **article detail**
  read-aloud on Android, and confirms no red box and no silent no-audio when
  pressing play.
- **ACC-13:** reviewer repeats ACC-11/ACC-12 on **iOS** (Expo Go or dev build)
  and confirms a female voice with no crash; if iOS lacks a known female voice,
  reviewer confirms audio still plays (CON-04 retry) with no error text.
- **ACC-14:** reviewer runs `npx expo export --platform web`, opens the build in
  desktop Chrome **and** mobile Safari, presses play on a card and on article
  detail, and confirms a **female** voice is audible; no layout shift, no new
  UI, and the export completes with no build errors.
- **ACC-15:** reviewer confirms the visible UI is byte-identical to the previous
  build: card icons (`volume-high` → `square`), colors, detail controls
  (`play-circle` / `pause-circle` / `stop-circle-outline`), and the strings
  `"Listen to Article"` / `"Reading aloud..."` / `"Showing N articles"`.
- **ACC-16:** reviewer confirms a **silent** degradation: on a device/emulator
  with no female voice installed, read-aloud still plays at a natural pitch and
  **no** warning, banner, snackbar, or dialog appears.

## 4. Deliverables

- **D-01 — New shared util `utils/speechVoice.ts`** (no new deps). Exports:
  - constants `FEMALE_TTS_PITCH = 1.15`, `FEMALE_TTS_RATE = 0.9`,
    `FEMALE_TTS_LANGUAGE = "en-US"`, `VOICE_LOOKUP_TIMEOUT_MS = 2000`,
    `MALE_VOICE_TOKENS`, `FEMALE_GENDER_MARKERS`, `FEMALE_NAME_TOKENS`;
  - `type ResolvedVoice = { voice: string | undefined; pitch: number; rate: number; language: string; matched: boolean }`;
  - `isLikelyFemaleVoice(voice: Speech.Voice): boolean` — pure, CON-02;
  - `pickFemaleVoice(voices: Speech.Voice[]): Speech.Voice | undefined` — pure
    (CON-02 steps 1-6), the testable core;
  - `resolveFemaleVoice(): Promise<ResolvedVoice>` — memoized, 2000 ms cap
    (CON-03, CON-07);
  - `prefetchFemaleVoice(): void` — fire-and-forget warm-up for `useEffect`;
  - `speakWithFemaleVoice(text, handlers: { onDone?; onStopped?; onError? })` —
    resolve → `try` speak → on throw retry once without `voice` (CON-04), always
    wiring `onError` to reset UI state; never throws, never rejects;
  - `resetSpeechVoiceCache(): void` — test-only (CON-07).
- **D-02 — `app/(tabs)/learning.tsx` (Recommended Reading cards).** Call
  `prefetchFemaleVoice()` in a mount `useEffect`; replace the inline
  `Speech.speak` options at `learning.tsx:50-56` with
  `speakWithFemaleVoice(...)`, preserving the spoken text
  (`` `${article.title}. ${article.description}` ``), the
  `isSpeakingAsync()` toggle-to-stop path, `activeArticleId` state transitions,
  and the `Speech.stop()` unmount cleanup. All UI per CON-10 unchanged.
- **D-03 — `app/(tabs)/learning-detail.tsx` (full-article read-aloud).** Call
  `prefetchFemaleVoice()` on mount; replace the inline `Speech.speak` options at
  `learning-detail.tsx:121-126` with `speakWithFemaleVoice(topic.content, ...)`,
  keeping `isPlaying` transitions, the stop button, and the `Speech.stop()`
  unmount cleanup. `pitch` becomes explicit (1.15) per CON-09.
- **D-04 — `utils/speechVoice.test.ts`** — `jest` suite parameterized by
  `Platform.OS` (`android` / `ios` / `web`) covering ACC-01..ACC-10, mocking
  `expo-speech` (`speak`, `stop`, `isSpeakingAsync`, `getAvailableVoicesAsync`)
  and `react-native`'s `Platform.OS` getter exactly as
  `utils/notifications.test.ts` does. Lives under `utils/` so the existing
  `jest.config.js` `roots: ['<rootDir>/utils']` picks it up; no jest config
  change required.
- **D-05 — Documentation.** Append a `Current status` entry to `AGENTS.md §3`
  and a changelog entry to `docs/savepoint.md` per `AGENTS.md §1.8` and
  `.agents/rules/wisewallet.md`.

## 5. Glossary

| Term | Meaning |
|---|---|
| Female marker | Tier 1 gender word (substring) or Tier 2 known female voice name (token) per CON-02 |
| Tier 0 | Male-name exclusion guard, evaluated before Tier 1/Tier 2 |
| `ResolvedVoice` | Final `{ voice, pitch, rate, language, matched }` passed to `Speech.speak` |
| `matched` | `true` only when a curated female marker selected the voice |
| Silent fallback | Speaking with the system default voice at `pitch 1.15`, with no user-visible error (CON-03) |
| Prefetch | Fire-and-forget `resolveFemaleVoice()` on screen mount so the first tap is already resolved |

## 6. References

- `AGENTS.md §1` (working agreements), `§1.7` Expo Go, `§1.10` spec-first + TDD
  with cross-platform coverage; `AGENTS.md §2` scaffold (`utils/`,
  `app/(tabs)/learning*.tsx`).
- `app/(tabs)/learning.tsx:25-27,41-57,200-213` (current TTS + card controls);
  `app/(tabs)/learning-detail.tsx:110-112,114-128,161-177` (current TTS + audio bar).
- `utils/learningData.ts` — `LEARNING_RESOURCES` (6 cards) and `LearningResource`.
- `node_modules/expo-speech/src/Speech.types.ts:84-101` (no `gender`),
  `src/Speech.ts:105-110` (unawaited `speak`), `src/ExponentSpeech.web.ts:9-25,65-78,108-119`
  (hang risk, `voiceURI` match, no gender), `ios/SpeechModule.swift:36-42,63-76`
  (throw, dropped gender), `android/.../SpeechModule.kt:51,98-103,125-129`
  (empty list, `identifier = name`, silent miss).
- `utils/notifications.ts` + `utils/notifications.test.ts` — existing
  platform-parameterized jest pattern and lazy-load convention.
- `jest.config.js` (`roots: ['<rootDir>/utils']`, `testEnvironment: 'node'`),
  `tsconfig.test.json`.
- Sibling specs: `specs/04-…` (platform matrix + Objective/Subjective ACC split),
  `specs/06-web-warning-cleanup.md` (web parity), `specs/07-ci-tsc-exclusion.md`
  (test-file `tsc` handling — new `*.test.ts` is excluded from app `tsc`).
