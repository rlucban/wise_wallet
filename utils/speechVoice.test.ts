import {
    FEMALE_TTS_LANGUAGE,
    FEMALE_TTS_PITCH,
    FEMALE_TTS_RATE,
    MALE_VOICE_TOKENS,
    VOICE_LOOKUP_TIMEOUT_MS,
    isLikelyFemaleVoice,
    pickFemaleVoice,
    resetSpeechVoiceCache,
    resolveFemaleVoice,
    speakWithFemaleVoice,
} from "./speechVoice";
import type { Voice } from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";

type MockVoice = {
    identifier: string;
    name: string;
    quality: string;
    language: string;
};

const mockSpeak = jest.fn();
const mockGetVoices = jest.fn<Promise<Voice[]>, []>();
const mockStop = jest.fn<Promise<void>, []>();

let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

jest.mock("expo-speech", () => ({
    __esModule: true,
    speak: (...args: unknown[]) => mockSpeak(...args),
    stop: () => mockStop(),
    isSpeakingAsync: async () => false,
    getAvailableVoicesAsync: () => mockGetVoices(),
}));

function voice(overrides: Partial<MockVoice> = {}): Voice {
    return {
        identifier: "voice-id",
        name: "Voice Name",
        quality: "Default",
        language: "en-US",
        ...overrides,
    } as Voice;
}

const SAMANTHA_IOS = voice({
    identifier: "com.apple.voice.compact.en-US.Samantha",
    name: "Samantha",
    language: "en-US",
});

const ALEX = voice({ identifier: "Alex", name: "Alex", language: "en-US" });

const TPF_ANDROID = voice({
    identifier: "en-us-x-tpf-local",
    name: "en-us-x-tpf-local",
    language: "en-US",
});

const SFG_ANDROID = voice({
    identifier: "en-us-x-sfg#female_1-local",
    name: "en-us-x-sfg#female_1-local",
    language: "en-US",
});

