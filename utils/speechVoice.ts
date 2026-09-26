import * as Speech from "expo-speech";

// ---------------------------------------------------------------------------
// SPEC-11: Female TTS voice for the Financial Literacy read-aloud.
//
// `expo-speech` exposes NO gender field on any platform:
//   - iOS drops `AVSpeechSynthesisVoice.gender` (ios/SpeechModule.swift)
//   - Android `VoiceRecord` has no gender field
//   - Web maps the Web Speech API `SpeechSynthesisVoice`, which has no gender
// So "female voice" is *inferred* by matching curated name/identifier markers
// over `getAvailableVoicesAsync()` (CON-01/CON-02). When nothing matches we
// fall back to the system default voice at FEMALE_TTS_PITCH, silently —
// read-aloud must never block, error, or disable its control (CON-03).
// ---------------------------------------------------------------------------

/** CON-09 — fixed speech parameters for every read-aloud surface. */
export const FEMALE_TTS_PITCH = 1.15;
export const FEMALE_TTS_RATE = 0.9;
export const FEMALE_TTS_LANGUAGE = "en-US";

/** CON-03/DEC-02 — the voice lookup is capped so read-aloud can never hang. */
export const VOICE_LOOKUP_TIMEOUT_MS = 2000;

/** CON-02 Tier 0 — male-name exclusion guard, evaluated before Tier 1/2. */
export const MALE_VOICE_TOKENS: ReadonlySet<string> = new Set([
    "male", "man", "boy", "guy", "tpf",
    "fred", "alex", "daniel", "aaron", "tom", "george", "oliver", "david",
    "mark", "ryan", "evan", "james", "arthur", "ricky", "bruce", "albert",
]);

/** CON-02 Tier 1 — explicit gender words, matched as a lowercase substring. */
export const FEMALE_GENDER_MARKERS: readonly string[] = [
    "female", "woman", "girl", "lady",
];

/** CON-02 Tier 2 — known female en voice names, matched as whole tokens. */
export const FEMALE_NAME_TOKENS: ReadonlySet<string> = new Set([
    "samantha", "karen", "moira", "tessa", "fiona", "victoria", "serena",
    "allison", "catherine", "hazel", "zira", "susan", "ava", "aria", "jenny",
    "michelle", "nicky", "libby", "kate",
]);

export type ResolvedVoice = {
    /** Voice identifier to hand to `Speech.speak`; undefined = system default. */
    voice: string | undefined;
    pitch: number;
    rate: number;
    language: string;
    /** True only when a curated marker actually selected the voice. */
    matched: boolean;
};

const FALLBACK: ResolvedVoice = {
    voice: undefined,
    pitch: FEMALE_TTS_PITCH,
    rate: FEMALE_TTS_RATE,
    language: FEMALE_TTS_LANGUAGE,
    matched: false,
};

function tokenize(value: string): string[] {
    return value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 0);
}

function isEnglish(voice: Speech.Voice): boolean {
    const language = typeof voice.language === "string" ? voice.language : "";
    const primary = language.toLowerCase().split(/[-_]/)[0] ?? "";
    return primary === "en";
}

function isTier0Male(tokens: string[]): boolean {
    return tokens.some((token) => MALE_VOICE_TOKENS.has(token));
}

function isTier1GenderMarker(haystack: string): boolean {
    return FEMALE_GENDER_MARKERS.some((marker) => haystack.includes(marker));
}

function isTier2KnownName(tokens: string[]): boolean {
    return tokens.some((token) => FEMALE_NAME_TOKENS.has(token));
}

/** CON-02 — true when this voice matches a curated female marker. */
export function isLikelyFemaleVoice(voice: Speech.Voice): boolean {
    if (!isEnglish(voice)) return false;

    const name = typeof voice.name === "string" ? voice.name : "";
    const identifier = typeof voice.identifier === "string" ? voice.identifier : "";
    const haystack = `${name} ${identifier}`.toLowerCase();
    const tokens = tokenize(haystack);

    if (isTier0Male(tokens)) return false;
    if (isTier1GenderMarker(haystack)) return true;
    return isTier2KnownName(tokens);
}

/** CON-02 — first Tier 1/2 match in OS array order, after Tier 0 removal. */
export function pickFemaleVoice(voices: Speech.Voice[]): Speech.Voice | undefined {
    if (!Array.isArray(voices)) return undefined;
    return voices.find((voice) => isLikelyFemaleVoice(voice));
}

let cache: Promise<ResolvedVoice> | null = null;

async function loadVoices(): Promise<Speech.Voice[]> {
    try {
        const voices = await Promise.race([
            Speech.getAvailableVoicesAsync(),
            new Promise<Speech.Voice[]>((resolve) => {
                setTimeout(() => resolve([]), VOICE_LOOKUP_TIMEOUT_MS);
            }),
        ]);
        return Array.isArray(voices) ? voices : [];
    } catch {
        return [];
    }
}

/** CON-03/CON-07 — memoized for the app session; at most one native query. */
export function resolveFemaleVoice(): Promise<ResolvedVoice> {
    if (cache) return cache;

    cache = loadVoices().then((voices) => {
        const match = pickFemaleVoice(voices);
        if (!match) return FALLBACK;
        return {
            voice: match.identifier,
            pitch: FEMALE_TTS_PITCH,
            rate: FEMALE_TTS_RATE,
            language: FEMALE_TTS_LANGUAGE,
            matched: true,
        };
    });

    return cache;
}

/** DEC-02 — warm the cache on mount so the first tap is already resolved. */
export function prefetchFemaleVoice(): void {
    void resolveFemaleVoice();
}

/** CON-07 — test isolation only; never called from app code. */
export function resetSpeechVoiceCache(): void {
    cache = null;
}

export type SpeechHandlers = {
    onDone?: () => void;
    onStopped?: () => void;
    onError?: () => void;
};

function emitError(handlers: SpeechHandlers): void {
    if (handlers.onError) handlers.onError();
}

/** CON-04 — onError always resets the UI playing state (no stuck icon). */
function buildOptions(resolved: ResolvedVoice, handlers: SpeechHandlers): Speech.SpeechOptions {
    const options: Speech.SpeechOptions = {
        language: resolved.language,
        pitch: resolved.pitch,
        rate: resolved.rate,
        onDone: handlers.onDone,
        onStopped: handlers.onStopped,
        onError: () => {
            emitError(handlers);
        },
    };
    if (resolved.voice !== undefined) {
        options.voice = resolved.voice;
    }
    return options;
}

/** CON-11 — the single speak path for the Financial Literacy surfaces. */
export async function speakWithFemaleVoice(text: string, handlers: SpeechHandlers = {}): Promise<void> {
    const resolved = await resolveFemaleVoice();
    try {
        Speech.speak(text, buildOptions(resolved, handlers));
    } catch {
        // CON-04: iOS throws InvalidVoiceException for an unusable identifier.
        // Retry exactly once with the system default voice; keep pitch/rate.
        try {
            Speech.speak(text, buildOptions(FALLBACK, handlers));
        } catch {
            emitError(handlers);
        }
    }
}
