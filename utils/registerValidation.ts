export const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;

export const EMAIL_REQUIRED_ERROR = "Email is required";
export const INVALID_EMAIL_ERROR = "Please enter a valid email address (e.g., name@example.com)";
export const INVALID_PIN_ERROR = "Passcode must be exactly 4 digits";

export type RegisterValidationResult = {
  ok: boolean;
  emailError?: string;
  pinError?: string;
};

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function validateRegisterInput(email: string, passcode: string): RegisterValidationResult {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return { ok: false, emailError: EMAIL_REQUIRED_ERROR };
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { ok: false, emailError: INVALID_EMAIL_ERROR };
  }

  if (!/^\d{4}$/.test(passcode.trim())) {
    return { ok: false, pinError: INVALID_PIN_ERROR };
  }

  return { ok: true };
}
