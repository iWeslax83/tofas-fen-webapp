/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('../../utils/api', () => ({
  SecureAPI: {
    get: apiMocks.get,
    patch: apiMocks.patch,
  },
}));

import { useNotifications } from '../useNotifications';

const sampleNotifications = [
  {
    _id: 'n-1',
    title: 'A',
    message: 'a',
    type: 'info' as const,
    priority: 'low' as const,
    read: false,
    createdAt: '2026-04-01',
  },
  {
    _id: 'n-2',
    title: 'B',
    message: 'b',
    type: 'info' as const,
    priority: 'low' as const,
    read: true,
    createdAt: '2026-04-01',
  },
];

describe('useNotifications', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.patch.mockReset();
  });

  it('initialises empty and is a no-op when userId is undefined', async () => {
    const { result } = renderHook(() => useNotifications(undefined));
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.isOpen).toBe(false);
    // No API call when userId is missing.
    expect(apiMocks.get).not.toHaveBeenCalled();
  });

  it('fetches on mount and exposes the notifications + unreadCount', async () => {
    apiMocks.get.mockResolvedValueOnce({
      data: { success: true, data: sampleNotifications, unreadCount: 1 },
    });
    const { result } = renderHook(() => useNotifications('u-1'));

    await waitFor(() => expect(result.current.notifications).toHaveLength(2));
    expect(result.current.unreadCount).toBe(1);
    expect(apiMocks.get).toHaveBeenCalledWith('/api/notifications/user/u-1?limit=10');
  });

  it('does not blow up when the API rejects', async () => {
    apiMocks.get.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useNotifications('u-1'));
    // Allow the rejected fetch to settle.
    await act(async () => {});
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('does not update when success=false', async () => {
    apiMocks.get.mockResolvedValueOnce({ data: { success: false } });
    const { result } = renderHook(() => useNotifications('u-1'));
    await act(async () => {});
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('setIsOpen toggles the open flag', async () => {
    apiMocks.get.mockResolvedValueOnce({
      data: { success: true, data: [], unreadCount: 0 },
    });
    const { result } = renderHook(() => useNotifications('u-1'));
    await waitFor(() => expect(result.current.notifications).toEqual([]));
    act(() => result.current.setIsOpen(true));
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.setIsOpen(false));
    expect(result.current.isOpen).toBe(false);
  });

  it('markAsRead PATCHes and decrements unreadCount', async () => {
    apiMocks.get.mockResolvedValueOnce({
      data: { success: true, data: sampleNotifications, unreadCount: 1 },
    });
    apiMocks.patch.mockResolvedValueOnce({});

    const { result } = renderHook(() => useNotifications('u-1'));
    await waitFor(() => expect(result.current.unreadCount).toBe(1));

    await act(async () => {
      await result.current.markAsRead('n-1');
    });

    expect(apiMocks.patch).toHaveBeenCalledWith('/api/notifications/n-1/read');
    const target = result.current.notifications.find((n) => n._id === 'n-1');
    expect(target?.read).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('markAsRead clamps unreadCount at 0', async () => {
    apiMocks.get.mockResolvedValueOnce({
      data: { success: true, data: sampleNotifications, unreadCount: 0 },
    });
    apiMocks.patch.mockResolvedValueOnce({});

    const { result } = renderHook(() => useNotifications('u-1'));
    await waitFor(() => expect(result.current.notifications).toHaveLength(2));

    await act(async () => {
      await result.current.markAsRead('n-1');
    });
    expect(result.current.unreadCount).toBe(0);
  });

  it('markAsRead swallows API errors silently', async () => {
    apiMocks.get.mockResolvedValueOnce({
      data: { success: true, data: sampleNotifications, unreadCount: 1 },
    });
    apiMocks.patch.mockRejectedValueOnce(new Error('500'));

    const { result } = renderHook(() => useNotifications('u-1'));
    await waitFor(() => expect(result.current.unreadCount).toBe(1));

    await expect(
      act(async () => {
        await result.current.markAsRead('n-1');
      }),
    ).resolves.toBeUndefined();

    // State stays put because the success branch doesn't run.
    expect(result.current.unreadCount).toBe(1);
  });

  it('markAllAsRead PATCHes the bulk endpoint and zeroes unreadCount', async () => {
    apiMocks.get.mockResolvedValueOnce({
      data: { success: true, data: sampleNotifications, unreadCount: 1 },
    });
    apiMocks.patch.mockResolvedValueOnce({});

    const { result } = renderHook(() => useNotifications('u-1'));
    await waitFor(() => expect(result.current.unreadCount).toBe(1));

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(apiMocks.patch).toHaveBeenCalledWith('/api/notifications/bulk-read', {
      notificationIds: ['n-1'],
    });
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
  });

  it('markAllAsRead is a no-op when there are no unread notifications', async () => {
    apiMocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [{ ...sampleNotifications[1] }],
        unreadCount: 0,
      },
    });

    const { result } = renderHook(() => useNotifications('u-1'));
    await waitFor(() => expect(result.current.notifications).toHaveLength(1));

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(apiMocks.patch).not.toHaveBeenCalled();
  });

  it('refetch is the same callback that was bound on mount and re-fires the GET', async () => {
    apiMocks.get
      .mockResolvedValueOnce({
        data: { success: true, data: sampleNotifications, unreadCount: 1 },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: [], unreadCount: 0 },
      });

    const { result } = renderHook(() => useNotifications('u-1'));
    await waitFor(() => expect(result.current.unreadCount).toBe(1));

    await act(async () => {
      await result.current.refetch();
    });

    expect(apiMocks.get).toHaveBeenCalledTimes(2);
    expect(result.current.unreadCount).toBe(0);
  });
});
