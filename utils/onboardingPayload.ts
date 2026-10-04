import { Transaction } from "../types";

const OPENING_BALANCE_CATEGORY_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19";

/**
 * Builds the "Opening Balance" transaction payload used once at setup.
 * Returns null when the balance is zero (no transaction is created).
 * SPEC-37 DEC-02/DEC-03.
 */
export function buildOpeningBalancePayload(
    balance: number
): Omit<Transaction, "id"> | null {
    if (balance === 0) return null;
    return {
        title: "Opening Balance",
        amount: balance,
        type: "income",
        date: new Date().toISOString(),
        category: {
            id: OPENING_BALANCE_CATEGORY_ID,
            name: "Others",
            type: "income",
            updatedAt: 0,
        },
        note: "Initial account setup",
        paymentMethod: "cash",
        updatedAt: Date.now(),
    };
}
