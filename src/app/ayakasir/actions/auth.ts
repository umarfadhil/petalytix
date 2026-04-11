"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
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
  supabase: ReturnType<typeof createAdminClient>,
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

  const supabase = createAdminClient();
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
    const authClient = createServerClient();
    const authResult = await authClient.auth.signInWithPassword({
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
      await authClient.auth.signOut();
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

  // Resolve organizationId for OWNER accounts
  let organizationId: string | undefined;
  if (dbUser.role === "OWNER") {
    if (dbUser.organization_id) {
      organizationId = dbUser.organization_id;
    } else {
      // Backfill: look up org via owner_email from tenants
      const { data: tenant } = await supabase
        .from("tenants")
        .select("organization_id")
        .eq("id", tenantId)
        .maybeSingle();
      organizationId = (tenant?.organization_id as string | null) ?? undefined;
    }
  }

  const token = await createErpSession({
    userId: dbUser.id,
    email: dbUser.email || normalizedEmail,
    tenantId,
    role: dbUser.role,
    name: dbUser.name,
    organizationId,
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

  const supabase = createAdminClient();

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
  const threeMonthsLater = (() => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 3);
    return d.getTime();
  })();
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
    plan: "TUMBUH",
    plan_started_at: now,
    plan_expires_at: threeMonthsLater,
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
    await createServerClient().auth.signUp({
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

  const authClient = createServerClient();
  const { data, error: userError } = await authClient.auth.getUser();
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

  const admin = createAdminClient();
  const { error: updateError } = await admin
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
  jobTitle?: string;
  password?: string; // omit to keep existing
  pin?: string; // 6-digit PIN; omit to keep existing
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

  const supabase = createAdminClient();
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
      job_title: input.jobTitle?.trim() ?? "",
      tenant_id: input.tenantId,
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

    if (input.pin && /^\d{6}$/.test(input.pin)) {
      const pinSalt = generatePasswordSalt();
      updates.pin_hash = hashPassword(input.pin, pinSalt);
      updates.pin_salt = pinSalt;
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
    if (!input.pin || !/^\d{6}$/.test(input.pin)) {
      return { ok: false, message: "PIN must be exactly 6 digits." };
    }
    const userId = crypto.randomUUID();
    const salt = generatePasswordSalt();
    const hash = hashPassword(input.password, salt);
    const pinSalt = generatePasswordSalt();
    const pinHash = hashPassword(input.pin, pinSalt);

    // Resolve organization_id from the tenant so staff appear in Office
    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("organization_id")
      .eq("id", input.tenantId)
      .maybeSingle();
    const organizationId = (tenantRow?.organization_id as string | null) ?? null;

    const { error } = await supabase.from("users").insert({
      id: userId,
      name: trimmedName,
      email: normalizedEmail || null,
      phone: input.phone.trim() || null,
      pin_hash: pinHash,
      pin_salt: pinSalt,
      password_hash: hash,
      password_salt: salt,
      role: input.role,
      job_title: input.jobTitle?.trim() ?? "",
      tenant_id: input.tenantId,
      organization_id: organizationId,
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

  const supabase = createAdminClient();
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

export async function verifyOwnerPasswordAction(password: string): Promise<ActionResult> {
  const session = await getErpSession();
  if (!session || session.role !== "OWNER") {
    return { ok: false, message: "Unauthorized" };
  }
  const supabase = createAdminClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("password_hash, password_salt")
    .eq("id", session.userId)
    .maybeSingle();
  if (error || !user) {
    return { ok: false, message: "Account not found." };
  }
  const dbUser = user as Pick<DbUser, "password_hash" | "password_salt">;
  if (!dbUser.password_hash || !dbUser.password_salt) {
    return { ok: false, message: "Password not set." };
  }
  if (!verifyPassword(password, dbUser.password_salt, dbUser.password_hash)) {
    return { ok: false, message: "Incorrect password." };
  }
  return { ok: true };
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

  const supabase = createAdminClient();
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

  const supabase = createAdminClient();
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

export async function activateAccountAction(email: string): Promise<ActionResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { ok: false };

  const supabase = createAdminClient();
  const now = Date.now();

  const { error: userError } = await supabase
    .from("users")
    .update({ is_active: true, updated_at: now })
    .ilike("email", normalizedEmail)
    .eq("is_active", false);

  if (userError) return { ok: false };

  const { error: tenantError } = await supabase
    .from("tenants")
    .update({ is_active: true, updated_at: now })
    .ilike("owner_email", normalizedEmail)
    .eq("is_active", false);

  if (tenantError) return { ok: false };

  return { ok: true };
}

interface BranchInput {
  branchName: string;
  province: string;
  city: string;
}

// Create a new branch (tenant) under the owner's organization.
export async function createBranchAction(input: BranchInput): Promise<ActionResult & { tenantId?: string }> {
  const session = await getErpSession();
  if (!session || session.role !== "OWNER" || !session.organizationId) {
    return { ok: false, message: "Unauthorized." };
  }

  const branchName = input.branchName.trim();
  const province = input.province.trim();
  const city = input.city.trim();
  if (!branchName || !province || !city) {
    return { ok: false, message: "Nama cabang, provinsi, dan kota wajib diisi." };
  }

  const supabase = createAdminClient();

  // Enforce plan branch limit
  const { data: org } = await supabase
    .from("organizations")
    .select("plan, plan_expires_at")
    .eq("id", session.organizationId)
    .single();

  const { data: existingBranches } = await supabase
    .from("tenants")
    .select("id")
    .eq("organization_id", session.organizationId);

  const { getPlanLimits: _getPlanLimits } = await import("@/lib/ayakasir-plan");
  const planExpired = org?.plan_expires_at != null && Date.now() > org.plan_expires_at;
  const effectivePlan = planExpired ? "PERINTIS" : (org?.plan ?? "PERINTIS");
  const limits = _getPlanLimits(effectivePlan as import("@/lib/ayakasir-plan").TenantPlan);
  if ((existingBranches?.length ?? 0) >= limits.maxBranches) {
    return { ok: false, message: "Batas cabang telah tercapai." };
  }

  // Get the primary branch to inherit plan info and owner_phone
  const { data: primaryBranch } = await supabase
    .from("tenants")
    .select("owner_email, owner_phone, plan, plan_started_at, plan_expires_at, enabled_payment_methods")
    .eq("organization_id", session.organizationId)
    .eq("is_primary", true)
    .single();

  const now = Date.now();
  const newTenantId = crypto.randomUUID();

  const { error } = await supabase.from("tenants").insert({
    id: newTenantId,
    name: branchName,
    branch_name: branchName,
    owner_email: primaryBranch?.owner_email ?? session.email,
    owner_phone: primaryBranch?.owner_phone ?? "",
    province,
    city,
    is_active: true,
    is_primary: false,
    organization_id: session.organizationId,
    plan: primaryBranch?.plan ?? "TUMBUH",
    plan_started_at: primaryBranch?.plan_started_at ?? now,
    plan_expires_at: primaryBranch?.plan_expires_at ?? null,
    enabled_payment_methods: primaryBranch?.enabled_payment_methods ?? "CASH,QRIS,TRANSFER,UTANG",
    sync_status: "SYNCED",
    updated_at: now,
    created_at: now,
  });

  if (error) {
    return { ok: false, message: "Gagal membuat cabang. Coba lagi." };
  }

  return { ok: true, tenantId: newTenantId };
}

// Update branch name / province / city for any branch in the org.
export async function updateBranchAction(
  branchId: string,
  input: BranchInput
): Promise<ActionResult> {
  const session = await getErpSession();
  if (!session || session.role !== "OWNER" || !session.organizationId) {
    return { ok: false, message: "Unauthorized." };
  }

  const branchName = input.branchName.trim();
  const province = input.province.trim();
  const city = input.city.trim();
  if (!branchName || !province || !city) {
    return { ok: false, message: "Nama cabang, provinsi, dan kota wajib diisi." };
  }

  const supabase = createAdminClient();

  // Verify branch belongs to this org
  const { data: branch } = await supabase
    .from("tenants")
    .select("organization_id")
    .eq("id", branchId)
    .maybeSingle();

  if (!branch || branch.organization_id !== session.organizationId) {
    return { ok: false, message: "Cabang tidak ditemukan." };
  }

  const { error } = await supabase
    .from("tenants")
    .update({
      name: branchName,
      branch_name: branchName,
      province,
      city,
      updated_at: Date.now(),
    })
    .eq("id", branchId);

  if (error) {
    return { ok: false, message: "Gagal memperbarui cabang. Coba lagi." };
  }

  return { ok: true };
}

// Assign (or re-assign) a CASHIER user to a branch within the same org.
export async function assignStaffToBranchAction(
  userId: string,
  targetTenantId: string
): Promise<ActionResult> {
  const session = await getErpSession();
  if (!session || session.role !== "OWNER" || !session.organizationId) {
    return { ok: false, message: "Unauthorized." };
  }

  const supabase = createAdminClient();

  // Verify both the user and the target branch belong to this org
  const [userRes, branchRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, role, organization_id")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("tenants")
      .select("id, organization_id")
      .eq("id", targetTenantId)
      .maybeSingle(),
  ]);

  if (!userRes.data || userRes.data.organization_id !== session.organizationId) {
    return { ok: false, message: "Karyawan tidak ditemukan dalam organisasi ini." };
  }
  if (userRes.data.role !== "CASHIER") {
    return { ok: false, message: "Hanya kasir yang dapat dipindahkan antar cabang." };
  }
  if (!branchRes.data || branchRes.data.organization_id !== session.organizationId) {
    return { ok: false, message: "Cabang tidak ditemukan dalam organisasi ini." };
  }

  const { error } = await supabase
    .from("users")
    .update({ tenant_id: targetTenantId, updated_at: Date.now() })
    .eq("id", userId);

  if (error) {
    return { ok: false, message: "Gagal memindahkan karyawan. Coba lagi." };
  }

  return { ok: true };
}

// Sync staff assignments for a branch: unassigns staff no longer in newStaffIds
// (sets their tenant_id to null — no branch) and assigns the new ones.
// Uses a fresh DB read to diff so stale local state can't cause ghost assignments.
export async function syncBranchStaffAction(
  branchId: string,
  newStaffIds: string[]
): Promise<ActionResult & { unassignedIds: string[]; assignedIds: string[] }> {
  const EMPTY = { ok: false as const, unassignedIds: [], assignedIds: [] };

  const session = await getErpSession();
  if (!session || session.role !== "OWNER" || !session.organizationId) {
    return { ...EMPTY, message: "Unauthorized." };
  }

  const supabase = createAdminClient();
  const orgId = session.organizationId;

  // Fetch current staff on this branch — fresh from DB
  const currentStaffRes = await supabase
    .from("users")
    .select("id")
    .eq("tenant_id", branchId)
    .eq("role", "CASHIER")
    .eq("organization_id", orgId);

  const currentIds = (currentStaffRes.data || []).map((u: { id: string }) => u.id);
  const removedIds = currentIds.filter((id: string) => !newStaffIds.includes(id));
  const addedIds = newStaffIds.filter((id) => !currentIds.includes(id));

  // Unassign removed staff → no branch (tenant_id = null)
  if (removedIds.length > 0) {
    await supabase
      .from("users")
      .update({ tenant_id: null, updated_at: Date.now() })
      .in("id", removedIds)
      .eq("organization_id", orgId);
  }

  // Assign new staff → this branch
  if (addedIds.length > 0) {
    await supabase
      .from("users")
      .update({ tenant_id: branchId, updated_at: Date.now() })
      .in("id", addedIds)
      .eq("organization_id", orgId);
  }

  return { ok: true, unassignedIds: removedIds, assignedIds: addedIds };
}

// Delete a non-primary branch after verifying the owner's password.
// Moves any staff assigned to the branch back to the primary branch before deleting.
export async function deleteBranchAction(
  branchId: string,
  password: string
): Promise<ActionResult> {
  const session = await getErpSession();
  if (!session || session.role !== "OWNER" || !session.organizationId) {
    return { ok: false, message: "Unauthorized." };
  }

  const supabase = createAdminClient();

  // 1. Verify owner password
  const { data: ownerRow } = await supabase
    .from("users")
    .select("password_hash, password_salt")
    .eq("id", session.userId)
    .maybeSingle();

  if (!ownerRow?.password_hash || !ownerRow?.password_salt) {
    return { ok: false, message: "Tidak dapat memverifikasi password." };
  }
  if (!verifyPassword(password, ownerRow.password_salt, ownerRow.password_hash)) {
    return { ok: false, message: "Password salah." };
  }

  // 2. Verify the branch belongs to this org and is not the primary
  const { data: branch } = await supabase
    .from("tenants")
    .select("id, organization_id, is_primary")
    .eq("id", branchId)
    .maybeSingle();

  if (!branch || branch.organization_id !== session.organizationId) {
    return { ok: false, message: "Cabang tidak ditemukan." };
  }
  if (branch.is_primary) {
    return { ok: false, message: "Cabang utama tidak dapat dihapus." };
  }

  // 3. Unassign staff from this branch (set tenant_id = null, not reassigned to primary)
  await supabase
    .from("users")
    .update({ tenant_id: null, updated_at: Date.now() })
    .eq("tenant_id", branchId);

  // 4. Delete the branch (tenant row)
  const { error } = await supabase.from("tenants").delete().eq("id", branchId);
  if (error) {
    return { ok: false, message: "Gagal menghapus cabang. Coba lagi." };
  }

  return { ok: true };
}

// Switch the active branch (tenantId) in the ERP session cookie.
// OWNER only — keeps organizationId, role, userId, email, name unchanged.
export async function switchBranchAction(branchId: string): Promise<ActionResult> {
  const session = await getErpSession();
  if (!session || session.role !== "OWNER" || !session.organizationId) {
    return { ok: false, message: "Unauthorized." };
  }

  const supabase = createAdminClient();
  // Verify the branch belongs to the same org
  const { data: branch } = await supabase
    .from("tenants")
    .select("id, organization_id, is_active")
    .eq("id", branchId)
    .maybeSingle();

  if (!branch || branch.organization_id !== session.organizationId || !branch.is_active) {
    return { ok: false, message: "Branch not found or not active." };
  }

  const token = await createErpSession({
    userId: session.userId,
    email: session.email,
    tenantId: branchId,
    role: session.role,
    name: session.name,
    organizationId: session.organizationId,
  });

  setErpSessionCookie(token);
  return { ok: true };
}

export async function verifyErpPinAction({
  userId,
  pin,
}: {
  userId: string;
  pin: string;
}): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: dbUser } = await supabase
    .from("users")
    .select("pin_hash, pin_salt")
    .eq("id", userId)
    .single();
  if (!dbUser?.pin_hash || !dbUser?.pin_salt) return false;
  return verifyPassword(pin, dbUser.pin_salt, dbUser.pin_hash);
}
