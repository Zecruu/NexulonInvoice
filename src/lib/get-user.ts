import { auth, currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import { User, IUser } from "@/models/user";

/**
 * Get the current MongoDB user document, creating it if it doesn't exist.
 *
 * Email is the canonical identity key. The User collection has a unique
 * index on email, so we upsert by email atomically and rebind clerkId
 * onto the matched record. This prevents duplicate User docs when a
 * Clerk user is deleted and re-created (e.g. invite flow), under stale
 * session tokens, or under concurrent first-load requests.
 */
export async function getCurrentUser(): Promise<IUser> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  await dbConnect();

  const byClerkId = await User.findOne({ clerkId });
  if (byClerkId) return byClerkId;

  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Unauthorized");
  const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase().trim();
  if (!email) throw new Error("Unauthorized — no email on Clerk user");

  // Atomic upsert keyed on email — collapses any duplicate-creation race onto
  // a single User doc, then rebinds the live clerkId onto it.
  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        clerkId,
        imageUrl: clerkUser.imageUrl,
      },
      $setOnInsert: {
        email,
        firstName: clerkUser.firstName || "",
        lastName: clerkUser.lastName || "",
      },
    },
    { upsert: true, new: true }
  );
  return user!;
}
