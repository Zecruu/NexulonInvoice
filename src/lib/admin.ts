import { getCurrentUser } from "@/lib/get-user";

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(email: string): boolean {
  return getAdminEmails().includes(email.toLowerCase());
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!isAdmin(user.email)) {
    throw new Error("Unauthorized: admin access required");
  }
  return user;
}
