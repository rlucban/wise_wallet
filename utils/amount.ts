export const formatNumberInput = (raw: string): string => {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const integerPart = parts[0];
  const fractionPart = parts.length > 1 ? parts.slice(1).join("") : null;

  const normalizedInt = integerPart === "" ? "" : integerPart.replace(/^0+(?=\d)/, "");
  const formattedInt = normalizedInt.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (fractionPart === null) {
    return formattedInt;
  }

  if (cleaned.endsWith(".")) {
    return formattedInt === "" ? "0." : `${formattedInt}.`;
  }

  return formattedInt === "" ? `0.${fractionPart}` : `${formattedInt}.${fractionPart}`;
};

export const parseAmount = (raw: string): number => {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return NaN;
  return parseFloat(cleaned);
};
