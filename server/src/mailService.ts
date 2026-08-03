import nodemailer from 'nodemailer';
import { config } from './config/environment';

// Render's free instances block outbound traffic on the SMTP ports (25, 465,
// 587), so a nodemailer connect there never completes: the request hangs until
// the proxy gives up with a 502. When RESEND_API_KEY is set we send over the
// Resend HTTPS API instead, which is unaffected by that block. SMTP stays as
// the fallback for local development and self-hosted deploys.
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const RESEND_TIMEOUT_MS = 15000;

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: false, // 587 için genellikle false
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  },
  // Without these, a blocked/unreachable SMTP host hangs past the client's
  // 120s axios timeout (client aborts with no response, request never
  // fails server-side to report a real error).
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

async function sendViaResend(to: string, subject: string, content: string, isHtml: boolean) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.MAIL_FROM,
      to: [to],
      subject,
      // MAIL_FROM is a send-only address with no mailbox behind it, so replies
      // would go nowhere without this.
      ...(config.MAIL_REPLY_TO ? { reply_to: [config.MAIL_REPLY_TO] } : {}),
      ...(isHtml ? { html: content } : { text: content }),
    }),
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
  });

  const payload = (await response.json().catch(() => null)) as {
    id?: string;
    message?: string;
    name?: string;
  } | null;

  if (!response.ok) {
    const detail = payload?.message || payload?.name || `HTTP ${response.status}`;
    throw new Error(`Resend gönderimi başarısız: ${detail}`);
  }

  return { messageId: payload?.id ?? '' };
}

export async function sendMail(to: string, subject: string, content: string, isHtml = true) {
  if (config.RESEND_API_KEY) {
    return sendViaResend(to, subject, content, isHtml);
  }

  const info = await transporter.sendMail({
    from: config.MAIL_FROM,
    to,
    subject,
    replyTo: config.MAIL_REPLY_TO || undefined,
    text: isHtml ? undefined : content,
    html: isHtml ? content : undefined,
  });
  return info;
}

export async function sendVerificationEmail(to: string, code: string, userName: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
      <h2 style="color: #1e293b; text-align: center; margin-bottom: 8px;">Tofaş Fen Lisesi</h2>
      <p style="color: #475569; text-align: center; margin-bottom: 24px;">E-posta Doğrulama</p>
      <div style="background: #ffffff; border-radius: 8px; padding: 24px; text-align: center;">
        <p style="color: #334155; margin-bottom: 4px;">Merhaba <strong>${userName}</strong>,</p>
        <p style="color: #64748b; margin-bottom: 24px;">E-posta adresinizi doğrulamak için aşağıdaki kodu kullanın:</p>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${code}</span>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">Bu kod 15 dakika içinde geçerliliğini yitirecektir.</p>
      </div>
    </div>
  `;

  return sendMail(to, 'E-posta Doğrulama Kodu - Tofaş Fen Lisesi', html);
}

export async function sendTwoFactorEmail(to: string, code: string, userName: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
      <h2 style="color: #1e293b; text-align: center; margin-bottom: 8px;">Tofaş Fen Lisesi</h2>
      <p style="color: #475569; text-align: center; margin-bottom: 24px;">İki Faktörlü Doğrulama</p>
      <div style="background: #ffffff; border-radius: 8px; padding: 24px; text-align: center;">
        <p style="color: #334155; margin-bottom: 4px;">Merhaba <strong>${userName}</strong>,</p>
        <p style="color: #64748b; margin-bottom: 24px;">Giriş yapmak için aşağıdaki doğrulama kodunu kullanın:</p>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${code}</span>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">Bu kod 5 dakika içinde geçerliliğini yitirecektir.</p>
        <p style="color: #94a3b8; font-size: 13px;">Eğer bu girişi siz yapmadıysanız, lütfen şifrenizi değiştirin.</p>
      </div>
    </div>
  `;

  return sendMail(to, 'Giriş Doğrulama Kodu - Tofaş Fen Lisesi', html);
}
