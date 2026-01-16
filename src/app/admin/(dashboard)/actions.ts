"use server";

import { clearSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function logoutAction() {
  clearSessionCookie();
  redirect("/admin/login");
}
