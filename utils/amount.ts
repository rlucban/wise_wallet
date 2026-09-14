<<<<<<< HEAD
export const formatNumberInput = (raw: string): string => {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const integerPart = parts[0];
  const fractionPart = parts.length > 1 ? parts.slice(1).join("") : null;

  const normalizedInt = integerPart === "" ? "" : integerPart.replace(/^0+(?=\d)/, "");
=======
export const MAX_TRANSACTION_AMOUNT = 1000000;

export const formatNumberInput = (raw: string): string => {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const rawInt = parts[0];
  const fractionPart = parts.length > 1 ? parts.slice(1).join("").slice(0, 2) : null;

  let normalizedInt = rawInt === "" ? "" : rawInt.replace(/^0+(?=\d)/, "");

  if (normalizedInt !== "") {
    const numInt = parseInt(normalizedInt, 10);
    if (numInt > MAX_TRANSACTION_AMOUNT) {
      normalizedInt = String(MAX_TRANSACTION_AMOUNT);
    }
  }

>>>>>>> d608b80 (Fix onboarding routing bug, enforce safe amount limit, and resolve Expo SDK warnings)
  const formattedInt = normalizedInt.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (fractionPart === null) {
    return formattedInt;
  }

<<<<<<< HEAD
  if (cleaned.endsWith(".")) {
=======
  if (normalizedInt === String(MAX_TRANSACTION_AMOUNT) && fractionPart !== "0" && fractionPart !== "00" && fractionPart !== "") {
    return `${formattedInt}.00`;
  }

  if (cleaned.endsWith(".") && parts.length === 2 && fractionPart === "") {
>>>>>>> d608b80 (Fix onboarding routing bug, enforce safe amount limit, and resolve Expo SDK warnings)
    return formattedInt === "" ? "0." : `${formattedInt}.`;
  }

  return formattedInt === "" ? `0.${fractionPart}` : `${formattedInt}.${fractionPart}`;
};

export const parseAmount = (raw: string): number => {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return NaN;
  return parseFloat(cleaned);
};
