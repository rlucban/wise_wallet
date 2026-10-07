import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function sliceFunction(source: string, startMarker: string, endMarker: string): string {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return source.slice(start, end);
}

function runSuite(os: "android" | "ios" | "web"): void {
    describe(`SPEC-59 clear-gate token consume and login identity on ${os}`, () => {
        it("ACC-59-01: Clear and Delete gates consume the fresh token", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            // S1+S2: exactly two fresh-token consumes (Clear + Delete). The
            // Change pattern login(activeUserId, freshToken) is untouched.
            const consumes = settings.match(/await login\(fresh\.user\.id, fresh\.token\);/g) ?? [];
            expect(consumes.length).toBe(2);
            expect(settings).toContain("await login(activeUserId, freshToken);");
        });

        it("ACC-59-02: no gate sends the display name", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            const fns = [
                sliceFunction(settings, "const handleClearData", "const executeClearData"),
                sliceFunction(settings, "const verifyAccountPin", "const handleVerifyDeletePin"),
                sliceFunction(settings, "const verifyPinForSync", "const proceedWithBackupEnable"),
            ];
            for (const fn of fns) {
                expect(fn).not.toContain("profile?.name");
                expect(fn).toContain('AsyncStorage.getItem("authName")');
                expect(fn).toContain("name: gateName,");
            }
        });

        it("ACC-59-02b: identity persisted at every entry point", () => {
            const login = readRepo("app/login.tsx");
            expect((login.match(/AsyncStorage\.setItem\('authName'/g) ?? []).length).toBe(2);
            const register = readRepo("app/register.tsx");
            expect((register.match(/AsyncStorage\.setItem\('authName'/g) ?? []).length).toBe(2);
            const settings = readRepo("app/(tabs)/settings.tsx");
            expect(settings).toContain('AsyncStorage.setItem("authName", profile?.name || "")');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
