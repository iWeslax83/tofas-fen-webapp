import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useUIStore } from '../uiStore';

beforeEach(() => {
  act(() => {
    useUIStore.getState().resetUI();
  });
});

describe('uiStore', () => {
  describe('sidebar', () => {
    it('initializes with sidebar open and not collapsed', () => {
      const state = useUIStore.getState();
      expect(state.sidebarOpen).toBe(true);
      expect(state.sidebarCollapsed).toBe(false);
    });

    it('setSidebarOpen changes state', () => {
      act(() => useUIStore.getState().setSidebarOpen(false));
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it('toggleSidebar flips state', () => {
      act(() => useUIStore.getState().toggleSidebar());
      expect(useUIStore.getState().sidebarOpen).toBe(false);
      act(() => useUIStore.getState().toggleSidebar());
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('setSidebarCollapsed changes state', () => {
      act(() => useUIStore.getState().setSidebarCollapsed(true));
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    });

    it('toggleSidebarCollapsed flips state', () => {
      act(() => useUIStore.getState().toggleSidebarCollapsed());
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    });
  });

  describe('mobile menu', () => {
    it('initializes closed', () => {
      expect(useUIStore.getState().mobileMenuOpen).toBe(false);
    });

    it('setMobileMenuOpen changes state', () => {
      act(() => useUIStore.getState().setMobileMenuOpen(true));
      expect(useUIStore.getState().mobileMenuOpen).toBe(true);
    });

    it('toggleMobileMenu flips state', () => {
      act(() => useUIStore.getState().toggleMobileMenu());
      expect(useUIStore.getState().mobileMenuOpen).toBe(true);
      act(() => useUIStore.getState().toggleMobileMenu());
      expect(useUIStore.getState().mobileMenuOpen).toBe(false);
    });
  });

  describe('search', () => {
    it('initializes with search closed and empty query', () => {
      const state = useUIStore.getState();
      expect(state.searchOpen).toBe(false);
      expect(state.searchQuery).toBe('');
    });

    it('setSearchOpen changes state', () => {
      act(() => useUIStore.getState().setSearchOpen(true));
      expect(useUIStore.getState().searchOpen).toBe(true);
    });

    it('setSearchQuery updates query', () => {
      act(() => useUIStore.getState().setSearchQuery('test'));
      expect(useUIStore.getState().searchQuery).toBe('test');
    });

    it('clearSearch resets query and closes search', () => {
      act(() => {
        useUIStore.getState().setSearchOpen(true);
        useUIStore.getState().setSearchQuery('hello');
      });
      act(() => useUIStore.getState().clearSearch());
      expect(useUIStore.getState().searchOpen).toBe(false);
      expect(useUIStore.getState().searchQuery).toBe('');
    });
  });

  describe('theme', () => {
    it('initializes with system theme and blue color scheme', () => {
      const state = useUIStore.getState();
      expect(state.theme).toBe('system');
      expect(state.colorScheme).toBe('blue');
    });

    it('setTheme changes theme', () => {
      act(() => useUIStore.getState().setTheme('dark'));
      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('setColorScheme changes color scheme', () => {
      act(() => useUIStore.getState().setColorScheme('green'));
      expect(useUIStore.getState().colorScheme).toBe('green');
    });
  });

  describe('loading', () => {
    it('initializes with no loading', () => {
      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(false);
      expect(state.loadingMessage).toBeNull();
    });

    it('setGlobalLoading sets loading with message', () => {
      act(() => useUIStore.getState().setGlobalLoading(true, 'Loading...'));
      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(true);
      expect(state.loadingMessage).toBe('Loading...');
    });

    it('setGlobalLoading without message sets null', () => {
      act(() => useUIStore.getState().setGlobalLoading(true));
      expect(useUIStore.getState().loadingMessage).toBeNull();
    });
  });

  describe('modal', () => {
    it('initializes with no active modal', () => {
      const state = useUIStore.getState();
      expect(state.activeModal).toBeNull();
      expect(state.modalData).toBeNull();
    });

    it('setActiveModal opens a modal with data', () => {
      act(() => useUIStore.getState().setActiveModal('confirm', { id: 1 }));
      const state = useUIStore.getState();
      expect(state.activeModal).toBe('confirm');
      expect(state.modalData).toEqual({ id: 1 });
    });

    it('closeModal resets modal state', () => {
      act(() => useUIStore.getState().setActiveModal('edit', { name: 'test' }));
      act(() => useUIStore.getState().closeModal());
      const state = useUIStore.getState();
      expect(state.activeModal).toBeNull();
      expect(state.modalData).toBeNull();
    });
  });

  describe('resetUI', () => {
    it('resets all state to initial values', () => {
      act(() => {
        const s = useUIStore.getState();
        s.setSidebarOpen(false);
        s.setMobileMenuOpen(true);
        s.setSearchQuery('test');
        s.setTheme('dark');
        s.setColorScheme('purple');
        s.setGlobalLoading(true, 'msg');
        s.setActiveModal('modal', { x: 1 });
      });
      act(() => useUIStore.getState().resetUI());
      const state = useUIStore.getState();
      expect(state.sidebarOpen).toBe(true);
      expect(state.mobileMenuOpen).toBe(false);
      expect(state.searchQuery).toBe('');
      expect(state.theme).toBe('system');
      expect(state.colorScheme).toBe('blue');
      expect(state.globalLoading).toBe(false);
      expect(state.activeModal).toBeNull();
    });
  });
});
