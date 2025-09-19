import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Eye, EyeOff, Check, X, AlertCircle, Info, Search, Calendar, Phone, Mail, User, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { InputSanitizer, PasswordPolicy } from '../utils/security';

// Types and Interfaces
export interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'time' | 'datetime-local';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  error?: string;
  success?: string;
  hint?: string;
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
  validationRules?: ValidationRule[];
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'outlined' | 'filled';
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'phone' | 'url' | 'custom';
  value?: string | number | boolean;
  message: string;
  validator?: (value: string) => boolean;
}

export interface FormFieldState {
  value: string;
  error: string;
  success: string;
  isDirty: boolean;
  isTouched: boolean;
  isValid: boolean;
  isFocused: boolean;
}

export interface FormFieldRef extends HTMLInputElement {
  validate: () => Promise<{ isValid: boolean; error: string; success: string }>;
}

// Validation Functions
const validationFunctions = {
  required: (value: string): boolean => value.trim().length > 0,
  minLength: (value: string, min: number): boolean => value.length >= min,
  maxLength: (value: string, max: number): boolean => value.length <= max,
  pattern: (value: string, pattern: string): boolean => new RegExp(pattern).test(value),
  email: (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value: string): boolean => /^[+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-()]/g, '')),
  url: (value: string): boolean => /^https?:\/\/.+/.test(value),
  password: (value: string): boolean => {
    const result = PasswordPolicy.validate(value);
    return result.isValid;
  }
};

