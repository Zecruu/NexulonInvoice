import { SignOutButton } from "@clerk/nextjs";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/get-user";

export const dynamic = "force-dynamic";

export default async function BannedPage() {
  let reason: string | undefined;
  try {
    const user = await getCurrentUser();
    reason = user.bannedReason;
  } catch {
    // not signed in
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Ban className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Account suspended</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account has been suspended. If you believe this is a mistake, contact
          support.
        </p>
        {reason && (
          <p className="mt-3 rounded-md border bg-muted/40 p-3 text-left text-xs text-muted-foreground">
            <span className="font-semibold">Reason:</span> {reason}
          </p>
        )}
        <SignOutButton redirectUrl="/">
          <Button variant="outline" className="mt-6 w-full">
            Sign out
          </Button>
        </SignOutButton>
      </div>
    </div>
  );
}
