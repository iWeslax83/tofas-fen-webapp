import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useNotes, useStudentNotes, useNoteStats, useCreateNote, useUpdateNote, useDeleteNote } from '../noteQueries';

// Mock SecureAPI
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('../../../utils/api', () => ({
  SecureAPI: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    put: (...args: any[]) => mockPut(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockNotes = [
  { id: '1', studentName: 'Ali Yılmaz', lesson: 'Matematik', exam1: 80, exam2: 90, oral: 85, average: 85 },
  { id: '2', studentName: 'Ali Yılmaz', lesson: 'Fizik', exam1: 70, exam2: 75, oral: 80, average: 75 },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useNotes', () => {
  it('fetches notes successfully', async () => {
    // SecureAPI.get returns AxiosResponse; hook extracts .data to get the body
    mockGet.mockResolvedValueOnce({ data: { success: true, data: mockNotes } });
    const { result } = renderHook(() => useNotes(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toEqual(mockNotes);
  });

  it('passes filters as query params', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: [] } });
    renderHook(() => useNotes({ donem: '2024-1', sinif: '10' }), { wrapper: createWrapper() });
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet.mock.calls[0][0]).toContain('donem=2024-1');
    expect(mockGet.mock.calls[0][0]).toContain('sinif=10');
  });

  it('handles API error', async () => {
    mockGet.mockResolvedValue({ data: { success: false, error: '404 Notlar bulunamadı' } });
    const { result } = renderHook(() => useNotes(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('handles network error', async () => {
    mockGet.mockRejectedValue(new Error('400 Network error'));
    const { result } = renderHook(() => useNotes(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useStudentNotes', () => {
  it('fetches notes for a specific student', async () => {
    mockGet.mockResolvedValueOnce({ success: true, data: mockNotes });
    const { result } = renderHook(() => useStudentNotes('student-123'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('studentId=student-123'));
  });

  it('does not fetch when studentId is empty', async () => {
    renderHook(() => useStudentNotes(''), { wrapper: createWrapper() });
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe('useNoteStats', () => {
  it('fetches note statistics', async () => {
    const stats = { average: 78, total: 10 };
    mockGet.mockResolvedValueOnce({ success: true, data: stats });
    const { result } = renderHook(() => useNoteStats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toEqual(stats);
  });
});

describe('useCreateNote', () => {
  it('creates a note and returns success', async () => {
    mockPost.mockResolvedValueOnce({ success: true, data: { id: '3' }, message: 'Not eklendi' });
    const { result } = renderHook(() => useCreateNote(), { wrapper: createWrapper() });
    result.current.mutate({ adSoyad: 'Test', ders: 'Biyoloji', sinav1: 90, sinav2: 85, sozlu: 88 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith('/api/notes', expect.objectContaining({ ders: 'Biyoloji' }));
  });
});

describe('useUpdateNote', () => {
  it('updates a note', async () => {
    mockPut.mockResolvedValueOnce({ success: true, message: 'Not güncellendi' });
    const { result } = renderHook(() => useUpdateNote(), { wrapper: createWrapper() });
    result.current.mutate({ id: '1', sinav1: 95 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPut).toHaveBeenCalledWith('/api/notes/1', { sinav1: 95 });
  });
});

describe('useDeleteNote', () => {
  it('deletes a note', async () => {
    mockDelete.mockResolvedValueOnce({ success: true, message: 'Not silindi' });
    const { result } = renderHook(() => useDeleteNote(), { wrapper: createWrapper() });
    result.current.mutate('1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDelete).toHaveBeenCalledWith('/api/notes/1');
  });

  it('handles delete failure', async () => {
    mockDelete.mockResolvedValueOnce({ success: false, error: 'Yetki yok' });
    const { result } = renderHook(() => useDeleteNote(), { wrapper: createWrapper() });
    result.current.mutate('1');
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
