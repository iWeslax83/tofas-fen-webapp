# Enhanced Form Components Documentation

## Overview

The Enhanced Form Components system provides a comprehensive, accessible, and user-friendly form experience for the TOFAS FEN WebApp. This system includes advanced validation, real-time feedback, accessibility features, and modern design patterns.

## Features

### ✨ Core Features
- **Real-time Validation**: Instant feedback as users type
- **Accessibility First**: WCAG 2.1 AA compliant
- **Responsive Design**: Works on all screen sizes
- **Dark Mode Support**: Automatic theme switching
- **Custom Validation Rules**: Flexible validation system
- **Password Strength**: Built-in password policy validation
- **Input Sanitization**: XSS protection
- **Loading States**: Visual feedback during operations
- **Error Recovery**: Clear error messages and suggestions

### 🎨 Design Features
- **Multiple Variants**: Default, outlined, filled styles
- **Size Options**: Small, medium, large sizes
- **Dynamic Icons**: Context-aware icons
- **Smooth Animations**: Micro-interactions for better UX
- **TOFAS Theme**: Consistent with brand colors
- **Glassmorphism**: Modern visual effects

## Components

### FormField

The core input component with advanced features.

```tsx
import { FormField } from '../components/FormComponents';

<FormField
  id="email"
  name="email"
  label="E-posta"
  type="email"
  value={email}
  onChange={setEmail}
  placeholder="ornek@email.com"
  required
  validationRules={[
    { type: 'required', message: 'E-posta zorunludur' },
    { type: 'email', message: 'Geçerli bir e-posta giriniz' }
  ]}
  validateOnBlur
  showPasswordToggle
  size="medium"
  variant="default"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | - | Unique identifier |
| `name` | `string` | - | Form field name |
| `label` | `string` | - | Field label |
| `type` | `InputType` | `'text'` | Input type |
| `value` | `string` | - | Field value |
| `onChange` | `(value: string) => void` | - | Change handler |
| `placeholder` | `string` | - | Placeholder text |
| `required` | `boolean` | `false` | Required field |
| `disabled` | `boolean` | `false` | Disabled state |
| `readOnly` | `boolean` | `false` | Read-only state |
| `autoComplete` | `string` | - | Autocomplete attribute |
| `maxLength` | `number` | - | Maximum length |
| `minLength` | `number` | - | Minimum length |
| `pattern` | `string` | - | HTML pattern attribute |
| `error` | `string` | - | Error message |
| `success` | `string` | - | Success message |
| `hint` | `string` | - | Helper text |
| `icon` | `ReactNode` | - | Custom icon |
| `showPasswordToggle` | `boolean` | `false` | Password visibility toggle |
| `validationRules` | `ValidationRule[]` | `[]` | Validation rules |
| `validateOnBlur` | `boolean` | `true` | Validate on blur |
| `validateOnChange` | `boolean` | `false` | Validate on change |
| `className` | `string` | - | Additional CSS classes |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Field size |
| `variant` | `'default' \| 'outlined' \| 'filled'` | `'default'` | Visual variant |

### Form

Enhanced form wrapper with submission handling.

```tsx
import { Form } from '../components/FormComponents';

<Form
  onSubmit={handleSubmit}
  onReset={handleReset}
  showReset
  loading={isLoading}
  submitText="Gönder"
  resetText="Sıfırla"
>
  {/* Form fields */}
</Form>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Form content |
| `onSubmit` | `(data: FormData) => void` | - | Submit handler |
| `onReset` | `() => void` | - | Reset handler |
| `className` | `string` | - | Additional CSS classes |
| `disabled` | `boolean` | `false` | Disable form |
| `loading` | `boolean` | `false` | Loading state |
| `showReset` | `boolean` | `false` | Show reset button |
| `submitText` | `string` | `'Gönder'` | Submit button text |
| `resetText` | `string` | `'Sıfırla'` | Reset button text |

### FormFieldGroup

Organizes form fields into logical groups.

