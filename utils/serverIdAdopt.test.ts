import AsyncStorage from "@react-native-async-storage/async-storage";
import * as fs from "fs";
import * as path from "path";
import { getItem, getPrefixedKey } from "./storage";
import { recordDueLink, remapDueLink } from "./dueTxLinks";

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

const USER = "test-user";

async function readLinkMap(): Promise<Record<string, string>> {
    const key = await getPrefixedKey("due_tx_links", USER);
    return getItem<Record<string, string>>(key, {});
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`server id adoption on ${os}`, () => {
        beforeEach(async () => {
            mockOS = os;
            await AsyncStorage.clear();
        });

        it("ACC-01: both POST paths extract, adopt, and fail open", () => {
            const src = readRepo("context/TransactionsContext.tsx");
            expect(src.match(/Array\.isArray\(data\) \? data\[0\] : data/g) ?? []).toHaveLength(2);
            expect(src).toContain('typeof createdRow?.id === "string"');
            expect(src).toContain("remapDueLink(uploaded.id, serverId, activeUserId)");
            expect(src).toContain("remapDueLink(newTransaction.id, serverId, activeUserId)");
            expect(src).toContain("finalRow = { ...uploaded, id: serverId };");
        });

        it("ACC-02: remap moves exactly one entry and no-ops safely", async () => {
            await recordDueLink("client-uuid", "due-1", USER);
            await recordDueLink("other-uuid", "due-2", USER);
            await remapDueLink("client-uuid", "server-uuid", USER);
            expect(await readLinkMap()).toEqual({ "server-uuid": "due-1", "other-uuid": "due-2" });

            await remapDueLink("server-uuid", "server-uuid", USER);
            await remapDueLink("missing-uuid", "server-x", USER);
            await remapDueLink("", "server-x", USER);
            expect(await readLinkMap()).toEqual({ "server-uuid": "due-1", "other-uuid": "due-2" });
        });

        it("ACC-03: surroundings intact, same-layer imports only", () => {
            const src = readRepo("context/TransactionsContext.tsx");
            expect(src).toContain("Failed to save transaction. Please check your connection.");
            expect(src).toContain("await refreshFromApi();");
            expect(src).toContain("setTransactions((prev) => [...prev, finalRow]);");
            expect(src).toContain('} from "../utils/dueTxLinks";');
            const links = readRepo("utils/dueTxLinks.ts");
            expect(links).toContain("export async function recordDueLink(");
            expect(links).toContain("export async function pruneDueLinks(");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
