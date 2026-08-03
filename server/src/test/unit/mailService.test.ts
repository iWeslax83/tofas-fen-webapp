import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { sendMailMock } = vi.hoisted(() => ({
  sendMailMock: vi.fn().mockResolvedValue({ messageId: 'smtp-message-id' }),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
  },
}));

vi.mock('../../config/environment', () => ({
  config: {
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: 587,
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    SMTP_FROM: 'noreply@example.com',
    MAIL_FROM: 'noreply@example.com',
    RESEND_API_KEY: '',
  },
}));

import { sendMail } from '../../mailService';
import { config } from '../../config/environment';

describe('mailService transport selection', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    sendMailMock.mockClear();
    (config as any).RESEND_API_KEY = '';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('falls back to SMTP when RESEND_API_KEY is unset', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as any;

    const info = await sendMail('student@example.com', 'Konu', '<p>merhaba</p>');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledOnce();
    expect(info).toEqual({ messageId: 'smtp-message-id' });
  });

  it('sends over the Resend HTTPS API when RESEND_API_KEY is set', async () => {
    (config as any).RESEND_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'resend-message-id' }),
    });
    global.fetch = fetchMock as any;

    const info = await sendMail('student@example.com', 'Konu', '<p>merhaba</p>');

    expect(sendMailMock).not.toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(JSON.parse(init.body)).toMatchObject({
      from: 'noreply@example.com',
      to: ['student@example.com'],
      subject: 'Konu',
      html: '<p>merhaba</p>',
    });
    expect(info).toEqual({ messageId: 'resend-message-id' });
  });

  it('sends plain text when isHtml is false', async () => {
    (config as any).RESEND_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'resend-message-id' }),
    });
    global.fetch = fetchMock as any;

    await sendMail('student@example.com', 'Konu', 'düz metin', false);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.text).toBe('düz metin');
    expect(body.html).toBeUndefined();
  });

  it('throws with the Resend error detail on a failed send', async () => {
    (config as any).RESEND_API_KEY = 'test-key';
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ message: 'domain is not verified' }),
    }) as any;

    await expect(sendMail('student@example.com', 'Konu', '<p>merhaba</p>')).rejects.toThrow(
      /domain is not verified/,
    );
  });
});
