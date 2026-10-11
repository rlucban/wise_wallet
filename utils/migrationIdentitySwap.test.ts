import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

const AUTH = "context/AuthContext.tsx";
const SCREEN = "app/(tabs)/settings.tsx";
const LAYOUT = "app/_layout.tsx";

function swapBlockOf(source: string): string {
    const anchor = source.indexOf("const switchIdentity");
    if (anchor < 0) throw new Error("switchIdentity missing");
    return source.slice(anchor, source.indexOf("}, []);", anchor));
}

function migrateBlockOf(source: string): string {
    const anchor = source.indexOf("const createNewAccountAndMigrate");
    if (anchor < 0) throw new Error("migrate block missing");
    // End at the try's catch: the refetch trio sits AFTER the success alert,
    // so ending at "migrated successfully" would cut it off (same slice-trap
    // family as the SPEC-93 blockOf repair).
    return source.slice(anchor, source.indexOf("} catch", anchor));
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`migration identity swap on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: swap writes the login-equivalent identity with no null transition", () => {
            const source = readRepo(AUTH);
            expect(source).toContain("switchIdentity: (userId: string, token: string) => Promise<void>;");
            const block = swapBlockOf(source);
            expect(block).toContain("setSecureItem('authToken', token)");
            expect(block).toContain("AsyncStorage.setItem('activeUserId', String(userId))");
            expect(block).toContain("AsyncStorage.setItem('lastActiveUserId', String(userId))");
            expect(block).toContain("setActiveUserId(String(userId))");
            expect(block).toContain("setCachedUserId(String(userId))");
            expect(block).toContain("setToken(token)");
            expect(block).toContain("resetAuthSessionWarningLatch()");
            expect(block).toContain("wipeGetCache()");
            expect(block).not.toContain("setActiveUserId(null)");
        });

        it("ACC-02: migrate block swaps instead of bouncing, steps intact", () => {
            const block = migrateBlockOf(readRepo(SCREEN));
            expect(block).toContain("await switchIdentity(newUserId, newToken)");
            expect(block).not.toContain("await logout()");
            expect(block).not.toContain("await login(newUserId, newToken)");
            expect(block).toContain("await addUser(newUserId");
            expect(block).toContain('"authName"');
            expect(block).toContain("await saveUserProfile(");
            expect(block).toContain("await initDb(newUserId)");
            expect(block).toContain("await setSetting('autoBackup', 'true')");
            expect(block).toContain("refetchTx()");
            expect(block).toContain("refetchCats()");
            expect(block).toContain("refetchProfile()");
        });

        it("ACC-03: scope confined", () => {
            const auth = readRepo(AUTH);
            expect(auth).toContain("const login = useCallback");
            expect(auth).toContain("const logout = useCallback");
            expect(auth).toContain("removeSecureItem('authToken')");
            const layout = readRepo(LAYOUT);
            expect(layout).toContain("[Nav] Redirecting to Login");
            expect(layout).toContain("[Nav] Redirecting to Dashboard");
            const screen = readRepo(SCREEN);
            expect(screen).toContain("await logout()");
            expect(screen).toContain("router.replace(\"/login\")");
            expect(screen).not.toContain("usePreventRemove");
            expect(screen).not.toContain("headerBackButtonMenuEnabled");
            expect(auth).not.toContain("LogBox");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
