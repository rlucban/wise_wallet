import { selectRecentTransactions } from "./selectRecentTransactions";
import type { Transaction } from "../types";

const platforms = ["android", "ios", "web"] as const;

function tx(id: string, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id,
    amount: 100,
    date: "2026-10-01T00:00:00.000Z",
    type: "expense",
    updatedAt: Date.parse("2026-10-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe.each(platforms)("selectRecentTransactions (Platform.OS=%s)", () => {
  it("orders by updatedAt desc", () => {
    const a = tx("a", { updatedAt: Date.parse("2026-10-01T00:00:00Z") });
    const b = tx("b", { updatedAt: Date.parse("2026-10-03T00:00:00Z") });
    const c = tx("c", { updatedAt: Date.parse("2026-10-02T00:00:00Z") });
    expect(selectRecentTransactions([a, b, c]).map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("falls back to transaction date when updatedAt is missing", () => {
    const withUpdated = tx("with", { updatedAt: Date.parse("2026-10-01T00:00:00Z") });
    const withoutUpdated = tx("without", { date: "2026-10-05T00:00:00.000Z" });
    delete (withoutUpdated as Partial<Transaction>).updatedAt;
    expect(selectRecentTransactions([withUpdated, withoutUpdated]).map((t) => t.id)).toEqual(["without", "with"]);
  });

  it("caps at 5", () => {
    const rows = Array.from({ length: 7 }, (_, i) => tx(`t${i}`, { updatedAt: Date.parse(`2026-10-0${i + 1}T00:00:00Z`) }));
    expect(selectRecentTransactions(rows)).toHaveLength(5);
  });

  it("returns all when fewer than 5", () => {
    const rows = [tx("a"), tx("b"), tx("c")];
    expect(selectRecentTransactions(rows)).toHaveLength(3);
  });
});