function runSuite(os: "android" | "ios" | "web") {
    describe(`female TTS voice (Platform.OS=${os})`, () => {
        beforeEach(() => {
            mockOS = os;
            mockSpeak.mockReset();
            mockStop.mockClear();
            mockGetVoices.mockReset();
            resetSpeechVoiceCache();
        });

        it("ACC-01: recognizes curated female markers and rejects male names", () => {
            expect(isLikelyFemaleVoice(SAMANTHA_IOS)).toBe(true);
            expect(isLikelyFemaleVoice(voice({ name: "Google UK English Female" }))).toBe(true);
            expect(isLikelyFemaleVoice(SFG_ANDROID)).toBe(true);
            expect(isLikelyFemaleVoice(voice({ name: "Google UK English Male" }))).toBe(false);
            expect(isLikelyFemaleVoice(TPF_ANDROID)).toBe(false);
            expect(isLikelyFemaleVoice(ALEX)).toBe(false);
            expect(isLikelyFemaleVoice(voice({ identifier: "Daniel", name: "Daniel" }))).toBe(false);
        });

        it("ACC-02: never selects a non-English voice even when the name matches", () => {
            const kyoko = voice({ identifier: "ja-jp-x-htm", name: "Kyoko", language: "ja-JP" });
            expect(isLikelyFemaleVoice(kyoko)).toBe(false);
            expect(pickFemaleVoice([kyoko])).toBeUndefined();
        });

        it("ACC-03/04: picks the first curated match in OS array order", () => {
            expect(pickFemaleVoice([ALEX, TPF_ANDROID, SAMANTHA_IOS])?.identifier)
                .toBe("com.apple.voice.compact.en-US.Samantha");
            expect(pickFemaleVoice([TPF_ANDROID, SFG_ANDROID])?.identifier)
                .toBe("en-us-x-sfg#female_1-local");
        });

        it("ACC-03: resolveFemaleVoice returns the matched identifier and fixed params", async () => {
            mockGetVoices.mockResolvedValue([ALEX, SAMANTHA_IOS]);

            const resolved = await resolveFemaleVoice();

            expect(resolved).toEqual({
                voice: "com.apple.voice.compact.en-US.Samantha",
                pitch: FEMALE_TTS_PITCH,
                rate: FEMALE_TTS_RATE,
                language: FEMALE_TTS_LANGUAGE,
                matched: true,
            });
        });

        it("ACC-05: no female voice speaks once with no voice key and no _voiceIndex", async () => {
            mockGetVoices.mockResolvedValue([ALEX]);

            const resolved = await resolveFemaleVoice();
            expect(resolved.matched).toBe(false);
            expect(resolved.voice).toBeUndefined();

            await speakWithFemaleVoice("hello");

            expect(mockSpeak).toHaveBeenCalledTimes(1);
            const [, options] = mockSpeak.mock.calls[0] as [string, Record<string, unknown>];
            expect(options).not.toHaveProperty("voice");
            expect(options).not.toHaveProperty("_voiceIndex");
            expect(options.pitch).toBe(FEMALE_TTS_PITCH);
        });

        it("ACC-06: a rejected voice lookup still speaks exactly once", async () => {
            mockGetVoices.mockRejectedValue(new Error("no tts engine"));

            await speakWithFemaleVoice("hello");

            expect(mockSpeak).toHaveBeenCalledTimes(1);
            const [, options] = mockSpeak.mock.calls[0] as [string, Record<string, unknown>];
            expect(options).toMatchObject({
                language: FEMALE_TTS_LANGUAGE,
                pitch: FEMALE_TTS_PITCH,
                rate: FEMALE_TTS_RATE,
            });
        });

        it("ACC-06: a hung voice lookup is capped and still speaks exactly once", async () => {
            jest.useFakeTimers();
            try {
                mockGetVoices.mockReturnValue(new Promise<Voice[]>(() => { /* never settles */ }));

                const pending = speakWithFemaleVoice("hello");
                await Promise.resolve();
                jest.advanceTimersByTime(VOICE_LOOKUP_TIMEOUT_MS + 50);
                await pending;

                expect(mockSpeak).toHaveBeenCalledTimes(1);
                const [, options] = mockSpeak.mock.calls[0] as [string, Record<string, unknown>];
                expect(options.pitch).toBe(FEMALE_TTS_PITCH);
                expect(options).not.toHaveProperty("voice");
            } finally {
                jest.useRealTimers();
            }
        });

        it("ACC-07: a throwing speak retries once without the voice and never rejects", async () => {
            mockGetVoices.mockResolvedValue([SAMANTHA_IOS]);
            mockSpeak.mockImplementationOnce(() => { throw new Error("invalid voice"); });

            await expect(speakWithFemaleVoice("hello")).resolves.toBeUndefined();

            expect(mockSpeak).toHaveBeenCalledTimes(2);
            const [firstText, firstOptions] = mockSpeak.mock.calls[0] as [string, Record<string, unknown>];
            const [secondText, secondOptions] = mockSpeak.mock.calls[1] as [string, Record<string, unknown>];
            expect(firstText).toBe("hello");
            expect(firstOptions.voice).toBe("com.apple.voice.compact.en-US.Samantha");
            expect(secondText).toBe("hello");
            expect(secondOptions).not.toHaveProperty("voice");
            expect(secondOptions.pitch).toBe(FEMALE_TTS_PITCH);
            expect(secondOptions.rate).toBe(FEMALE_TTS_RATE);
        });

        it("ACC-08: the voice list is queried at most once per session", async () => {
            mockGetVoices.mockResolvedValue([SAMANTHA_IOS]);

            await speakWithFemaleVoice("one");
            await speakWithFemaleVoice("two");
            await resolveFemaleVoice();

            expect(mockGetVoices).toHaveBeenCalledTimes(1);

            resetSpeechVoiceCache();
            await resolveFemaleVoice();
            expect(mockGetVoices).toHaveBeenCalledTimes(2);
        });

        it("ACC-09: every speak passes the fixed language/rate/pitch", async () => {
            mockGetVoices.mockResolvedValue([SAMANTHA_IOS]);

            await speakWithFemaleVoice("hello", {
                onDone: () => { /* noop */ },
                onStopped: () => { /* noop */ },
                onError: () => { /* noop */ },
            });

            const [, options] = mockSpeak.mock.calls[0] as [string, Record<string, unknown>];
            expect(options.language).toBe("en-US");
            expect(options.rate).toBe(0.9);
            expect(options.pitch).toBe(1.15);
            expect(typeof options.onDone).toBe("function");
            expect(typeof options.onStopped).toBe("function");
            expect(typeof options.onError).toBe("function");
        });

        it("ACC-09: onError resets the playing state", async () => {
            mockGetVoices.mockResolvedValue([SAMANTHA_IOS]);
            const onError = jest.fn();

            await speakWithFemaleVoice("hello", { onError });
            const [, options] = mockSpeak.mock.calls[0] as [string, Record<string, () => void>];
            options.onError();

            expect(onError).toHaveBeenCalledTimes(1);
        });

        it("CON-02: exported marker data is non-empty and excludes male tokens", () => {
            expect(MALE_VOICE_TOKENS.has("tpf")).toBe(true);
            expect(MALE_VOICE_TOKENS.has("samantha")).toBe(false);
            expect(isLikelyFemaleVoice(voice({ name: "Zira" }))).toBe(true);
        });

        it("ACC-10: the voice lookup writes nothing to storage", async () => {
            mockGetVoices.mockResolvedValue([SAMANTHA_IOS]);
            const setItem = AsyncStorage.setItem as unknown as jest.Mock;
            const removeItem = AsyncStorage.removeItem as unknown as jest.Mock;
            setItem.mockClear();
            removeItem.mockClear();

            await speakWithFemaleVoice("hello");
            await resolveFemaleVoice();

            expect(setItem).not.toHaveBeenCalled();
            expect(removeItem).not.toHaveBeenCalled();
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
