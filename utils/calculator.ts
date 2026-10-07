export type CalcOperator = "+" | "-" | "×" | "÷";

/**
 * Single binary operation (SPEC-63 DEC-02). Pure by design: no react-native
 * imports, so jest covers it in the node env. Division by zero yields NaN —
 * callers render it as "Error".
 */
export function calculate(a: number, b: number, op: CalcOperator): number {
    switch (op) {
        case "+":
            return a + b;
        case "-":
            return a - b;
        case "×":
            return a * b;
        case "÷":
            return b === 0 ? NaN : a / b;
    }
}

/**
 * Renders a result for the display: NaN/non-finite reads "Error", and
 * floating-point artifacts (0.1 + 0.2) are trimmed to 10 significant digits.
 */
export function formatResult(value: number): string {
    if (Number.isNaN(value) || !Number.isFinite(value)) return "Error";
    return String(parseFloat(value.toPrecision(10)));
}
