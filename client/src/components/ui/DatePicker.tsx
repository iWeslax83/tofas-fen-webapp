import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, Locale } from 'date-fns';
import { tr } from 'date-fns/locale';
import './DatePicker.css';

export interface DatePickerProps {
  value?: Date;
  defaultValue?: Date;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  minDate?: Date;
  maxDate?: Date;
  locale?: Locale;
  className?: string;
  name?: string;
  id?: string;
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const months = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const DatePicker: React.FC<DatePickerProps> = ({
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = 'Tarih seçin...',
  disabled = false,
  error = false,
  minDate,
  maxDate,
  locale = tr,
  className = '',
  name,
  id,
  clearable = false,
  size = 'md',
}) => {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<Date | null>(defaultValue || null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const [currentMonth, setCurrentMonth] = useState<Date>(value || defaultValue || new Date());

  useEffect(() => {
    if (value && (!currentMonth || !isSameDay(value, currentMonth))) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentMonth(value);
    }
  }, [value, currentMonth]);

  const handleDateSelect = (date: Date) => {
    if (isDateDisabled(date)) return;

    if (!isControlled) {
      setInternalValue(date);
    }
    onChange?.(date);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isControlled) {
      setInternalValue(null);
    }
    onChange?.(null);
  };

  const isDateDisabled = (date: Date): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    const today = new Date();
    if (!isDateDisabled(today)) {
      handleDateSelect(today);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setOpen(false);
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
    return undefined;
  }, [open]);

  const displayValue = value ? format(value, 'dd MMMM yyyy', { locale }) : '';

  return (
    <div
      ref={pickerRef}
      className={`date-picker date-picker-${size} ${disabled ? 'date-picker-disabled' : ''} ${error ? 'date-picker-error' : ''} ${className}`}
    >
      <input type="hidden" name={name} value={value ? format(value, 'yyyy-MM-dd') : ''} id={id} />
      <button
        type="button"
        className="date-picker-trigger"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Calendar size={18} className="date-picker-icon" />
        <span className={`date-picker-value ${!value ? 'date-picker-placeholder' : ''}`}>
          {displayValue || placeholder}
        </span>
        {clearable && value && !disabled && (
          <button
            type="button"
            className="date-picker-clear"
            onClick={handleClear}
            aria-label="Temizle"
          >
            <X size={16} />
          </button>
        )}
      </button>

      {typeof window !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className="date-picker-overlay" onClick={() => setOpen(false)}>
                <motion.div
                  className="date-picker-content"
                  onClick={(e) => e.stopPropagation()}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  role="dialog"
                  aria-modal="true"
                >
                  {/* Calendar Header */}
                  <div className="date-picker-header">
                    <button
                      type="button"
                      className="date-picker-nav-button"
                      onClick={handlePrevMonth}
                      aria-label="Önceki ay"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="date-picker-month-year">
                      {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </div>
                    <button
                      type="button"
                      className="date-picker-nav-button"
                      onClick={handleNextMonth}
                      aria-label="Sonraki ay"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  {/* Week Days */}
                  <div className="date-picker-weekdays">
                    {weekDays.map((day) => (
                      <div key={day} className="date-picker-weekday">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="date-picker-days">
                    {getCalendarDays().map((day, index) => {
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isSelected = value && isSameDay(day, value);
                      const isTodayDate = isToday(day);
                      const isDisabled = isDateDisabled(day);

                      return (
                        <button
                          key={index}
                          type="button"
                          className={`date-picker-day ${!isCurrentMonth ? 'date-picker-day-other-month' : ''} ${isSelected ? 'date-picker-day-selected' : ''} ${isTodayDate ? 'date-picker-day-today' : ''} ${isDisabled ? 'date-picker-day-disabled' : ''}`}
                          onClick={() => handleDateSelect(day)}
                          disabled={isDisabled}
                          aria-label={format(day, 'dd MMMM yyyy', { locale })}
                        >
                          {format(day, 'd')}
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="date-picker-footer">
                    <button
                      type="button"
                      className="date-picker-today-button"
                      onClick={handleToday}
                      disabled={isDateDisabled(new Date())}
                    >
                      Bugün
                    </button>
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

export default DatePicker;

