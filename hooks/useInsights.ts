import { useTransactionsData } from "./useTransactions";
import { useSavings } from "./useSavings";
import { useDues } from "./useDues";
import { useCurrencyActions } from "../context/CurrencyContext";
import { useMemo, useRef } from "react";

export interface Insight {
  id: string;
  type: "warning" | "info" | "success" | "danger";
  title: string;
  message: string;
  category?: string;
}

export function useInsights() {
  const { transactions } = useTransactionsData();
  const { items: savingsItems } = useSavings();
  const { dues } = useDues();
  const { formatAmount } = useCurrencyActions();

  const savingsRef = useRef(savingsItems);
  savingsRef.current = savingsItems;
  const duesRef = useRef(dues);
  duesRef.current = dues;

  const txKey = useMemo(
    () => transactions.map((t) => `${t.id}:${t.updatedAt ?? t.date}:${t.amount}:${t.category?.id ?? ""}`).join("|"),
    [transactions]
  );

  // SPEC-60 D-60-02 (DEC-60-01): dues/savings fingerprints join the memo gate
  // (same join pattern as txKey) so their changes recompute insights. Reads
  // stay on the refs; deps are strings, never object identity (CON-60-03).
  const duesKey = useMemo(
    () => dues.map((d) => `${d.id}:${d.updatedAt}:${d.amount}:${d.completed}`).join("|"),
    [dues]
  );

  const savingsKey = useMemo(
    () => savingsItems.map((s) => `${s.id}:${s.updatedAt}:${s.balance}`).join("|"),
    [savingsItems]
  );

  const insights: Insight[] = useMemo(() => {
    void txKey;
    void duesKey;
    void savingsKey;
    const savings = savingsRef.current;
    const list = duesRef.current;
    const insights: Insight[] = [];
    const now = new Date();

    // 1. Allocations total insight
    const totalAllocated = savings.reduce((sum, g) => sum + g.balance, 0);
    if (totalAllocated > 0) {
      insights.push({
        id: "allocations-total",
        type: "info",
        title: "Funds Allocated",
        message: `You have ${formatAmount(totalAllocated)} set aside. Transfer out anytime to release to your main balance.`,
      });
    }

    // 2. Due Insights (forecast)
    const upcomingDues = list.filter((d) => {
      if (d.completed) return false;
      const dueDate = new Date(d.date);
      const timeDiff = dueDate.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      return daysDiff >= 0 && daysDiff <= 3;
    });

    upcomingDues.forEach((due) => {
      const dueDate = new Date(due.date);
      const isToday = dueDate.toDateString() === now.toDateString();
      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

      insights.push({
        id: `due-near-${due.id}`,
        type: due.type === "income" ? "success" : "warning",
        title: isToday ? "Due Today" : "Upcoming Due",
        message: `${due.title} (${formatAmount(due.amount)}) is ${isToday ? "due today" : `due in ${daysUntil} day(s)`}. ${due.type === "income" ? "Expecting income!" : "Plan your spending accordingly."}`,
      });
    });

    return insights;
  }, [txKey, duesKey, savingsKey, formatAmount]);

  return { insights };
}
