import {
    buildTransactionSyncPayload,
    countOrphanTransactions,
    getLastServerTxIds,
    isTransactionSyncPaused,
    mergeTransactionSets,
    setLastServerTxIds,
    truncateUserId,
    withFreshTimestamp,
} from "./transactionSync";
import type { Transaction } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";

let mockOS: "android" | "ios" | "web" = "android";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

function tx(id: string, updatedAt: number, amount = 100): Transaction {
    return {
        id,
        updatedAt,
        amount,
        date: "2026-09-29",
        type: "expense",
    } as Transaction;
}

describe.each(["android", "ios", "web"] as const)("transactionSync on %s", (platform) => {
    beforeEach(() => {
        mockOS = platform;
        jest.clearAllMocks();
        return AsyncStorage.clear();
    });

    test("ACC-01: withFreshTimestamp bumps updatedAt past the prior value", () => {
        const now = 1_750_000_000_000;
        const spy = jest.spyOn(Date, "now").mockReturnValue(now);
        try {
            const next = withFreshTimestamp(tx("a", 1000));
            expect(next.updatedAt).toBe(now);
            expect(next.updatedAt).toBeGreaterThan(1000);
        } finally {
            spy.mockRestore();
        }
    });

    test("ACC-02a: locally-deleted id present remotely is NOT resurrected", () => {
        const result = mergeTransactionSets({
            local: [],
            remote: [tx("gone", 2000)],
            lastServerIds: ["gone"],
            deletedIds: new Set(["gone"]),
        });
        expect(result.merged.map((t) => t.id)).not.toContain("gone");
        expect(result.toCreate).toHaveLength(0);
        expect(result.toUpdate).toHaveLength(0);
    });

    test("ACC-02b: remote-absent-after-seen id is dropped, never re-created", () => {
        const result = mergeTransactionSets({
            local: [tx("stale", 1000)],
            remote: [],
            lastServerIds: ["stale"],
            deletedIds: [],
        });
        expect(result.merged.map((t) => t.id)).not.toContain("stale");
        expect(result.toCreate).toHaveLength(0);
    });

    test("ACC-03: local-only id is enqueued as create exactly once", () => {
        const local = [tx("fresh", 3000)];
        const first = mergeTransactionSets({
            local,
            remote: [],
            lastServerIds: [],
            deletedIds: [],
        });
        expect(first.toCreate).toHaveLength(1);
        expect(first.toCreate[0].id).toBe("fresh");
        expect(first.merged.map((t) => t.id)).toContain("fresh");
        // repeated merge with unchanged snapshots yields the same single entry
        const second = mergeTransactionSets({
            local,
            remote: [],
            lastServerIds: [],
            deletedIds: [],
        });
        expect(second.toCreate).toHaveLength(1);
    });

    test("ACC-04/10: sync paused for Local always, and for Cloud+OFF", () => {
        expect(isTransactionSyncPaused(true, null)).toBe(true);
        expect(isTransactionSyncPaused(true, "true")).toBe(true);
        expect(isTransactionSyncPaused(true, "false")).toBe(true);
        expect(isTransactionSyncPaused(false, "false")).toBe(true);
        expect(isTransactionSyncPaused(false, null)).toBe(false);
        expect(isTransactionSyncPaused(false, "true")).toBe(false);
    });

    test("ties go remote with no overwrite count; remote-newer counts once", () => {
        const tie = mergeTransactionSets({
            local: [tx("t", 5000)],
            remote: [tx("t", 5000)],
            lastServerIds: ["t"],
            deletedIds: [],
        });
        expect(tie.overwrittenCount).toBe(0);
        expect(tie.toUpdate).toHaveLength(0);

        const behind = mergeTransactionSets({
            local: [tx("t", 4000)],
            remote: [tx("t", 5000)],
            lastServerIds: ["t"],
            deletedIds: [],
        });
        expect(behind.overwrittenCount).toBe(1);
        expect(behind.merged.find((t) => t.id === "t")?.updatedAt).toBe(5000);
    });

    test("queued payloads carry userId + updatedAt (CON-04)", () => {
        const payload = buildTransactionSyncPayload(tx("p", 7000), "user-123");
        expect(payload.userId).toBe("user-123");
        expect(payload.updatedAt).toBe(7000);
    });

    test("ACC-05: two-device simulation — create, update, delete converge", () => {
        const server: Transaction[] = [];

        // A creates T1 offline; merge says POST it exactly once.
        const created = withFreshTimestamp({ ...tx("t1", 0), updatedAt: 0 });
        const aPush = mergeTransactionSets({
            local: [created],
            remote: server,
            lastServerIds: [],
            deletedIds: [],
        });
        expect(aPush.toCreate.map((t) => t.id)).toEqual(["t1"]);
        server.push(...aPush.toCreate); // POST drains

        // B fetches — sees T1.
        const bFetch = mergeTransactionSets({
            local: [],
            remote: server,
            lastServerIds: [],
            deletedIds: [],
        });
        expect(bFetch.merged.map((t) => t.id)).toEqual(["t1"]);

        // A updates T1 with a fresh stamp; B fetch shows the new content.
        const updatedLocal = withFreshTimestamp({ ...created });
        updatedLocal.updatedAt = created.updatedAt + 10;
        const aUpd = mergeTransactionSets({
            local: [updatedLocal],
            remote: server,
            lastServerIds: ["t1"],
            deletedIds: [],
        });
        expect(aUpd.toUpdate.map((t) => t.id)).toEqual(["t1"]);
        server.splice(0, server.length, ...aUpd.toUpdate); // PUT drains
        const bFetch2 = mergeTransactionSets({
            local: bFetch.merged,
            remote: server,
            lastServerIds: ["t1"],
            deletedIds: [],
        });
        expect(bFetch2.merged.find((t) => t.id === "t1")?.updatedAt)
            .toBe(updatedLocal.updatedAt);

        // A deletes T1; B fetch excludes it and B does not re-upload it.
        const bFetch3 = mergeTransactionSets({
            local: bFetch2.merged,
            remote: [],
            lastServerIds: ["t1"],
            deletedIds: ["t1"],
        });
        expect(bFetch3.merged).toHaveLength(0);
        expect(bFetch3.toCreate).toHaveLength(0);
    });

    test("ACC-11: orphan isolation — OFF writes never reach the other device", () => {
        // A-OFF creates T-off; server + B never see it.
        const orphans = countOrphanTransactions(["t-off"], []);
        expect(orphans).toBe(1);
        const bView = mergeTransactionSets({
            local: [],
            remote: [],
            lastServerIds: [],
            deletedIds: [],
        });
        expect(bView.merged.map((t) => t.id)).not.toContain("t-off");

        // B-ON creates T-b; A-OFF after refetch still lacks it (caller skips
        // merge entirely while paused — predicate stays true).
        expect(isTransactionSyncPaused(false, "false")).toBe(true);
        expect(countOrphanTransactions(["t-off"], ["t-b"])).toBe(1);
    });

    test("last-server-id snapshot round-trips per user key", async () => {
        await setLastServerTxIds("u1", ["a", "b"]);
        await expect(getLastServerTxIds("u1")).resolves.toEqual(["a", "b"]);
        await expect(getLastServerTxIds("u2")).resolves.toEqual([]);
    });

    test("truncateUserId is short and null-safe", () => {
        expect(truncateUserId(null)).toBe("—");
        expect(truncateUserId("abc")).toBe("abc");
        expect(truncateUserId("user-123456789")).toBe("user-123…");
    });
});
