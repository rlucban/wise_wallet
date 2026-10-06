import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function count(source: string, needle: string): number {
    return source.split(needle).length - 1;
}

function runSuite(os: "android" | "ios" | "web"): void {
    describe(`SPEC-53 auth button labels on ${os}`, () => {
        it("ACC-01: login contained buttons carry the white label", () => {
            const login = readRepo("app/login.tsx");
            expect(login).toContain('containedLabel: { color: "#fff" }');
            expect(count(login, 'mode="contained"')).toBe(2);
            expect(count(login, "styles.containedLabel")).toBe(3);
            expect(login).toContain(
                'labelStyle={btn.style === "cancel" ? undefined : styles.containedLabel}'
            );
            expect(login).not.toContain("labelStyle={{ color:");
        });

        it("ACC-01: register contained buttons carry the white label", () => {
            const register = readRepo("app/register.tsx");
            expect(register).toContain('containedLabel: { color: "#fff" }');
            expect(count(register, 'mode="contained"')).toBe(2);
            expect(count(register, "styles.containedLabel")).toBe(5);
            expect(register).toContain(
                'labelStyle={btn.style === "cancel" ? undefined : styles.containedLabel}'
            );
            const activeWhitened = register.match(
                /\? \[styles\.modeBtnLabel, styles\.containedLabel\] : styles\.modeBtnLabel/g
            ) ?? [];
            expect(activeWhitened.length).toBe(2);
            expect(register).not.toContain("labelStyle={{ color:");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
