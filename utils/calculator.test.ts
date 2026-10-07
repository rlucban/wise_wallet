import { evaluateCalculatorExpression } from "./calculator";

describe("evaluateCalculatorExpression", () => {
  it.each(["android", "ios", "web"])("evaluates addition on %s", () => {
    expect(evaluateCalculatorExpression("1+2")).toBe(3);
  });

  it.each(["android", "ios", "web"])("evaluates multiplication before addition on %s", () => {
    expect(evaluateCalculatorExpression("1+2*3")).toBe(7);
  });

  it.each(["android", "ios", "web"])("evaluates parentheses on %s", () => {
    expect(evaluateCalculatorExpression("(1+2)*3")).toBe(9);
  });

  it.each(["android", "ios", "web"])("rejects invalid input on %s", () => {
    expect(() => evaluateCalculatorExpression("abc")).toThrow();
  });
});