```tsx
import { FormFieldGroup } from '../components/FormComponents';

<FormFieldGroup
  title="Kişisel Bilgiler"
  description="Temel kişisel bilgileri giriniz"
  columns={2}
>
  {/* Form fields */}
</FormFieldGroup>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Group content |
| `title` | `string` | - | Group title |
| `description` | `string` | - | Group description |
| `className` | `string` | - | Additional CSS classes |
| `columns` | `1 \| 2 \| 3` | `1` | Number of columns |

### SearchField

Specialized search input with clear functionality.

```tsx
import { SearchField } from '../components/FormComponents';

<SearchField
  value={searchValue}
  onChange={setSearchValue}
  onSearch={handleSearch}
  placeholder="Ara..."
  loading={isLoading}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Search value |
| `onChange` | `(value: string) => void` | - | Change handler |
| `onSearch` | `(value: string) => void` | - | Search handler |
| `placeholder` | `string` | `'Ara...'` | Placeholder text |
| `className` | `string` | - | Additional CSS classes |
| `disabled` | `boolean` | `false` | Disabled state |
| `loading` | `boolean` | `false` | Loading state |

## Validation System

### Validation Rules

```tsx
import { ValidationRule } from '../components/FormComponents';

const emailValidation: ValidationRule[] = [
  { type: 'required', message: 'E-posta zorunludur' },
  { type: 'email', message: 'Geçerli bir e-posta giriniz' }
];

const passwordValidation: ValidationRule[] = [
  { type: 'required', message: 'Şifre zorunludur' },
  { type: 'minLength', value: 8, message: 'En az 8 karakter' },
  { type: 'custom', message: 'Güvenlik gereksinimleri karşılanmıyor', 
    validator: (value) => {
      // Custom validation logic
      return value.length >= 8 && /[A-Z]/.test(value);
    }
  }
];
```

### Built-in Validation Types

| Type | Description | Parameters |
|------|-------------|------------|
| `required` | Required field validation | None |
| `minLength` | Minimum length validation | `value: number` |
| `maxLength` | Maximum length validation | `value: number` |
| `pattern` | Regex pattern validation | `value: string` |
| `email` | Email format validation | None |
| `phone` | Phone number validation | None |
| `url` | URL format validation | None |
| `custom` | Custom validation function | `validator: (value: string) => boolean` |

### Validation Timing

- **`validateOnBlur`**: Validates when field loses focus (default: true)
- **`validateOnChange`**: Validates as user types (default: false)

## Usage Examples

### Basic Form

```tsx
import React, { useState } from 'react';
import { Form, FormField, FormFieldGroup } from '../components/FormComponents';

function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = async (formData: FormData) => {
    const data = Object.fromEntries(formData.entries());
    console.log('Form submitted:', data);
    // API call
  };

  return (
    <Form onSubmit={handleSubmit} showReset>
      <FormFieldGroup title="İletişim Bilgileri" columns={2}>
        <FormField
          id="name"
          name="name"
          label="Ad Soyad"
          value={formData.name}
          onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
          required
          validationRules={[
            { type: 'required', message: 'Ad alanı zorunludur' },
            { type: 'minLength', value: 2, message: 'En az 2 karakter' }
          ]}
        />
        
        <FormField
          id="email"
          name="email"
          label="E-posta"
          type="email"
          value={formData.email}
          onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
          required
          validationRules={[
            { type: 'required', message: 'E-posta zorunludur' },
            { type: 'email', message: 'Geçerli e-posta giriniz' }
          ]}
        />
      </FormFieldGroup>

      <FormFieldGroup title="Mesaj" columns={1}>
        <FormField
          id="message"
          name="message"
          label="Mesajınız"
          value={formData.message}
          onChange={(value) => setFormData(prev => ({ ...prev, message: value }))}
          required
          maxLength={500}
          validationRules={[
            { type: 'required', message: 'Mesaj zorunludur' },
            { type: 'minLength', value: 10, message: 'En az 10 karakter' }
          ]}
          hint={`${formData.message.length}/500 karakter`}
        />
      </FormFieldGroup>
    </Form>
  );
}
```

### Advanced Form with Custom Validation

