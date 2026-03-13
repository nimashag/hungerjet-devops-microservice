import { getPasswordValidationError } from "../../../utils/authValidation";

export type EmailPasswordForm = {
  email: string;
  password: string;
};

export type EmailPasswordErrors = {
  email?: string;
  password?: string;
};

const isValidEmailAddress = (email: string): boolean => {
  if (!email || email.length > 254 || email.includes(" ")) {
    return false;
  }

  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex !== email.lastIndexOf("@")) {
    return false;
  }

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);

  if (!localPart || !domainPart) {
    return false;
  }

  if (
    domainPart.startsWith(".") ||
    domainPart.endsWith(".") ||
    !domainPart.includes(".")
  ) {
    return false;
  }

  return true;
};

export const validateEmailPasswordForm = (
  form: EmailPasswordForm,
): EmailPasswordErrors => {
  const errors: EmailPasswordErrors = {};

  if (!form.email.trim()) {
    errors.email = "Email is required";
  } else if (!isValidEmailAddress(form.email.trim())) {
    errors.email = "Invalid email address";
  }

  const passwordError = getPasswordValidationError(form.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  return errors;
};

export const hasValidationErrors = (
  errors: Record<string, string | undefined>,
): boolean => {
  return Object.values(errors).some(Boolean);
};

export const validateRequiredFields = <T extends Record<string, string>>(
  form: T,
  requiredFields: Array<keyof T>,
  invalidEmailMessage: string,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  requiredFields.forEach((field) => {
    if (!form[field].trim()) {
      errors[field as string] = "This field is required";
    }
  });

  if (!isValidEmailAddress(form.email.trim())) {
    errors.email = invalidEmailMessage;
  }

  const passwordError = getPasswordValidationError(form.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  return errors;
};
