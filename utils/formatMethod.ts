/**
 * SPEC-64 DEC-04 — title-format a raw payment-method id for display.
 * Splits on underscores, hyphens, and whitespace runs, drops empties,
 * capitalizes each token, joins with single spaces.
 * Pure: no `react-native` import (jest-safe on android/ios/web).
 */
export function formatMethodLabel(value: string): string {
    return value
        .split(/[_\-\s]+/)
        .filter((token) => token.length > 0)
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
        .join(" ");
}
