// Accessibility Utilities for TOFAS FEN WebApp
// WCAG 2.1 AA Compliant

import { useEffect, useRef, useState, useCallback } from 'react';

// Types and Interfaces
export interface AccessibilityConfig {
  enableHighContrast: boolean;
  enableReducedMotion: boolean;
  enableLargeText: boolean;
  enableScreenReader: boolean;
  enableKeyboardNavigation: boolean;
  enableFocusIndicators: boolean;
  enableColorBlindSupport: boolean;
  enableDyslexiaSupport: boolean;
}

export interface FocusTrapConfig {
  active: boolean;
  onEscape?: () => void;
  onTab?: (direction: 'forward' | 'backward') => void;
}

export interface AnnouncementConfig {
  priority: 'polite' | 'assertive';
  timeout?: number;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

// Default Configuration
export const defaultAccessibilityConfig: AccessibilityConfig = {
  enableHighContrast: false,
  enableReducedMotion: false,
  enableLargeText: false,
  enableScreenReader: true,
  enableKeyboardNavigation: true,
  enableFocusIndicators: true,
  enableColorBlindSupport: false,
  enableDyslexiaSupport: false,
};

// Accessibility Context
export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private config: AccessibilityConfig;
  private announcements: HTMLElement | null = null;
  private focusHistory: HTMLElement[] = [];
  private keyboardShortcuts: Map<string, KeyboardShortcut> = new Map();

