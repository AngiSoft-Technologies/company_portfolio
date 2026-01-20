// Validation utilities
export const validators = {
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return 'Email is required';
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    return null;
  },

  required: (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  },

  minLength: (value, min, fieldName = 'This field') => {
    if (!value || value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (value, max, fieldName = 'This field') => {
    if (value && value.length > max) {
      return `${fieldName} must be no more than ${max} characters`;
    }
    return null;
  },

  phone: (value) => {
    if (!value) return null; // Optional
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(value)) return 'Please enter a valid phone number';
    return null;
  },

  url: (value) => {
    if (!value) return null; // Optional
    try {
      new URL(value);
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  number: (value, fieldName = 'This field') => {
    if (value === '' || value === null || value === undefined) return null; // Optional
    if (isNaN(value)) return `${fieldName} must be a number`;
    return null;
  },

  positiveNumber: (value, fieldName = 'This field') => {
    if (value === '' || value === null || value === undefined) return null;
    if (isNaN(value) || Number(value) <= 0) {
      return `${fieldName} must be a positive number`;
    }
    return null;
  },

  fileSize: (file, maxSizeMB, fieldName = 'File') => {
    if (!file) return null;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `${fieldName} size must be less than ${maxSizeMB}MB`;
    }
    return null;
  },

  fileType: (file, allowedTypes, fieldName = 'File') => {
    if (!file) return null;
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const mimeType = file.type;
    
    const isAllowed = allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExtension === type.substring(1);
      }
      return mimeType.startsWith(type);
    });

    if (!isAllowed) {
      return `${fieldName} type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
    }
    return null;
  }
};

export const validateForm = (formData, schema) => {
  const errors = {};
  
  Object.keys(schema).forEach(field => {
    const rules = schema[field];
    const value = formData[field];
    
    for (const rule of rules) {
      const error = rule(value, field);
      if (error) {
        errors[field] = error;
        break; // Stop at first error
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