```tsx
import React, { useState, useRef } from 'react';
import { Form, FormField, FormFieldGroup } from '../components/FormComponents';

function RegistrationForm() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (formData: FormData) => {
    // Form submission logic
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FormFieldGroup title="Hesap Bilgileri" columns={2}>
        <FormField
          id="username"
          name="username"
          label="Kullanıcı Adı"
          value={formData.username}
          onChange={(value) => setFormData(prev => ({ ...prev, username: value }))}
          required
          validationRules={[
            { type: 'required', message: 'Kullanıcı adı zorunludur' },
            { type: 'minLength', value: 3, message: 'En az 3 karakter' },
            { type: 'pattern', value: '^[a-zA-Z0-9_]+$', 
              message: 'Sadece harf, rakam ve alt çizgi kullanabilirsiniz' }
          ]}
          validateOnChange
        />

        <FormField
          id="email"
          name="email"
          label="E-posta"
          type="email"
          value={formData.email}
          onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
          required
          validationRules={[
            { type: 'required', message: 'E-posta zorunludur' },
            { type: 'email', message: 'Geçerli e-posta giriniz' }
          ]}
          validateOnChange
        />
      </FormFieldGroup>

      <FormFieldGroup title="Güvenlik" columns={1}>
        <FormField
          id="password"
          name="password"
          label="Şifre"
          type="password"
          value={formData.password}
          onChange={(value) => setFormData(prev => ({ ...prev, password: value }))}
          required
          showPasswordToggle
          validationRules={[
            { type: 'required', message: 'Şifre zorunludur' },
            { type: 'minLength', value: 8, message: 'En az 8 karakter' },
            { type: 'custom', message: 'Güvenlik gereksinimleri karşılanmıyor',
              validator: (value) => {
                const hasUpperCase = /[A-Z]/.test(value);
                const hasLowerCase = /[a-z]/.test(value);
                const hasNumbers = /\d/.test(value);
                const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
                return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
              }
            }
          ]}
          ref={passwordRef}
        />

        <FormField
          id="confirmPassword"
          name="confirmPassword"
          label="Şifre Tekrar"
          type="password"
          value={formData.confirmPassword}
          onChange={(value) => setFormData(prev => ({ ...prev, confirmPassword: value }))}
          required
          showPasswordToggle
          validationRules={[
            { type: 'required', message: 'Şifre tekrarı zorunludur' },
            { type: 'custom', message: 'Şifreler eşleşmiyor',
              validator: (value) => value === formData.password
            }
          ]}
        />
      </FormFieldGroup>
    </Form>
  );
}
```

### Search Implementation

```tsx
import React, { useState } from 'react';
import { SearchField } from '../components/FormComponents';

function SearchComponent() {
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (value: string) => {
    setIsLoading(true);
    try {
      // API call
      await searchAPI(value);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SearchField
      value={searchValue}
      onChange={setSearchValue}
      onSearch={handleSearch}
      placeholder="Kullanıcı, dosya veya içerik ara..."
      loading={isLoading}
    />
  );
}
```

## Accessibility Features

### WCAG 2.1 AA Compliance

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Focus Management**: Clear focus indicators
- **Error Announcements**: Screen reader error announcements
- **High Contrast**: High contrast mode support
- **Reduced Motion**: Respects user motion preferences

### ARIA Attributes

```tsx
// Automatically added ARIA attributes
aria-describedby="field-error-message" // Error messages
aria-describedby="field-hint-message"  // Hint messages
aria-invalid="true"                     // Invalid state
aria-required="true"                   // Required fields
aria-disabled="true"                    // Disabled state
```

## Styling and Theming

### CSS Variables

```css
:root {
  /* Colors */
  --form-primary: #8A1538;
  --form-primary-light: #A61E4A;
  --form-primary-dark: #6B1028;
  --form-secondary: #F8F9FA;
  --form-success: #28A745;
  --form-error: #DC3545;
  --form-warning: #FFC107;
  --form-info: #17A2B8;
  
  /* Spacing */
  --form-spacing-xs: 0.25rem;
  --form-spacing-sm: 0.5rem;
  --form-spacing-md: 1rem;
  --form-spacing-lg: 1.5rem;
  --form-spacing-xl: 2rem;
  
  /* Border Radius */
  --form-radius-sm: 0.25rem;
  --form-radius-md: 0.5rem;
  --form-radius-lg: 0.75rem;
  --form-radius-xl: 1rem;
  
  /* Transitions */
  --form-transition-fast: 0.15s ease-in-out;
  --form-transition-normal: 0.3s ease-in-out;
  --form-transition-slow: 0.5s ease-in-out;
}
```

