export type ValidationRule = (value: unknown, fieldName?: string) => string | null;

export const validators = {
  email: (value: unknown): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return 'Email is required';
    if (!emailRegex.test(String(value))) return 'Please enter a valid email address';
    return null;
  },

  required: (value: unknown, fieldName = 'This field'): string | null => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  },

  minLength: (value: unknown, min: number, fieldName = 'This field'): string | null => {
    if (!value || String(value).length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (value: unknown, max: number, fieldName = 'This field'): string | null => {
    if (value && String(value).length > max) {
      return `${fieldName} must be no more than ${max} characters`;
    }
    return null;
  },

  phone: (value: unknown): string | null => {
    if (!value) return null;
    const phoneRegex = /^[\d\s+()-]+$/;
    if (!phoneRegex.test(String(value))) return 'Please enter a valid phone number';
    return null;
  },

  url: (value: unknown): string | null => {
    if (!value) return null;
    try {
      new URL(String(value));
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  number: (value: unknown, fieldName = 'This field'): string | null => {
    if (value === '' || value === null || value === undefined) return null;
    if (isNaN(Number(value))) return `${fieldName} must be a number`;
    return null;
  },

  positiveNumber: (value: unknown, fieldName = 'This field'): string | null => {
    if (value === '' || value === null || value === undefined) return null;
    if (isNaN(Number(value)) || Number(value) <= 0) {
      return `${fieldName} must be a positive number`;
    }
    return null;
  },
};

export const validateForm = <T extends Record<string, unknown>>(
  formData: T,
  schema: Record<string, ((value: unknown, fieldName?: string) => string | null)[]>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  Object.keys(schema).forEach((field) => {
    const rules = schema[field];
    const value = formData[field];

    for (const rule of rules) {
      const error = rule(value, field);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  });

  return { isValid: Object.keys(errors).length === 0, errors };
};