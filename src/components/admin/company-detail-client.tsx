"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Trash2, Copy, Send } from "lucide-react";

interface PendingInvite {
  _id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
}

export function CompanyDetailClient({
  companyId,
  initialInvites,
}: {
  companyId: string;
  initialInvites: PendingInvite[];
}) {
  const router = useRouter();
  const [invites, setInvites] = useState<PendingInvite[]>(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [sending, setSending] = useState(false);

  async function sendInvite() {
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      if (!res.ok) {
        toast.error(await res.text());
        return;
      }
      const data = await res.json();
      const status = data.emailSent
        ? "Invite sent"
        : `Invite created (email not delivered: ${data.emailError || "Resend not configured"})`;
      toast.success(status, {
        description: `Accept link: ${data.acceptUrl}`,
        duration: 10000,
      });
      setInvites((prev) => [
        {
          _id: data.invite._id,
          email: data.invite.email,
          role: data.invite.role,
          token: data.invite.token,
          expiresAt: data.invite.expiresAt,
        },
        ...prev.filter((i) => i.email !== data.invite.email),
      ]);
      setEmail("");
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  async function revoke(inviteId: string) {
    const res = await fetch(
      `/api/admin/companies/${companyId}/invites/${inviteId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      toast.error("Revoke failed");
      return;
    }
    toast.success("Invite revoked");
    setInvites((prev) => prev.filter((i) => i._id !== inviteId));
    router.refresh();
  }

  function copyAcceptLink(token: string) {
    const url = `${window.location.origin}/onboarding?invite=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border p-3">
        <Label htmlFor="invite-email">Invite a new member</Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="invite-email"
            type="email"
            placeholder="staff@clinic.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendInvite();
            }}
            className="flex-1"
          />
          <Select value={role} onValueChange={(v) => setRole(v as "member" | "admin")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={sendInvite} disabled={sending || !email.trim()}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {sending ? "Sending…" : "Invite"}
          </Button>
        </div>
      </div>

      {invites.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">No pending invites.</p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {invites.map((inv) => (
            <li
              key={inv._id}
              className="flex items-center gap-2 px-3 py-2 text-sm"
            >
              <div className="flex-1">
                <p className="font-medium">{inv.email}</p>
                <p className="text-xs text-muted-foreground">
                  Expires {new Date(inv.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {inv.role}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyAcceptLink(inv.token)}
                title="Copy invite link"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => revoke(inv._id)}
                title="Revoke"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
