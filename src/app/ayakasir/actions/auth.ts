"use server";

import { createServerClient } from "@/lib/supabase/server";
import {
  clearErpSessionCookie,
  createErpSession,
  getErpSession,
  setErpSessionCookie,
} from "@/lib/erp-auth";
import {
  generatePasswordSalt,
  hashPassword,
  verifyPassword,
} from "@/lib/ayakasir-password";
import type { DbUser } from "@/lib/supabase/types";

interface AuthInput {
  locale: string;
}

interface LoginInput extends AuthInput {
  email: string;
  password: string;
}

interface RegisterInput extends AuthInput {
  name: string;
  email: string;
  phone: string;
  restaurantName: string;
  pin: string;
  province: string;
  city: string;
  password: string;
  origin?: string;
}

interface ChangePasswordInput extends AuthInput {
  currentPassword: string;
  newPassword: string;
}

interface ActionResult {
  ok: boolean;
  message?: string;
}

function isIdLocale(locale: string) {
  return locale === "id";
}

async function resolveTenantId(
  supabase: ReturnType<typeof createServerClient>,
  user: DbUser,
  fallbackEmail: string
) {
  if (user.tenant_id) {
    return user.tenant_id;
  }

  const lookupEmail = (user.email || fallbackEmail).trim().toLowerCase();
  if (!lookupEmail || user.role !== "OWNER") {
    return null;
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .ilike("owner_email", lookupEmail)
    .limit(1)
    .maybeSingle();

  if (!tenant?.id) {
    return null;
  }

  await supabase
    .from("users")
    .update({
      tenant_id: tenant.id,
      updated_at: Date.now(),
    })
    .eq("id", user.id);

  return tenant.id;
}

export async function loginErpAction({
  email,
  password,
  locale,
}: LoginInput): Promise<ActionResult> {
  const isId = isIdLocale(locale);
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return {
      ok: false,
      message: isId
        ? "Email dan password wajib diisi."
        : "Email and password are required.",
    };
  }

  const supabase = createServerClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .ilike("email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: isId
        ? "Gagal memverifikasi akun. Coba lagi."
        : "Failed to verify the account. Please try again.",
    };
  }

  const dbUser = user as DbUser | null;
  if (!dbUser) {
    return {
      ok: false,
      message: isId
        ? "Email atau password salah."
        : "Invalid email or password.",
    };
  }

  if (!dbUser.is_active) {
    return {
      ok: false,
      message: isId
        ? "Akun belum dikonfirmasi. Silakan cek email Anda."
        : "Your account is not confirmed yet. Please check your email.",
    };
  }

  let tenantId = await resolveTenantId(supabase, dbUser, normalizedEmail);
  let passwordHash = dbUser.password_hash;
  let passwordSalt = dbUser.password_salt;

  if (!passwordHash || !passwordSalt) {
    const authResult = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authResult.error) {
      return {
        ok: false,
        message: isId
          ? "Email atau password salah."
          : "Invalid email or password.",
      };
    }

    passwordSalt = generatePasswordSalt();
    passwordHash = hashPassword(password, passwordSalt);

    await supabase
      .from("users")
      .update({
        password_hash: passwordHash,
        password_salt: passwordSalt,
        tenant_id: tenantId ?? dbUser.tenant_id,
        updated_at: Date.now(),
      })
      .eq("id", dbUser.id);

    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore cookie cleanup failure here; ERP session uses its own cookie.
    }
  }

  if (!tenantId) {
    return {
      ok: false,
      message: isId
        ? "Akun belum memiliki data tenant. Hubungi admin."
        : "This account does not have a tenant profile yet. Contact the admin.",
    };
  }

  if (!passwordHash || !passwordSalt) {
    return {
      ok: false,
      message: isId
        ? "Password akun belum siap digunakan. Hubungi admin."
        : "This account password is not ready yet. Contact the admin.",
    };
  }

  if (!verifyPassword(password, passwordSalt, passwordHash)) {
    return {
      ok: false,
      message: isId
        ? "Email atau password salah."
        : "Invalid email or password.",
    };
  }

  const token = await createErpSession({
    userId: dbUser.id,
    email: dbUser.email || normalizedEmail,
    tenantId,
    role: dbUser.role,
    name: dbUser.name,
  });

  setErpSessionCookie(token);
  return { ok: true };
}

