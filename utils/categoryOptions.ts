import { Category } from "../types";

export const OTHERS_EXPENSE_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b18";
export const OTHERS_INCOME_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19";

export const OTHERS_ID_FOR_TYPE: Record<"income" | "expense", string> = {
  expense: OTHERS_EXPENSE_ID,
  income: OTHERS_INCOME_ID,
};

export function ensureOthersOption(categories: Category[], type: "income" | "expense"): Category[] {
  const filtered = categories.filter((c) => c.type === type);
  if (filtered.some((c) => c.name === "Others")) return filtered;
  return [
    ...filtered,
    { id: OTHERS_ID_FOR_TYPE[type], name: "Others", type, updatedAt: 0 },
  ];
}

export function isOthersCategory(cat: Category | null | undefined): boolean {
  return !!cat && cat.name === "Others";
}
