/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../api', () => ({
  apiClient: {
    get: apiMocks.get,
    post: apiMocks.post,
  },
}));

import { analytics } from '../analytics';

describe('Analytics — page views & actions', () => {
  beforeEach(() => {
    apiMocks.post.mockReset();
    apiMocks.get.mockReset();
  });

  it('trackPageView posts the path + a metadata envelope', async () => {
    apiMocks.post.mockResolvedValueOnce({ data: { success: true } });
    await analytics.trackPageView('/dashboard', { foo: 'bar' });

    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    const [url, body] = apiMocks.post.mock.calls[0];
    expect(url).toBe('/api/analytics/tracking');
    expect(body.path).toBe('/dashboard');
    expect(body.metadata.foo).toBe('bar');
    expect(typeof body.metadata.sessionId).toBe('string');
    expect(typeof body.metadata.timestamp).toBe('string');
    expect(typeof body.metadata.userAgent).toBe('string');
  });

  it('trackPageView swallows API errors silently', async () => {
    apiMocks.post.mockRejectedValueOnce(new Error('network'));
    await expect(analytics.trackPageView('/x')).resolves.toBeUndefined();
  });

  it('trackAction posts the action + metadata envelope', async () => {
    apiMocks.post.mockResolvedValueOnce({ data: { success: true } });
    await analytics.trackAction('clicked_save', { id: 7 });

    const [url, body] = apiMocks.post.mock.calls[0];
    expect(url).toBe('/api/analytics/action');
    expect(body.action).toBe('clicked_save');
    expect(body.metadata.id).toBe(7);
    expect(typeof body.metadata.sessionId).toBe('string');
  });

  it('trackAction swallows API errors silently', async () => {
    apiMocks.post.mockRejectedValueOnce(new Error('network'));
    await expect(analytics.trackAction('x')).resolves.toBeUndefined();
  });
});

describe('Analytics — submitFeedback', () => {
  beforeEach(() => {
    apiMocks.post.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('passes the feedback through and returns the server payload', async () => {
    apiMocks.post.mockResolvedValueOnce({
      data: { success: true, data: { id: 'fb-1' } },
    });
    const out = await analytics.submitFeedback({
      type: 'bug',
      category: 'ui',
      title: 't',
      description: 'd',
    });
    expect(out).toEqual({ success: true, data: { id: 'fb-1' } });
    expect(apiMocks.post).toHaveBeenCalledWith('/api/analytics/feedback', {
      type: 'bug',
      category: 'ui',
      title: 't',
      description: 'd',
    });
  });

  it('returns success=false + the underlying error message on failure', async () => {
    apiMocks.post.mockRejectedValueOnce(new Error('upstream down'));
    const out = await analytics.submitFeedback({
      type: 'bug',
      category: 'ui',
      title: 't',
      description: 'd',
    });
    expect(out.success).toBe(false);
    expect(out.error).toBe('upstream down');
  });

  it('falls back to "Unknown error" when the rejection is not an Error', async () => {
    apiMocks.post.mockRejectedValueOnce('plain string');
    const out = await analytics.submitFeedback({
      type: 'bug',
      category: 'ui',
      title: 't',
      description: 'd',
    });
    expect(out.success).toBe(false);
    expect(out.error).toBe('Unknown error');
  });
});

describe('Analytics — getUserMetrics', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns the inner data field when the API succeeds', async () => {
    apiMocks.get.mockResolvedValueOnce({
      data: { success: true, data: { events: 42 } },
    });
    const out = await analytics.getUserMetrics();
    expect(out).toEqual({ events: 42 });
  });

  it('returns null when success=false', async () => {
    apiMocks.get.mockResolvedValueOnce({ data: { success: false } });
    expect(await analytics.getUserMetrics()).toBeNull();
  });

  it('appends startDate / endDate query params when supplied', async () => {
    apiMocks.get.mockResolvedValueOnce({ data: { success: true, data: 1 } });
    const start = new Date('2026-04-01T00:00:00Z');
    const end = new Date('2026-04-30T00:00:00Z');
    await analytics.getUserMetrics(start, end);
    const url = apiMocks.get.mock.calls[0][0] as string;
    expect(url).toContain('startDate=' + encodeURIComponent(start.toISOString()));
    expect(url).toContain('endDate=' + encodeURIComponent(end.toISOString()));
  });

  it('returns null when the request rejects', async () => {
    apiMocks.get.mockRejectedValueOnce(new Error('boom'));
    expect(await analytics.getUserMetrics()).toBeNull();
  });
});
