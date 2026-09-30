// SPEC-37 — Single source of truth for balance math.
// `profile.initialBalance` is the only record of the opening amount; onboarding
// no longer creates an "Opening Balance" transaction. The title check below is a
// legacy shim so accounts that already stored that row keep today's balance.
export const OPENING_BALANCE_TITLE = "Opening Balance";

export interface BalanceTransaction {
    type: string;
    amount?: unknown;
    title?: string;
}

export interface BalanceSums {
    income: number;
    expense: number;
    openingIncome: number;
}

export interface BalanceInput {
    initialBalance?: unknown;
    transactions: BalanceTransaction[];
    reserved?: unknown;
}

// Supabase returns NUMERIC as a string, so amounts are not always numbers.
const toAmount = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export function isOpeningBalanceTransaction(t: BalanceTransaction): boolean {
    return !!t && t.title === OPENING_BALANCE_TITLE;
}

export function computeBalanceSums(transactions: BalanceTransaction[]): BalanceSums {
    const list = Array.isArray(transactions) ? transactions : [];
    let income = 0;
    let expense = 0;
    let openingIncome = 0;

    for (const t of list) {
        if (!t) continue;
        const amount = toAmount(t.amount);
        if (t.type === "income") {
            if (isOpeningBalanceTransaction(t)) openingIncome += amount;
            else income += amount;
        } else if (t.type === "expense") {
            expense += amount;
        }
    }

    return { income, expense, openingIncome };
}

export function computeBalance(input: BalanceInput): number {
    const { income, expense } = computeBalanceSums(input.transactions);
    return toAmount(input.initialBalance) + income - expense;
}

export function computeAvailableBalance(input: BalanceInput): number {
    return computeBalance(input) - toAmount(input.reserved);
}
