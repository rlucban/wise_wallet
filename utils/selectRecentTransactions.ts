import { Transaction } from "../types";

function sortTime(t: Transaction): number {
  const u = (t as Partial<Transaction>).updatedAt;
  if (typeof u === "number" && Number.isFinite(u)) return u;
  const d = new Date(t.date).getTime();
  return Number.isFinite(d) ? d : 0;
}

export function selectRecentTransactions(transactions: Transaction[], limit = 5): Transaction[] {
  return [...transactions]
    .map((t) => ({ t, time: sortTime(t) }))
    .sort((a, b) => b.time - a.time || a.t.id.localeCompare(b.t.id))
    .slice(0, limit)
    .map(({ t }) => t);
}
