/**
 * SPEC-78 D-01: the optional Goal Amount must not be lower than the Initial
 * Balance. The comparison is strictly less-than, so a goal equal to the
 * Initial Balance is allowed. An empty goal is always allowed.
 */
export function isGoalBelowInitial(goalAmount: string, initialBalance: number): boolean {
    if (goalAmount.trim() === "") return false;
    const parsed = parseFloat(goalAmount.replace(/[^0-9.]/g, "")) || 0;
    return parsed < initialBalance;
}