export async function registerErpAction({
  name,
  email,
  phone,
  restaurantName,
  pin,
  province,
  city,
  password,
  locale,
  origin,
}: RegisterInput): Promise<ActionResult> {
  const isId = isIdLocale(locale);
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();
  const trimmedRestaurantName = restaurantName.trim();
  const trimmedPhone = phone.trim();
  const trimmedProvince = province.trim();
  const trimmedCity = city.trim();
  const trimmedPin = pin.trim();
  const isPinValid = /^\d{6}$/.test(trimmedPin);

  if (
    !trimmedName ||
    !trimmedRestaurantName ||
    !normalizedEmail ||
    !trimmedProvince ||
    !trimmedCity ||
    password.length < 6 ||
    !isPinValid
  ) {
    return {
      ok: false,
      message: isId
        ? "Data pendaftaran belum lengkap."
        : "Registration data is incomplete.",
    };
  }

  const supabase = createServerClient();

  const { data: existingUser, error: existingUserError } = await supabase
    .from("users")
    .select("id")
    .ilike("email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (existingUserError) {
    return {
      ok: false,
      message: isId
        ? "Gagal memeriksa email terdaftar."
        : "Failed to check the registered email.",
    };
  }

  if (existingUser) {
    return {
      ok: false,
      message: isId
        ? "Email sudah terdaftar. Silakan masuk."
        : "This email is already registered. Please sign in.",
    };
  }

  const now = Date.now();
  const tenantId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const passwordSalt = generatePasswordSalt();
  const passwordHash = hashPassword(password, passwordSalt);
  const pinSalt = generatePasswordSalt();
  const pinHash = hashPassword(trimmedPin, pinSalt);

  const { error: tenantError } = await supabase.from("tenants").insert({
    id: tenantId,
    name: trimmedRestaurantName,
    owner_email: normalizedEmail,
    owner_phone: trimmedPhone,
    province: trimmedProvince,
    city: trimmedCity,
    is_active: false,
    sync_status: "SYNCED",
    updated_at: now,
    created_at: now,
  });

  if (tenantError) {
    return {
      ok: false,
      message: isId
        ? "Gagal membuat data tenant."
        : "Failed to create the tenant record.",
    };
  }

  const { error: userError } = await supabase.from("users").insert({
    id: userId,
    name: trimmedName,
    email: normalizedEmail,
    phone: trimmedPhone,
    pin_hash: pinHash,
    pin_salt: pinSalt,
    password_hash: passwordHash,
    password_salt: passwordSalt,
    role: "OWNER",
    tenant_id: tenantId,
    is_active: false,
    sync_status: "SYNCED",
    updated_at: now,
    created_at: now,
  });

  if (userError) {
    await supabase.from("tenants").delete().eq("id", tenantId);
    return {
      ok: false,
      message: isId
        ? "Gagal membuat akun pengguna."
        : "Failed to create the user record.",
    };
  }

  try {
    const redirectBase = resolveAuthRedirectBase(origin);
    await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: trimmedName,
          restaurant_name: trimmedRestaurantName,
          phone: trimmedPhone,
          province: trimmedProvince,
          city: trimmedCity,
        },
        emailRedirectTo: redirectBase
          ? `${redirectBase}/${locale}/app/confirm`
          : undefined,
      },
    });
  } catch {
    // Non-critical: the website login uses public.users password_hash as source of truth.
  }

  return { ok: true };
}

function resolveAuthRedirectBase(origin?: string) {
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      // ignore invalid origin
    }
  }

  const envBase = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "";
  if (envBase) {
    try {
      return new URL(envBase).origin;
    } catch {
      return "";
    }
  }

  return "";
}

export async function logoutErpAction() {
  clearErpSessionCookie();
}

