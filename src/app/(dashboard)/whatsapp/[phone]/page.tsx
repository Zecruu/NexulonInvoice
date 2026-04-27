import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/get-user";
import dbConnect from "@/lib/db";
import { WhatsAppConversation } from "@/models/whatsapp-conversation";
import { normalizePhone } from "@/lib/whatsapp/send";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { ConversationView } from "@/components/whatsapp/conversation-view";
import { PatientContextCard } from "@/components/whatsapp/patient-context-card";
import { DeleteConversationButton } from "@/components/whatsapp/delete-conversation-button";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ phone: string }>;
}) {
  const { phone } = await params;
  const waPhone = normalizePhone(decodeURIComponent(phone));

  const user = await getCurrentUser();
  await dbConnect();

  const conversationDoc = await WhatsAppConversation.findOne({
    userId: user._id,
    waPhone,
  });

  if (!conversationDoc) notFound();

  if (conversationDoc.unread) {
    conversationDoc.unread = false;
    conversationDoc.unreadCount = 0;
    await conversationDoc.save();
  }

  const conversation = JSON.parse(JSON.stringify(conversationDoc.toObject()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/whatsapp">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">
            {conversation.customerName || conversation.profileName || waPhone}
          </h1>
          <p className="text-xs text-muted-foreground">{waPhone}</p>
        </div>
        <Badge variant="outline">{conversation.status}</Badge>
        <Badge
          variant={
            conversation.temperature === "hot"
              ? "destructive"
              : conversation.temperature === "warm"
              ? "default"
              : conversation.temperature === "cold"
              ? "secondary"
              : "outline"
          }
        >
          {conversation.temperature}
        </Badge>
        <DeleteConversationButton waPhone={waPhone} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <ConversationView conversation={conversation} waPhone={waPhone} />
        <div className="space-y-4">
          <PatientContextCard context={conversation.patientContext} />
        </div>
      </div>
    </div>
  );
}
