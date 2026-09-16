const MAX_AMOUNT = 99999999.99;
const MAX_INT_DIGITS = 8;

export const formatNumberInput = (raw: string): string => {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const integerPart = parts[0];
  const fractionPart = parts.length > 1 ? parts.slice(1).join("") : null;

  let normalizedInt = integerPart === "" ? "" : integerPart.replace(/^0+(?=\d)/, "");
  if (normalizedInt.length > MAX_INT_DIGITS) {
    normalizedInt = normalizedInt.slice(0, MAX_INT_DIGITS);
  }

  const formattedInt = normalizedInt.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  let result: string;
  if (fractionPart === null) {
    result = formattedInt;
  } else if (cleaned.endsWith(".")) {
    result = formattedInt === "" ? "0." : `${formattedInt}.`;
  } else {
    result = formattedInt === "" ? `0.${fractionPart}` : `${formattedInt}.${fractionPart}`;
  }

  const numericValue = parseFloat(result.replace(/,/g, ""));
  if (!isNaN(numericValue) && numericValue > MAX_AMOUNT) {
    return formatNumberInput(String(MAX_AMOUNT));
  }

  return result;
};

export const parseAmount = (raw: string): number => {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return NaN;
  return parseFloat(cleaned);
};
