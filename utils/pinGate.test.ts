import * as fs from "fs";
import * as path from "path";
import { verifyLocalPin } from "./pinGate";

jest.mock("expo-crypto", () => ({
  __esModule: true,
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: jest.fn(async () => "mock-sha256"),
}));

const fakeDigest = (p: string) => Promise.resolve(`sha256:${p}`);
const storedFor = (pin: string) => `sha256:${pin}`;

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function sliceFunction(source: string, startMarker: string, endMarker: string): string {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    return source.slice(start, end);
}

function runSuite(os: "android" | "ios" | "web"): void {
    describe(`SPEC-51 pinGate on ${os}`, () => {
        it("matches a SHA256 row with the correct PIN", async () => {
            await expect(verifyLocalPin("1234", storedFor("1234"), fakeDigest)).resolves.toBe(true);
        });

        it("matches a legacy plaintext row without calling digest", async () => {
            const digest = jest.fn(fakeDigest);
            await expect(verifyLocalPin("1234", "1234", digest)).resolves.toBe(true);
            expect(digest).not.toHaveBeenCalled();
        });

        it("rejects a wrong PIN", async () => {
            await expect(verifyLocalPin("9999", storedFor("1234"), fakeDigest)).resolves.toBe(false);
        });

        it("rejects blank, short, long, and non-numeric input", async () => {
            for (const bad of ["", "   ", "12", "12345", "12a4", "abcd"]) {
                await expect(verifyLocalPin(bad, storedFor("1234"), fakeDigest)).resolves.toBe(false);
            }
        });

        it("rejects empty or missing stored credential", async () => {
            for (const stored of ["", null, undefined, 1234]) {
                await expect(verifyLocalPin("1234", stored, fakeDigest)).resolves.toBe(false);
            }
        });

        it("trims whitespace and digests the trimmed PIN", async () => {
            const digest = jest.fn(fakeDigest);
            await expect(verifyLocalPin("  1234  ", storedFor("1234"), digest)).resolves.toBe(true);
            expect(digest).toHaveBeenCalledWith("1234");
        });

        it("defaults to expo-crypto SHA256 when no digest is injected", async () => {
            const Crypto = require("expo-crypto");
            await expect(verifyLocalPin("1234", "mock-sha256")).resolves.toBe(true);
            expect(Crypto.digestStringAsync).toHaveBeenCalledWith("SHA-256", "1234");
        });

        it("uses the same expo-crypto SHA256 call as addUser (source guard)", () => {
            const src = fs.readFileSync(path.resolve(__dirname, "pinGate.ts"), "utf8");
            expect(src).toContain("CryptoDigestAlgorithm.SHA256");
            expect(src).toContain("digestStringAsync");
            expect(src).not.toContain("Platform.OS");
        });

        it("ACC-01: both gates route through the converged rule", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            const syncFn = sliceFunction(settings, "const verifyPinForSync", "const proceedWithBackupEnable");
            expect(syncFn).toContain("verifyLocalPin(pin, user.passcode)");
            expect(syncFn).toContain("unreachable");
            const clearFn = sliceFunction(settings, "const handleClearData", "const executeClearData");
            expect(clearFn).toContain("verifyLocalPin(pin, user.passcode)");
            expect(clearFn).not.toContain("digestStringAsync");
        });

        it("ACC-03: Backup offline fails closed with exact copy, single login call", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            const syncFn = sliceFunction(settings, "const verifyPinForSync", "const proceedWithBackupEnable");
            expect(syncFn).toContain("Connect to enable cloud sync.");
            const fetches = syncFn.match(/await fetch\(/g) ?? [];
            expect(fetches.length).toBe(1);
            expect(syncFn.indexOf("Connect to enable cloud sync.")).toBeLessThan(
                syncFn.indexOf("setShowNewAccountDialog(true)")
            );
        });

        it("ACC-04: mismatch dialog keeps the typed PIN for migrate", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            const tail = sliceFunction(settings, "Device PIN confirmed", "const proceedWithBackupEnable");
            expect(tail).toContain("setShowNewAccountDialog(true)");
            expect(tail).not.toContain("setPinVerificationInput");
            const migrate = sliceFunction(settings, "const createNewAccountAndMigrate", "const handleMergeLWW");
            expect(migrate).toContain("pinVerificationInput");
        });

        it("ACC-05: Change-PIN save path untouched", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            expect(settings).toContain("const handleChangePasscode");
            expect(settings).toContain('authFetch<{ token?: string }>("auth/change-passcode"');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
