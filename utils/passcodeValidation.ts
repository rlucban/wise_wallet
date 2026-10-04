export const PASSCODE_LENGTH = 4;
export const PASSCODE_FORMAT_ERROR = "PIN must be 4 digits.";
export const PASSCODE_DIFFERENT_ERROR = "New PIN must be different from current PIN.";
export const PASSCODE_MISMATCH_ERROR = "New PINs do not match.";

export function normalizePasscodeInput(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, PASSCODE_LENGTH);
}

export function isFourDigitPasscode(value: string): boolean {
  return /^\d{4}$/.test(value.trim());
}

export function getPasscodeFormatError(value: string): string | null {
  if (!value.trim()) return null;
  return isFourDigitPasscode(value) ? null : PASSCODE_FORMAT_ERROR;
}

export function getNewPasscodeError(next: string, current?: string | null): string | null {
  if (!next.trim()) return null;
  const formatError = getPasscodeFormatError(next);
  if (formatError) return formatError;
  if (current && next.trim() === current.trim()) return PASSCODE_DIFFERENT_ERROR;
  return null;
}

export function getConfirmPasscodeError(next: string, confirm: string): string | null {
  if (!confirm.trim()) return null;
  const formatError = getPasscodeFormatError(confirm);
  if (formatError) return formatError;
  if (isFourDigitPasscode(next) && next.trim() !== confirm.trim()) {
    return PASSCODE_MISMATCH_ERROR;
  }
  return null;
}

export function canSubmitPasscodeChange(next: string, confirm: string, current?: string | null): boolean {
  return (
    isFourDigitPasscode(next) &&
    isFourDigitPasscode(confirm) &&
    next.trim() === confirm.trim() &&
    (!current || next.trim() !== current.trim())
  );
}
