import AsyncStorage from "@react-native-async-storage/async-storage";
import { attachDueLinks, pruneDueLinks, pruneDueLinksByDue, recordDueLink } from "./dueTxLinks";
import type { Transaction } from "../types";

const platforms = ["android", "ios", "web"] as const;

function tx(id: string, dueId?: string): Transaction {
  return {
    id,
    amount: 100,
    date: "2026-10-01T00:00:00.000Z",
    type: "expense",
    updatedAt: 1,
    dueId,
  };
}

describe.each(platforms)("dueTxLinks (Platform.OS=%s)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("records a tx->due link", async () => {
    await recordDueLink("t1", "d1", "u1");
    const raw = await AsyncStorage.getItem("user_u1_due_tx_links");
    expect(JSON.parse(raw || "{}")).toEqual({ t1: "d1" });
  });

  it("attachDueLinks restores a missing dueId", async () => {
    await recordDueLink("t1", "d1", "u1");
    const rows = await attachDueLinks([tx("t1")], "u1");
    expect(rows[0].dueId).toBe("d1");
  });

  it("echo-wins: existing dueId is preserved over the map", async () => {
    await recordDueLink("t1", "d1", "u1");
    const rows = await attachDueLinks([tx("t1", "d2")], "u1");
    expect(rows[0].dueId).toBe("d2");
  });

  it("pruneDueLinks removes the tx entry", async () => {
    await recordDueLink("t1", "d1", "u1");
    await pruneDueLinks("t1", "u1");
    const raw = await AsyncStorage.getItem("user_u1_due_tx_links");
    expect(JSON.parse(raw || "{}")).toEqual({});
  });

  it("pruneDueLinksByDue removes all links to that due", async () => {
    await recordDueLink("t1", "d1", "u1");
    await recordDueLink("t2", "d1", "u1");
    await recordDueLink("t3", "d2", "u1");
    await pruneDueLinksByDue("d1", "u1");
    const raw = await AsyncStorage.getItem("user_u1_due_tx_links");
    expect(JSON.parse(raw || "{}")).toEqual({ t3: "d2" });
  });
});