interface PasswordResetRequestInput extends AuthInput {
  email: string;
  origin?: string;
}

export async function requestPasswordResetAction({
  email,
  locale,
  origin,
}: PasswordResetRequestInput): Promise<ActionResult> {
  const isId = isIdLocale(locale);
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return {
      ok: false,
      message: isId ? "Email wajib diisi." : "Email is required.",
    };
  }

  const supabase = createServerClient();
  const redirectBase = resolveAuthRedirectBase(origin);

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: redirectBase
      ? `${redirectBase}/${locale}/app/confirm?type=recovery`
      : undefined,
  });

  if (error) {
    return {
      ok: false,
      message: isId
        ? "Gagal mengirim email reset."
        : "Failed to send reset email.",
    };
  }

  return {
    ok: true,
    message: isId
      ? "Jika email terdaftar, kami sudah mengirim tautan reset."
      : "If the email is registered, we've sent a reset link.",
  };
}

interface ResetPasswordInput extends AuthInput {
  newPassword: string;
}

export async function resetErpPasswordAction({
  newPassword,
  locale,
}: ResetPasswordInput): Promise<ActionResult> {
  const isId = isIdLocale(locale);

  if (!newPassword || newPassword.length < 6) {
    return {
      ok: false,
      message: isId ? "Password tidak valid." : "Invalid password.",
    };
  }

  const supabase = createServerClient();
  const { data, error: userError } = await supabase.auth.getUser();
  const authUser = data?.user;

  if (userError || !authUser?.email) {
    return {
      ok: false,
      message: isId
        ? "Sesi reset tidak valid. Silakan minta ulang."
        : "Reset session is invalid. Please request a new link.",
    };
  }

  const normalizedEmail = authUser.email.trim().toLowerCase();
  const nextSalt = generatePasswordSalt();
  const nextHash = hashPassword(newPassword, nextSalt);

  const { error: updateError } = await supabase
    .from("users")
    .update({
      password_hash: nextHash,
      password_salt: nextSalt,
      updated_at: Date.now(),
    })
    .ilike("email", normalizedEmail);

  if (updateError) {
    return {
      ok: false,
      message: isId
        ? "Gagal memperbarui password."
        : "Failed to update the password.",
    };
  }

  return {
    ok: true,
    message: isId
      ? "Password berhasil diperbarui."
      : "Password updated successfully.",
  };
}

interface UserUpsertInput {
  id?: string; // omit for create
  name: string;
  email: string;
  phone: string;
  role: "OWNER" | "CASHIER";
  password?: string; // omit to keep existing
  isActive: boolean;
  tenantId: string;
  featureAccess?: string | null; // comma-separated feature codes, null = owner (all access)
}

export async function upsertTenantUserAction(
  input: UserUpsertInput
): Promise<ActionResult & { userId?: string }> {
  const session = await getErpSession();
  if (!session || session.role !== "OWNER") {
    return { ok: false, message: "Unauthorized" };
  }

  const supabase = createServerClient();
  const now = Date.now();
  const trimmedName = input.name.trim();
  const normalizedEmail = input.email.trim().toLowerCase();

  if (!trimmedName) {
    return { ok: false, message: "Name is required." };
  }

  if (input.id) {
    // Update existing user
    const updates: Record<string, unknown> = {
      name: trimmedName,
      email: normalizedEmail || null,
      phone: input.phone.trim() || null,
      role: input.role,
      is_active: input.isActive,
      feature_access: input.role === "OWNER" ? null : (input.featureAccess ?? null),
      sync_status: "SYNCED",
      updated_at: now,
    };

    if (input.password && input.password.length >= 6) {
      const salt = generatePasswordSalt();
      updates.password_hash = hashPassword(input.password, salt);
      updates.password_salt = salt;
    }

    const { error } = await supabase.from("users").update(updates).eq("id", input.id);
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, userId: input.id };
  } else {
    // Create new user
    if (!input.password || input.password.length < 6) {
      return { ok: false, message: "Password must be at least 6 characters." };
    }
    const userId = crypto.randomUUID();
    const salt = generatePasswordSalt();
    const hash = hashPassword(input.password, salt);

    const { error } = await supabase.from("users").insert({
      id: userId,
      name: trimmedName,
      email: normalizedEmail || null,
      phone: input.phone.trim() || null,
      pin_hash: "",
      pin_salt: "",
      password_hash: hash,
      password_salt: salt,
      role: input.role,
      tenant_id: input.tenantId,
      is_active: input.isActive,
      feature_access: input.role === "OWNER" ? null : (input.featureAccess ?? null),
      sync_status: "SYNCED",
      updated_at: now,
      created_at: now,
    });

    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, userId };
  }
}

