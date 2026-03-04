import nodemailer from "nodemailer";
import { config } from "./config/environment";

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: false, // 587 için genellikle false
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  },
});

export async function sendMail(to: string, subject: string, content: string, isHtml = true) {
  const info = await transporter.sendMail({
    from: config.SMTP_FROM,
    to,
    subject,
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

  return sendMail(to, "E-posta Doğrulama Kodu - Tofaş Fen Lisesi", html);
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

  return sendMail(to, "Giriş Doğrulama Kodu - Tofaş Fen Lisesi", html);
}

