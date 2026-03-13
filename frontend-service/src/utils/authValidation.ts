export const REQUIRED_FIELD_MESSAGE = "This field is required";
export const MIN_PASSWORD_LENGTH_MESSAGE = "Must be at least 6 characters";

export const getPasswordValidationError = (
  password: string,
): string | undefined => {
  if (!password.trim()) {
    return REQUIRED_FIELD_MESSAGE;
  }
  if (password.length < 6) {
    return MIN_PASSWORD_LENGTH_MESSAGE;
  }
  return undefined;
};
