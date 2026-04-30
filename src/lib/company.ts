import { redirect } from "next/navigation";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { Company, ICompany } from "@/models/company";
import { isAdmin } from "@/lib/admin";

/**
 * Returns the current user's company. If they don't have one, redirect to /onboarding.
 * Use in server components / route handlers.
 */
export async function requireCompany(): Promise<{
  company: ICompany;
  userId: import("mongoose").Types.ObjectId;
  isOwner: boolean;
  isCompanyAdmin: boolean;
}> {
  const user = await getCurrentUser();
  if (!user.companyId) {
    redirect("/onboarding");
  }

  await dbConnect();
  const company = await Company.findById(user.companyId);
  if (!company) {
    redirect("/onboarding");
  }

  return {
    company,
    userId: user._id as import("mongoose").Types.ObjectId,
    isOwner: user.companyRole === "owner",
    isCompanyAdmin:
      user.companyRole === "owner" || user.companyRole === "admin",
  };
}

/**
 * Super-admin (Nexulon platform admin) gate — based on ADMIN_EMAILS env var.
 * Used for /admin/companies management.
 */
export async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!isAdmin(user.email)) {
    throw new Error("Unauthorized: super-admin access required");
  }
  return user;
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "company"
  );
}
