import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";

// mail.env dosyasını yükle
dotenv.config({ path: path.resolve(__dirname, "../../mail.env") });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // 587 için genellikle false
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMail(to: string, subject: string, content: string, isHtml = true) {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text: isHtml ? undefined : content,
    html: isHtml ? content : undefined,
  });
  return info;
} 