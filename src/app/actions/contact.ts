"use server";

import nodemailer from "nodemailer";
import clientPromise from "@/lib/mongodb";
import { getCopy } from "@/lib/content";
import { getSiteSettings } from "@/lib/site-settings";

const DB_NAME = process.env.MONGODB_DB || "petalytix";
const COLLECTION = "contact_messages";

type ContactState = { ok: boolean; message: string };

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST || "";
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || user;

  return {
    host,
    port,
    secure,
    user,
    pass,
    from
  };
}

function hasSmtpConfig(config: SmtpConfig) {
  return Boolean(config.host && config.user && config.pass && config.from);
}

async function resolveContactRecipient() {
  if (process.env.CONTACT_TO) {
    return process.env.CONTACT_TO;
  }
  if (process.env.ADMIN_EMAIL) {
    return process.env.ADMIN_EMAIL;
  }

  try {
    const settings = await getSiteSettings();
    return settings.contactInfo.email;
  } catch (error) {
    return "";
  }
}

function buildMessageDetails({
  name,
  email,
  phone,
  company,
  message,
  locale
}: {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  locale: string;
}) {
  const lines = [
    "New contact form submission",
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : "",
    company ? `Company: ${company}` : "",
    `Locale: ${locale}`,
    "",
    "Message:",
    message
  ];

  return lines.filter(Boolean).join("\n");
}

export async function submitContact(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const locale = String(formData.get("locale") || "en");
  const copy = getCopy(locale);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const company = String(formData.get("company") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!name || !email || !message) {
    return { ok: false, message: copy.form.error };
  }

  try {
    const client = await clientPromise;
    await client.db(DB_NAME).collection(COLLECTION).insertOne({
      name,
      email,
      phone,
      company,
      message,
      createdAt: new Date()
    });
  } catch (error) {
  }

  const smtpConfig = getSmtpConfig();
  const recipient = await resolveContactRecipient();
  if (!hasSmtpConfig(smtpConfig) || !recipient) {
    return {
      ok: false,
      message: copy.form.deliveryError
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass
    }
  });

  try {
    await transporter.sendMail({
      from: smtpConfig.from,
      to: recipient,
      replyTo: email,
      subject: `New contact message from ${name}`,
      text: buildMessageDetails({
        name,
        email,
        phone,
        company,
        message,
        locale
      })
    });
  } catch (error) {
    return {
      ok: false,
      message: copy.form.deliveryError
    };
  }

  return { ok: true, message: copy.form.success };
}
