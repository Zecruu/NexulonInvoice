import { auth, currentUser } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import { User, IUser } from "@/models/user";

/**
 * Get the current MongoDB user document, creating it if it doesn't exist.
 * Uses findOneAndUpdate with upsert to avoid race conditions and duplicate key errors.
 */
export async function getCurrentUser(): Promise<IUser> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Unauthorized");

  await dbConnect();

  let user = await User.findOne({ clerkId });

  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) throw new Error("Unauthorized");

    user = await User.findOneAndUpdate(
      { clerkId },
      {
        $setOnInsert: {
          clerkId,
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          firstName: clerkUser.firstName || "",
          lastName: clerkUser.lastName || "",
          imageUrl: clerkUser.imageUrl,
        },
      },
      { upsert: true, new: true }
    );
  }

  return user!;
}
