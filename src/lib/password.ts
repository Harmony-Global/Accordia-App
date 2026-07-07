export const PASSWORD_RULE_MESSAGE = "Password must be at least 8 characters and contain letters and numbers.";

export function isStrongPassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}