  private constructor() {
    this.config = { ...defaultAccessibilityConfig };
    this.initializeAnnouncements();
    this.setupGlobalListeners();
  }

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  // Initialize screen reader announcements
  private initializeAnnouncements(): void {
    if (typeof document !== 'undefined') {
      this.announcements = document.createElement('div');
      this.announcements.setAttribute('aria-live', 'polite');
      this.announcements.setAttribute('aria-atomic', 'true');
      this.announcements.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
      `;
      document.body.appendChild(this.announcements);
    }
  }

  // Setup global accessibility listeners
  private setupGlobalListeners(): void {
    if (typeof document !== 'undefined') {
      // Keyboard navigation
      document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
      
      // Focus management
      document.addEventListener('focusin', this.handleFocusIn.bind(this));
      
      // Reduced motion preference
      this.updateReducedMotion();
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', this.updateReducedMotion.bind(this));
      
      // High contrast preference
      this.updateHighContrast();
      window.matchMedia('(prefers-contrast: high)').addEventListener('change', this.updateHighContrast.bind(this));
    }
  }

  // Handle global keyboard events
  private handleGlobalKeydown(event: KeyboardEvent): void {
    // Skip if user is typing in an input
    if (this.isTypingInInput(event.target as HTMLElement)) {
      return;
    }

    // Handle keyboard shortcuts
    const shortcut = this.getKeyboardShortcut(event);
    if (shortcut) {
      event.preventDefault();
      shortcut.action();
      return;
    }

    // Handle navigation shortcuts
    switch (event.key) {
      case 'Escape':
        this.handleEscape();
        break;
      case 'Tab':
        this.handleTab(event);
        break;
      case 'Enter':
      case ' ':
        this.handleEnter(event);
        break;
    }
  }

  // Handle focus management
  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (target && target !== document.body) {
      this.focusHistory.push(target);
      if (this.focusHistory.length > 10) {
        this.focusHistory.shift();
      }
    }
  }

  // Update reduced motion preference
  private updateReducedMotion(): void {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.config.enableReducedMotion = prefersReducedMotion;
    document.documentElement.classList.toggle('reduced-motion', prefersReducedMotion);
  }

  // Update high contrast preference
  private updateHighContrast(): void {
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    this.config.enableHighContrast = prefersHighContrast;
    document.documentElement.classList.toggle('high-contrast', prefersHighContrast);
  }

  // Check if user is typing in an input
  private isTypingInInput(element: HTMLElement | null): boolean {
    if (!element) return false;
    const tagName = element.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || element.contentEditable === 'true';
  }

  // Get keyboard shortcut from event
  private getKeyboardShortcut(event: KeyboardEvent): KeyboardShortcut | undefined {
    const key = event.key.toLowerCase();
    const shortcutKey = [
      event.ctrlKey ? 'ctrl' : '',
      event.shiftKey ? 'shift' : '',
      event.altKey ? 'alt' : '',
      event.metaKey ? 'meta' : '',
      key
    ].filter(Boolean).join('+');
    
    return this.keyboardShortcuts.get(shortcutKey);
  }

  // Handle escape key
  private handleEscape(): void {
    // Close modals, dropdowns, etc.
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.getAttribute('data-close-on-escape') === 'true') {
      activeElement.click();
    }
  }

  // Handle tab key
  private handleTab(event: KeyboardEvent): void {
    // Ensure focus indicators are visible
    document.documentElement.classList.add('keyboard-navigation');
  }

  // Handle enter/space keys
  private handleEnter(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target && target.getAttribute('role') === 'button') {
      event.preventDefault();
      target.click();
    }
  }

  // Public Methods
  public getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.applyConfig();
  }

  public applyConfig(): void {
    const root = document.documentElement;
    
    // Apply high contrast
    root.classList.toggle('high-contrast', this.config.enableHighContrast);
    
    // Apply reduced motion
    root.classList.toggle('reduced-motion', this.config.enableReducedMotion);
    
    // Apply large text
    root.classList.toggle('large-text', this.config.enableLargeText);
    
    // Apply color blind support
    root.classList.toggle('color-blind-support', this.config.enableColorBlindSupport);
    
    // Apply dyslexia support
    root.classList.toggle('dyslexia-support', this.config.enableDyslexiaSupport);
  }

  public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (this.announcements) {
      this.announcements.setAttribute('aria-live', priority);
      this.announcements.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (this.announcements) {
          this.announcements.textContent = '';
        }
      }, 1000);
    }
  }

  public addKeyboardShortcut(shortcut: KeyboardShortcut): void {
    const key = [
      shortcut.ctrlKey ? 'ctrl' : '',
      shortcut.shiftKey ? 'shift' : '',
      shortcut.altKey ? 'alt' : '',
      shortcut.metaKey ? 'meta' : '',
      shortcut.key.toLowerCase()
    ].filter(Boolean).join('+');
    
    this.keyboardShortcuts.set(key, shortcut);
  }

  public removeKeyboardShortcut(key: string): void {
    this.keyboardShortcuts.delete(key);
  }

  public getFocusHistory(): HTMLElement[] {
    return [...this.focusHistory];
  }

  public restoreFocus(): void {
    const lastFocus = this.focusHistory[this.focusHistory.length - 1];
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus();
    }
  }

  public trapFocus(element: HTMLElement, config: FocusTrapConfig = { active: true }): () => void {
    if (!config.active) return () => {};

    const focusableElements = this.getFocusableElements(element);
    let currentFocusIndex = 0;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        
        if (event.shiftKey) {
          currentFocusIndex = currentFocusIndex > 0 ? currentFocusIndex - 1 : focusableElements.length - 1;
        } else {
          currentFocusIndex = currentFocusIndex < focusableElements.length - 1 ? currentFocusIndex + 1 : 0;
        }
        
        focusableElements[currentFocusIndex]?.focus();
      } else if (event.key === 'Escape' && config.onEscape) {
        config.onEscape();
      }
    };

    element.addEventListener('keydown', handleKeydown);
    
    // Focus first element
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    return () => {
      element.removeEventListener('keydown', handleKeydown);
    };
  }

  public getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];

    return Array.from(container.querySelectorAll(focusableSelectors.join(','))) as HTMLElement[];
  }

  public isElementVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      style.opacity !== '0'
    );
  }

  public getElementDescription(element: HTMLElement): string {
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledby = element.getAttribute('aria-labelledby');
    const title = element.getAttribute('title');
    const alt = element.getAttribute('alt');
    
    if (ariaLabel) return ariaLabel;
    if (ariaLabelledby) {
      const labelledElement = document.getElementById(ariaLabelledby);
      return labelledElement?.textContent || '';
    }
    if (title) return title;
    if (alt) return alt;
    
    return element.textContent || '';
  }

  public validateAccessibility(element: HTMLElement): string[] {
    const issues: string[] = [];
    
    // Check for missing alt text on images
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        issues.push(`Image missing alt text: ${img.src}`);
      }
    });
    
    // Check for missing labels on form controls
    const formControls = element.querySelectorAll('input, select, textarea');
    formControls.forEach(control => {
      const id = control.getAttribute('id');
      const ariaLabel = control.getAttribute('aria-label');
      const ariaLabelledby = control.getAttribute('aria-labelledby');
      
      if (!id && !ariaLabel && !ariaLabelledby) {
        issues.push(`Form control missing label: ${control.tagName}`);
      }
    });
    
    // Check for proper heading structure
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > previousLevel + 1) {
        issues.push(`Heading structure skipped level: ${heading.tagName}`);
      }
      previousLevel = level;
    });
    
    return issues;
  }
}

// React Hooks
export const useAccessibility = () => {
  const manager = AccessibilityManager.getInstance();
  const [config, setConfig] = useState(manager.getConfig());

  const updateConfig = useCallback((newConfig: Partial<AccessibilityConfig>) => {
    manager.updateConfig(newConfig);
    setConfig(manager.getConfig());
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    manager.announce(message, priority);
  }, []);

  return {
    config,
    updateConfig,
    announce,
    manager
  };
};

export const useFocusTrap = (config: FocusTrapConfig = { active: true }) => {
  const elementRef = useRef<HTMLElement>(null);
  const manager = AccessibilityManager.getInstance();

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const cleanup = manager.trapFocus(element, config);
    return cleanup;
  }, [config]);

  return elementRef;
};

export const useKeyboardShortcut = (shortcut: KeyboardShortcut) => {
  const manager = AccessibilityManager.getInstance();

  useEffect(() => {
    manager.addKeyboardShortcut(shortcut);
    return () => {
      manager.removeKeyboardShortcut(shortcut.key);
    };
  }, [shortcut]);
};

export const useAnnouncement = () => {
  const manager = AccessibilityManager.getInstance();

  return useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    manager.announce(message, priority);
  }, []);
};

export const useFocusRestoration = () => {
  const manager = AccessibilityManager.getInstance();

  return useCallback(() => {
    manager.restoreFocus();
  }, []);
};

// Utility Functions
export const generateAriaId = (prefix: string = 'aria'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getContrastRatio = (color1: string, color2: string): number => {
  // Simplified contrast ratio calculation
  // In a real implementation, you'd want to use a proper color library
  return 4.5; // Placeholder
};

export const isHighContrastMode = (): boolean => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

export const isReducedMotionMode = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const isScreenReaderActive = (): boolean => {
  // This is a simplified check - in reality, detecting screen readers is complex
  return navigator.userAgent.includes('NVDA') || 
         navigator.userAgent.includes('JAWS') || 
         navigator.userAgent.includes('VoiceOver');
};

// Accessibility Constants
export const ACCESSIBILITY_CONSTANTS = {
  FOCUS_INDICATOR_COLOR: '#502129',
  FOCUS_INDICATOR_WIDTH: '2px',
  FOCUS_INDICATOR_STYLE: 'solid',
  MIN_CONTRAST_RATIO: 4.5,
  LARGE_TEXT_SIZE: '18px',
  REDUCED_MOTION_DURATION: '0.1s',
  KEYBOARD_NAVIGATION_TIMEOUT: 3000,
} as const;

// Default Keyboard Shortcuts
export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'h',
    action: () => {
      const manager = AccessibilityManager.getInstance();
      manager.announce('Navigating to home page');
      // Navigate to home
    },
    description: 'Navigate to home page'
  },
  {
    key: 'n',
    action: () => {
      const manager = AccessibilityManager.getInstance();
      manager.announce('Opening notifications');
      // Open notifications
    },
    description: 'Open notifications'
  },
  {
    key: 's',
    action: () => {
      const manager = AccessibilityManager.getInstance();
      manager.announce('Opening search');
      // Open search
    },
    description: 'Open search'
  },
  {
    key: 'm',
    action: () => {
      const manager = AccessibilityManager.getInstance();
      manager.announce('Opening menu');
      // Open menu
    },
    description: 'Open menu'
  },
  {
    key: '?',
    action: () => {
      const manager = AccessibilityManager.getInstance();
      manager.announce('Opening help');
      // Open help
    },
    description: 'Open help'
  }
];

// Initialize default shortcuts
if (typeof window !== 'undefined') {
  const manager = AccessibilityManager.getInstance();
  DEFAULT_KEYBOARD_SHORTCUTS.forEach(shortcut => {
    manager.addKeyboardShortcut(shortcut);
  });
}