// Enhanced Form Field Component
export const FormField = forwardRef<FormFieldRef, FormFieldProps>(({
  id,
  name,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  readOnly = false,
  autoComplete,
  maxLength,
  minLength,
  pattern,
  error,
  success,
  hint,
  icon,
  showPasswordToggle = false,
  validationRules = [],
  validateOnBlur = true,
  validateOnChange = false,
  className = '',
  size = 'medium',
  variant = 'default'
}, ref) => {
  const [fieldState, setFieldState] = useState<FormFieldState>({
    value: value || '',
    error: error || '',
    success: success || '',
    isDirty: false,
    isTouched: false,
    isValid: true,
    isFocused: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Update state when props change
  useEffect(() => {
    setFieldState(prev => ({
      ...prev,
      value: value || '',
      error: error || '',
      success: success || ''
    }));
  }, [value, error, success]);

  // Validation function
  const validateField = async (value: string): Promise<{ isValid: boolean; error: string; success: string }> => {
    setIsValidating(true);
    
    let errorMessage = '';
    let successMessage = '';

    // Run validation rules
    for (const rule of validationRules) {
      let isValid = true;

      switch (rule.type) {
        case 'required':
          isValid = validationFunctions.required(value);
          break;
        case 'minLength':
          isValid = validationFunctions.minLength(value, rule.value as number);
          break;
        case 'maxLength':
          isValid = validationFunctions.maxLength(value, rule.value as number);
          break;
        case 'pattern':
          isValid = validationFunctions.pattern(value, rule.value as string);
          break;
        case 'email':
          isValid = validationFunctions.email(value);
          break;
        case 'phone':
          isValid = validationFunctions.phone(value);
          break;
        case 'url':
          isValid = validationFunctions.url(value);
          break;
        case 'custom':
          isValid = rule.validator ? rule.validator(value) : true;
          break;
      }

      if (!isValid) {
        errorMessage = rule.message;
        break;
      }
    }

    // Check for success conditions
    if (!errorMessage && value.length > 0) {
      if (type === 'email' && validationFunctions.email(value)) {
        successMessage = 'Geçerli e-posta adresi';
      } else if (type === 'password' && validationFunctions.password(value)) {
        successMessage = 'Güçlü şifre';
      } else if (value.length >= (minLength || 0)) {
        successMessage = 'Geçerli değer';
      }
    }

    setIsValidating(false);
    return { isValid: !errorMessage, error: errorMessage, success: successMessage };
  };

  // Handle input change
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const sanitizedValue = InputSanitizer.sanitizeString(newValue);
    
    setFieldState(prev => ({
      ...prev,
      value: sanitizedValue,
      isDirty: true
    }));

    onChange(sanitizedValue);

    // Validate on change if enabled
    if (validateOnChange && validationRules.length > 0) {
      const validation = await validateField(sanitizedValue);
      setFieldState(prev => ({
        ...prev,
        error: validation.error,
        success: validation.success,
        isValid: validation.isValid
      }));
    }
  };

  // Handle blur
  const handleBlur = async () => {
    setFieldState(prev => ({
      ...prev,
      isTouched: true,
      isFocused: false
    }));

    onBlur?.();

    // Validate on blur if enabled
    if (validateOnBlur && validationRules.length > 0) {
      const validation = await validateField(fieldState.value);
      setFieldState(prev => ({
        ...prev,
        error: validation.error,
        success: validation.success,
        isValid: validation.isValid
      }));
    }
  };

  // Handle focus
  const handleFocus = () => {
    setFieldState(prev => ({
      ...prev,
      isFocused: true
    }));
  };

  // Get icon based on type
  const getDefaultIcon = () => {
    switch (type) {
      case 'email':
        return <Mail size={18} />;
      case 'password':
        return <Lock size={18} />;
      case 'tel':
        return <Phone size={18} />;
      case 'search':
        return <Search size={18} />;
      case 'date':
      case 'time':
      case 'datetime-local':
        return <Calendar size={18} />;
      default:
        return <User size={18} />;
    }
  };

  // Get input type
  const getInputType = () => {
    if (type === 'password' && showPasswordToggle) {
      return showPassword ? 'text' : 'password';
    }
    return type;
  };

  // CSS Classes
  const getFieldClasses = () => {
    const baseClasses = `form-field form-field--${size} form-field--${variant}`;
    const stateClasses = [
      fieldState.isFocused ? 'form-field--focused' : '',
      fieldState.error ? 'form-field--error' : '',
      fieldState.success ? 'form-field--success' : '',
      fieldState.isDirty ? 'form-field--dirty' : '',
      disabled ? 'form-field--disabled' : '',
      readOnly ? 'form-field--readonly' : ''
    ].filter(Boolean).join(' ');

    return `${baseClasses} ${stateClasses} ${className}`.trim();
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    ...document.createElement('input'),
    focus: () => document.getElementById(id)?.focus(),
    blur: () => document.getElementById(id)?.blur(),
    validate: () => validateField(fieldState.value)
  }));

  return (
    <div className={getFieldClasses()}>
      {/* Label */}
      <label htmlFor={id} className="form-field__label">
        {label}
        {required && <span className="form-field__required">*</span>}
      </label>

      {/* Input Container */}
      <div className="form-field__input-container">
        {/* Icon */}
        {icon && (
          <div className="form-field__icon form-field__icon--left">
            {icon}
          </div>
        )}

        {/* Input */}
        <input
          ref={ref}
          id={id}
          name={name}
          type={getInputType()}
          value={fieldState.value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={autoComplete}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          className="form-field__input"
        />

        {/* Default Icon */}
        {!icon && (
          <div className="form-field__icon form-field__icon--left">
            {getDefaultIcon()}
          </div>
        )}

        {/* Password Toggle */}
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="form-field__icon form-field__icon--right form-field__toggle"
            disabled={disabled}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}

        {/* Status Icons */}
        {fieldState.error && (
          <div className="form-field__icon form-field__icon--right form-field__status form-field__status--error">
            <X size={18} />
          </div>
        )}
        {fieldState.success && !fieldState.error && (
          <div className="form-field__icon form-field__icon--right form-field__status form-field__status--success">
            <Check size={18} />
          </div>
        )}
        {isValidating && (
          <div className="form-field__icon form-field__icon--right form-field__status form-field__status--loading">
            <div className="form-field__spinner"></div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="form-field__messages">
        {fieldState.error && (
          <div className="form-field__message form-field__message--error">
            <AlertCircle size={14} />
            <span>{fieldState.error}</span>
          </div>
        )}
        {fieldState.success && !fieldState.error && (
          <div className="form-field__message form-field__message--success">
            <Check size={14} />
            <span>{fieldState.success}</span>
          </div>
        )}
        {hint && !fieldState.error && !fieldState.success && (
          <div className="form-field__message form-field__message--hint">
            <Info size={14} />
            <span>{hint}</span>
          </div>
        )}
      </div>
    </div>
  );
});

FormField.displayName = 'FormField';

// Form Component
export interface FormProps {
  children: React.ReactNode;
  onSubmit: (data: FormData) => void | Promise<void>;
  onReset?: () => void;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  showReset?: boolean;
  submitText?: string;
  resetText?: string;
}

export const Form: React.FC<FormProps> = ({
  children,
  onSubmit,
  onReset,
  className = '',
  disabled = false,
  loading = false,
  showReset = false,
  submitText = 'Gönder',
  resetText = 'Sıfırla'
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || loading || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(new FormData(e.target as HTMLFormElement));
    } catch {
      // Form submission error handled by error boundary
      toast.error('Form gönderilirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    onReset?.();
  };

  return (
    <form
      onSubmit={handleSubmit}
      onReset={handleReset}
      className={`enhanced-form ${className}`}
      noValidate
    >
      <div className="enhanced-form__content">
        {children}
      </div>
      
      <div className="enhanced-form__actions">
        <button
          type="submit"
          disabled={disabled || loading || isSubmitting}
          className="enhanced-form__submit"
        >
          {isSubmitting ? (
            <>
              <div className="enhanced-form__spinner"></div>
              Gönderiliyor...
            </>
          ) : (
            submitText
          )}
        </button>

        {showReset && (
          <button
            type="reset"
            disabled={disabled || loading || isSubmitting}
            className="enhanced-form__reset"
          >
            {resetText}
          </button>
        )}
      </div>
    </form>
  );
};

// Form Field Group Component
export interface FormFieldGroupProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  columns?: 1 | 2 | 3;
}

export const FormFieldGroup: React.FC<FormFieldGroupProps> = ({
  children,
  title,
  description,
  className = '',
  columns = 1
}) => {
  return (
    <div className={`form-field-group form-field-group--${columns}-col ${className}`}>
      {title && (
        <div className="form-field-group__header">
          <h3 className="form-field-group__title">{title}</h3>
          {description && (
            <p className="form-field-group__description">{description}</p>
          )}
        </div>
      )}
      <div className="form-field-group__content">
        {children}
      </div>
    </div>
  );
};

// Search Field Component
export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Ara...',
  className = '',
  disabled = false,
  loading = false
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(value);
  };

  return (
    <form onSubmit={handleSubmit} className={`search-field ${className}`}>
      <div className="search-field__container">
        <Search className="search-field__icon" size={18} />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="search-field__input"
        />
        {loading && (
          <div className="search-field__spinner"></div>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="search-field__clear"
            disabled={disabled}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </form>
  );
};

// Export all components
export default {
  FormField,
  Form,
  FormFieldGroup,
  SearchField,
  validationRules: validationFunctions
};
