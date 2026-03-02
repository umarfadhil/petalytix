"use server";

import nodemailer from "nodemailer";
import { getAyaKasirCopy } from "@/lib/ayakasir-content";

type DeleteAccountState = { ok: boolean; message: string };

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function getSmtpConfig(): SmtpConfig {
  return {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || process.env.SMTP_USER || ""
  };
}

function hasSmtpConfig(config: SmtpConfig) {
  return Boolean(config.host && config.user && config.pass && config.from);
}

function resolveRecipient() {
  return (
    process.env.CONTACT_TO || process.env.ADMIN_EMAIL || "contact@petalytix.id"
  );
}

export async function submitDeleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  const locale = String(formData.get("locale") || "en");
  const copy = getAyaKasirCopy(locale);
  const labels = copy.deleteAccount.form;

  const email = String(formData.get("email") || "").trim();
  const reason = String(formData.get("reason") || "").trim();

  if (!email) {
    return { ok: false, message: labels.error };
  }

  const smtpConfig = getSmtpConfig();
  const recipient = resolveRecipient();

  if (!hasSmtpConfig(smtpConfig)) {
    return { ok: false, message: labels.deliveryError };
  }

  const lines = [
    "AyaKasir - Delete Account Request",
    `Email: ${email}`,
    reason ? `Reason: ${reason}` : "",
    `Locale: ${locale}`,
    `Submitted at: ${new Date().toISOString()}`
  ];
  const text = lines.filter(Boolean).join("\n");

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: { user: smtpConfig.user, pass: smtpConfig.pass }
  });

  try {
    await transporter.sendMail({
      from: smtpConfig.from,
      to: recipient,
      replyTo: email,
      subject: `AyaKasir - Delete Account Request from ${email}`,
      text
    });
  } catch {
    return { ok: false, message: labels.deliveryError };
  }

  return { ok: true, message: labels.success };
}
