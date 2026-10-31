import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

/** SMTP genérico: funciona com Resend, SendGrid, SES, Mailgun, Gmail, Mailpit… */
export function getTransport(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

export type Mail = { to: string; subject: string; html: string; text: string; fromName: string };

export async function sendMail(mail: Mail): Promise<boolean> {
  const transport = getTransport();
  const from = process.env.MAIL_FROM;
  if (!transport || !from) {
    console.warn(`[mail] SMTP_HOST/MAIL_FROM não configurados — e-mail "${mail.subject}" não enviado`);
    return false;
  }
  await transport.sendMail({ from: `"${mail.fromName.replace(/"/g, "")}" <${from}>`, ...mail });
  return true;
}
