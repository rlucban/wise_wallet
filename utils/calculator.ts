export function evaluateCalculatorExpression(expression: string): number {
  const cleaned = expression.replace(/\s+/g, "");
  if (!cleaned) throw new Error("Empty expression");
  if (!/^[0-9+\-*/().]+$/.test(cleaned)) throw new Error("Invalid characters");

  const tokens = cleaned.match(/\d+(?:\.\d+)?|[+\-*/()]/g);
  if (!tokens || tokens.join("") !== cleaned) throw new Error("Invalid expression");

  let index = 0;

  const peek = () => tokens[index];
  const consume = () => tokens[index++];

  const parseExpression = (): number => {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const right = parseTerm();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  };

  const parseTerm = (): number => {
    let value = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = consume();
      const right = parseFactor();
      value = op === "*" ? value * right : value / right;
    }
    return value;
  };

  const parseFactor = (): number => {
    const token = consume();
    if (!token) throw new Error("Unexpected end");
    if (token === "(") {
      const value = parseExpression();
      if (consume() !== ")") throw new Error("Missing closing parenthesis");
      return value;
    }
    if (token === "-") {
      return -parseFactor();
    }
    const value = Number(token);
    if (Number.isNaN(value)) throw new Error("Invalid number");
    return value;
  };

  const result = parseExpression();
  if (index !== tokens.length) throw new Error("Unexpected trailing tokens");
  return result;
}