export async function updateQrisSettingsAction(input: {
  qrisMerchantName: string;
  qrisImageUrl: string;
}): Promise<ActionResult & { tenant?: Record<string, unknown> }> {
  const session = await getErpSession();
  if (!session || session.role !== "OWNER") {
    return { ok: false, message: "Unauthorized" };
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("tenants")
    .update({
      qris_merchant_name: input.qrisMerchantName.trim() || null,
      qris_image_url: input.qrisImageUrl.trim() || null,
      updated_at: Date.now(),
      sync_status: "SYNCED",
    })
    .eq("id", session.tenantId)
    .select()
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, tenant: data as Record<string, unknown> };
}

export async function deleteTenantUserAction(userId: string): Promise<ActionResult> {
  const session = await getErpSession();
  if (!session || session.role !== "OWNER") {
    return { ok: false, message: "Unauthorized" };
  }
  // Cannot delete yourself
  if (session.userId === userId) {
    return { ok: false, message: "Cannot delete your own account." };
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export async function changeErpPasswordAction({
  currentPassword,
  newPassword,
  locale,
}: ChangePasswordInput): Promise<ActionResult> {
  const isId = isIdLocale(locale);

  if (!currentPassword || newPassword.length < 6) {
    return {
      ok: false,
      message: isId
        ? "Password tidak valid."
        : "Invalid password.",
    };
  }

  const session = await getErpSession();
  if (!session) {
    return {
      ok: false,
      message: isId
        ? "Sesi login berakhir. Silakan masuk lagi."
        : "Your session has expired. Please sign in again.",
    };
  }

  const supabase = createServerClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.userId)
    .maybeSingle();

  if (error || !user) {
    return {
      ok: false,
      message: isId
        ? "Akun tidak ditemukan."
        : "Account not found.",
    };
  }

  const dbUser = user as DbUser;
  if (!dbUser.password_hash || !dbUser.password_salt) {
    return {
      ok: false,
      message: isId
        ? "Password akun ini belum tersedia."
        : "This account does not have a password yet.",
    };
  }

  if (!verifyPassword(currentPassword, dbUser.password_salt, dbUser.password_hash)) {
    return {
      ok: false,
      message: isId
        ? "Password saat ini salah."
        : "Your current password is incorrect.",
    };
  }

  const nextSalt = generatePasswordSalt();
  const nextHash = hashPassword(newPassword, nextSalt);

  const { error: updateError } = await supabase
    .from("users")
    .update({
      password_hash: nextHash,
      password_salt: nextSalt,
      updated_at: Date.now(),
    })
    .eq("id", dbUser.id);

  if (updateError) {
    return {
      ok: false,
      message: isId
        ? "Gagal memperbarui password."
        : "Failed to update the password.",
    };
  }

  // Best-effort: sync new password to Supabase Auth (non-critical)
  if (dbUser.email) {
    try {
      const supabaseForAuth = createServerClient();
      const authResult = await supabaseForAuth.auth.signInWithPassword({
        email: dbUser.email,
        password: currentPassword,
      });
      if (!authResult.error) {
        await supabaseForAuth.auth.updateUser({ password: newPassword });
        await supabaseForAuth.auth.signOut();
      }
    } catch {
      // Non-critical: web/mobile login uses public.users password_hash as source of truth.
    }
  }

  return {
    ok: true,
    message: isId
      ? "Password berhasil diperbarui."
      : "Password updated successfully.",
  };
}
