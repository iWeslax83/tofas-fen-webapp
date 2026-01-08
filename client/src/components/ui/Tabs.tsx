import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Tabs.css';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within Tabs');
  }
  return context;
};

// Tabs Root Component
export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  children: ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value: controlledValue,
  onValueChange: controlledOnValueChange,
  orientation = 'horizontal',
  children,
  className = '',
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const onValueChange = isControlled
    ? controlledOnValueChange || (() => {})
    : setInternalValue;

  return (
    <TabsContext.Provider value={{ value, onValueChange, orientation }}>
      <div className={`tabs tabs-${orientation} ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

// Tabs List Component
export interface TabsListProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
  fullWidth?: boolean;
}

export const TabsList: React.FC<TabsListProps> = ({
  children,
  className = '',
  variant = 'default',
  fullWidth = false,
}) => {
  const { orientation } = useTabsContext();
  return (
    <div
      className={`tabs-list tabs-list-${variant} ${fullWidth ? 'tabs-list-full-width' : ''} ${className}`}
      role="tablist"
      aria-orientation={orientation}
    >
      {children}
    </div>
  );
};

// Tabs Trigger Component
export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  badge?: ReactNode;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  className = '',
  disabled = false,
  icon,
  badge,
}) => {
  const { value: selectedValue, onValueChange } = useTabsContext();

  const isActive = selectedValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`tab-content-${value}`}
      id={`tab-trigger-${value}`}
      className={`tabs-trigger ${isActive ? 'tabs-trigger-active' : ''} ${disabled ? 'tabs-trigger-disabled' : ''} ${className}`}
      onClick={() => !disabled && onValueChange(value)}
      disabled={disabled}
      tabIndex={isActive ? 0 : -1}
    >
      {icon && <span className="tabs-trigger-icon">{icon}</span>}
      <span className="tabs-trigger-text">{children}</span>
      {badge && <span className="tabs-trigger-badge">{badge}</span>}
      {isActive && (
        <motion.div
          className="tabs-trigger-indicator"
          layoutId="tabs-indicator"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </button>
  );
};

// Tabs Content Component
export interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
  forceMount?: boolean;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
  className = '',
  forceMount = false,
}) => {
  const { value: selectedValue } = useTabsContext();
  const isActive = selectedValue === value;

  if (!isActive && !forceMount) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={value}
          role="tabpanel"
          id={`tab-content-${value}`}
          aria-labelledby={`tab-trigger-${value}`}
          className={`tabs-content ${className}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Export all components
export default {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
};

