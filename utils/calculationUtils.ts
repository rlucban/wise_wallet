export const add = (a: number, b: number): number => a + b;

export const subtract = (a: number, b: number): number => a - b;

export const multiply = (a: number, b: number): number => a * b;

export const divide = (a: number, b: number): number | null => {
  if (b === 0) return null;
  return a / b;
};

export const formatResult = (num: number): string =>
  Number.isInteger(num) ? String(num) : num.toFixed(2);