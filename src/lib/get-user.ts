import { auth, currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import { User, IUser } from "@/models/user";

/**
 * Get the current MongoDB user document, creating it if it doesn't exist.
 *
 * Lookup priority:
 *   1. clerkId match (the canonical happy path).
 *   2. email match — if a User already exists for this email but with an
 *      older clerkId, we claim it (rebind clerkId to the current session).
 *      This prevents duplicate User docs when a Clerk user is deleted and
 *      re-created (e.g. invite flow), or when stale tokens hit after a
 *      manual merge.
 *   3. Otherwise, create a new User.
 */
export async function getCurrentUser(): Promise<IUser> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  await dbConnect();

  const byClerkId = await User.findOne({ clerkId });
  if (byClerkId) return byClerkId;

  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Unauthorized");
  const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase() || "";

  if (email) {
    const byEmail = await User.findOne({ email });
    if (byEmail) {
      byEmail.clerkId = clerkId;
      if (clerkUser.imageUrl) byEmail.imageUrl = clerkUser.imageUrl;
      await byEmail.save();
      return byEmail;
    }
  }

  return User.create({
    clerkId,
    email,
    firstName: clerkUser.firstName || "",
    lastName: clerkUser.lastName || "",
    imageUrl: clerkUser.imageUrl,
  });
}
