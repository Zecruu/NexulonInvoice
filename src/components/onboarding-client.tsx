"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, Mail, KeyRound } from "lucide-react";

export function OnboardingClient({
  email,
  inviteToken,
}: {
  email: string;
  inviteToken?: string;
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [joining, setJoining] = useState(false);

  // Auto-accept invite token if present
  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    (async () => {
      setAccepting(true);
      try {
        const res = await fetch("/api/onboarding/accept-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: inviteToken }),
        });
        if (cancelled) return;
        if (!res.ok) {
          const msg = await res.text();
          toast.error(msg);
          return;
        }
        toast.success("Welcome aboard! Setting up your dashboard…");
        router.push("/dashboard");
        router.refresh();
      } finally {
        if (!cancelled) setAccepting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteToken, router]);

  async function joinViaCompanyId() {
    if (!companyId.trim()) return;
    setJoining(true);
    try {
      const res = await fetch("/api/onboarding/join-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: companyId.trim() }),
      });
      if (!res.ok) {
        toast.error(await res.text());
        return;
      }
      const data = await res.json();
      toast.success(`Joined ${data.companyName}`);
      router.push("/dashboard");
      router.refresh();
    } finally {
      setJoining(false);
    }
  }

  if (inviteToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Accepting invitation
          </CardTitle>
          <CardDescription>
            One moment while we add you to the team…
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {accepting ? "Linking your account to the company…" : "If this hangs, refresh the page or contact your admin."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join your company</CardTitle>
        <CardDescription>
          You&apos;re signed in as <span className="font-mono">{email}</span>, but you
          haven&apos;t joined a company yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="cid" className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" />
            Company ID
          </Label>
          <Input
            id="cid"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            placeholder="co_xxxxxxxx"
            className="mt-1 font-mono"
            onKeyDown={(e) => {
              if (e.key === "Enter") joinViaCompanyId();
            }}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Get this from your admin. They also need to invite your email first.
          </p>
        </div>

        <Button
          onClick={joinViaCompanyId}
          disabled={joining || !companyId.trim()}
          className="w-full"
        >
          {joining ? "Checking…" : "Join company"}
        </Button>

        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <Mail className="h-3.5 w-3.5" />
            Have an invite email?
          </div>
          Click the link in that email — it&apos;ll bring you back here with everything pre-filled.
        </div>
      </CardContent>
    </Card>
  );
}
