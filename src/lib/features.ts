import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { Company } from "@/models/company";
import { isAdmin } from "@/lib/admin";

/**
 * Whether the current user can see the invoicing UI (Invoices, Subscriptions,
 * Clients). Admins always have access. For non-admins, the user's company must
 * have featuresEnabled.invoices === true.
 */
export async function userHasInvoicing(): Promise<boolean> {
  const user = await getCurrentUser();
  if (isAdmin(user.email)) return true;
  if (!user.companyId) return false;

  await dbConnect();
  const company = await Company.findById(user.companyId)
    .select("featuresEnabled")
    .lean();
  return Boolean(company?.featuresEnabled?.invoices);
}
