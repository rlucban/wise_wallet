import type { Category, TransactionType } from "../types";

// SPEC-46 D-02 — pure rehydrate helper (no react-native import, jest-coverable).
// Precedence: server-echoed nested category wins; then flat categoryId lookup;
// then the pre-existing Others fallback. Never throws, never strips row keys
// (the caller spreads the result, so the mirror stays verbatim per SPEC-45 DEC-03).

interface CategoryRow {
  category?: Category | null;
  categoryId?: string | null;
  type?: TransactionType;
}

export function resolveTransactionCategory(row: CategoryRow, categories: Category[]): Category {
  if (row.category) return row.category;
  const id = row.categoryId;
  if (typeof id === "string" && id.length > 0) {
    const match = categories.find((c) => c.id === id);
    if (match) return match;
  }
  return { id: "uncategorized", name: "Others", type: row.type || "expense", updatedAt: 0 };
}