### Custom Styling

```css
/* Custom form field styles */
.form-field--custom {
  --form-border-color: #your-color;
  --form-focus-color: #your-focus-color;
}

/* Custom validation styles */
.form-field--custom .form-field__message--error {
  color: #your-error-color;
}
```

## Performance Considerations

### Optimization Tips

1. **Debounce Validation**: Use `validateOnChange` sparingly
2. **Memoize Validation Rules**: Prevent unnecessary re-renders
3. **Lazy Loading**: Load validation rules on demand
4. **Virtual Scrolling**: For large forms with many fields

### Bundle Size

- **Core Components**: ~15KB gzipped
- **Validation Rules**: ~5KB gzipped
- **Icons**: ~8KB gzipped (Lucide React)
- **Total**: ~28KB gzipped

## Browser Support

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+
- **Mobile Safari**: 14+
- **Chrome Mobile**: 90+

## Migration Guide

### From Basic HTML Forms

```tsx
// Before
<input
  type="email"
  name="email"
  placeholder="Email"
  required
/>

// After
<FormField
  id="email"
  name="email"
  label="E-posta"
  type="email"
  value={email}
  onChange={setEmail}
  placeholder="ornek@email.com"
  required
  validationRules={[
    { type: 'required', message: 'E-posta zorunludur' },
    { type: 'email', message: 'Geçerli e-posta giriniz' }
  ]}
/>
```

### From Custom Form Libraries

```tsx
// Before (React Hook Form)
const { register, handleSubmit, errors } = useForm();

<input {...register("email", { required: true })} />
{errors.email && <span>{errors.email.message}</span>}

// After
<FormField
  id="email"
  name="email"
  label="E-posta"
  value={email}
  onChange={setEmail}
  required
  validationRules={[
    { type: 'required', message: 'E-posta zorunludur' }
  ]}
/>
```

## Troubleshooting

### Common Issues

1. **Validation Not Working**
   - Check validation rules syntax
   - Ensure `validateOnBlur` or `validateOnChange` is enabled
   - Verify validation function returns boolean

2. **Styling Issues**
   - Import CSS file: `import './FormComponents.css'`
   - Check CSS variable overrides
   - Verify class names are correct

3. **Accessibility Issues**
   - Ensure proper `id` and `label` props
   - Check ARIA attributes
   - Test with screen readers

4. **Performance Issues**
   - Reduce validation frequency
   - Memoize expensive validation functions
   - Use `React.memo` for form components

### Debug Mode

```tsx
// Enable debug logging
const debugValidation = (value: string, rules: ValidationRule[]) => {
  console.log('Validation:', { value, rules });
  // Your validation logic
};

<FormField
  validationRules={[
    { type: 'custom', validator: debugValidation }
  ]}
/>
```

## API Reference

### Types

```tsx
interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  type?: InputType;
  value: string;
  onChange: (value: string) => void;
  // ... other props
}

interface ValidationRule {
  type: ValidationType;
  value?: any;
  message: string;
  validator?: (value: string) => boolean;
}

type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'time' | 'datetime-local';
type ValidationType = 'required' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'phone' | 'url' | 'custom';
```

### Methods

```tsx
// FormField ref methods
const fieldRef = useRef<HTMLInputElement>(null);

// Focus field
fieldRef.current?.focus();

// Blur field
fieldRef.current?.blur();

// Validate field
const result = await fieldRef.current?.validate();
```

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Run tests: `npm test`

### Code Style

- Use TypeScript for type safety
- Follow ESLint rules
- Write unit tests for components
- Document new features

### Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FormField } from '../components/FormComponents';

test('FormField validation works', async () => {
  render(
    <FormField
      id="test"
      name="test"
      label="Test"
      value=""
      onChange={() => {}}
      validationRules={[
        { type: 'required', message: 'Required' }
      ]}
    />
  );

  const input = screen.getByRole('textbox');
  fireEvent.blur(input);
  
  expect(screen.getByText('Required')).toBeInTheDocument();
});
```

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the demo page: `/admin/form-demo`
