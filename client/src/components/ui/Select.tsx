import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
  group?: string;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  name?: string;
  id?: string;
}

export interface SelectItemProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
}

export interface SelectGroupProps {
  label: string;
  children: ReactNode;
  className?: string;
}

// Select Root Component
export const Select: React.FC<SelectProps> = ({
  value: controlledValue,
  defaultValue,
  onValueChange,
  options,
  placeholder = 'Seçiniz...',
  searchable = false,
  clearable = false,
  disabled = false,
  error = false,
  size = 'md',
  className = '',
  name,
  id,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const selectRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const selectedOption = options.find((opt) => opt.value === value);

  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
    setOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleValueChange('');
  };

  const filteredOptions = searchable && searchQuery
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const groupedOptions = filteredOptions.reduce((acc, opt) => {
    const group = opt.group || 'default';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(opt);
    return acc;
  }, {} as Record<string, SelectOption[]>);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearchQuery('');
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      if (searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, searchable]);

  useEffect(() => {
    if (open) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setOpen(false);
          setSearchQuery('');
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open]);

  return (
    <div
      ref={selectRef}
      className={`select select-${size} ${disabled ? 'select-disabled' : ''} ${error ? 'select-error' : ''} ${className}`}
    >
      <input type="hidden" name={name} value={value} id={id} />
      <button
        type="button"
        className="select-trigger"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selectedOption?.label || placeholder}
      >
        <span className="select-value">
          {selectedOption?.icon && (
            <span className="select-value-icon">{selectedOption.icon}</span>
          )}
          <span className="select-value-text">
            {selectedOption?.label || placeholder}
          </span>
        </span>
        <span className="select-actions">
          {clearable && value && !disabled && (
            <button
              type="button"
              className="select-clear"
              onClick={handleClear}
              aria-label="Temizle"
            >
              <X size={16} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`select-chevron ${open ? 'select-chevron-open' : ''}`}
          />
        </span>
      </button>

      {typeof window !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className="select-overlay" onClick={() => setOpen(false)}>
                <motion.div
                  className="select-content"
                  onClick={(e) => e.stopPropagation()}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  role="listbox"
                >
                  {searchable && (
                    <div className="select-search">
                      <Search size={16} className="select-search-icon" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        className="select-search-input"
                        placeholder="Ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}

                  <div className="select-options">
                    {Object.keys(groupedOptions).length === 0 ? (
                      <div className="select-empty">Sonuç bulunamadı</div>
                    ) : (
                      Object.entries(groupedOptions).map(([group, opts]) => (
                        <React.Fragment key={group}>
                          {group !== 'default' && (
                            <div className="select-group-label">{group}</div>
                          )}
                          {opts.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className={`select-option ${value === option.value ? 'select-option-selected' : ''} ${option.disabled ? 'select-option-disabled' : ''}`}
                              onClick={() =>
                                !option.disabled && handleValueChange(option.value)
                              }
                              disabled={option.disabled}
                              role="option"
                              aria-selected={value === option.value}
                            >
                              {option.icon && (
                                <span className="select-option-icon">
                                  {option.icon}
                                </span>
                              )}
                              <span className="select-option-label">
                                {option.label}
                              </span>
                              {value === option.value && (
                                <Check size={16} className="select-option-check" />
                              )}
                            </button>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

// Select Item Component (for composition)
export const SelectItem: React.FC<SelectItemProps> = ({
  value,
  children,
  disabled = false,
  icon,
  className = '',
}) => {
  return (
    <button
      type="button"
      className={`select-option ${disabled ? 'select-option-disabled' : ''} ${className}`}
      disabled={disabled}
      data-value={value}
    >
      {icon && <span className="select-option-icon">{icon}</span>}
      <span className="select-option-label">{children}</span>
    </button>
  );
};

// Select Group Component (for composition)
export const SelectGroup: React.FC<SelectGroupProps> = ({
  label,
  children,
  className = '',
}) => {
  return (
    <div className={`select-group ${className}`}>
      <div className="select-group-label">{label}</div>
      {children}
    </div>
  );
};

export default Select;

