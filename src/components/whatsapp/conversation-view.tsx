"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Bot, UserRound, HeadsetIcon, Hand, Play, FileText, Download } from "lucide-react";

interface Message {
  role: "customer" | "bot" | "human";
  content: string;
  timestamp: string;
  mediaUrl?: string;
  mediaType?: string;
}

function MessageMedia({ url, mime }: { url: string; mime?: string }) {
  if (!url) return null;
  const t = (mime || "").toLowerCase();

  if (t.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-1 block">
        <img
          src={url}
          alt="attachment"
          className="max-h-64 w-auto rounded-md object-cover"
        />
      </a>
    );
  }
  if (t.startsWith("video/")) {
    return (
      <video
        src={url}
        controls
        className="mt-1 max-h-64 w-full rounded-md"
        preload="metadata"
      />
    );
  }
  if (t.startsWith("audio/")) {
    return <audio src={url} controls className="mt-1 w-full" preload="metadata" />;
  }
  // document / fallback — show download chip
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-1 inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent"
    >
      <FileText className="h-3.5 w-3.5" />
      Open attachment
      <Download className="h-3 w-3" />
    </a>
  );
}

interface Conversation {
  status: string;
  messages: Message[];
  language?: string;
  handoffReason?: string;
  qualificationNotes?: string;
}

interface Props {
  conversation: Conversation;
  waPhone: string;
}

export function ConversationView({ conversation: initial, waPhone }: Props) {
  const router = useRouter();
  const [conversation, setConversation] = useState(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [conversation.messages.length]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/whatsapp/conversations/${encodeURIComponent(waPhone)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.conversation) {
          setConversation(data.conversation);
        }
      } catch {
        // silent
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [waPhone]);

  async function sendMessage() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(
        `/api/whatsapp/conversations/${encodeURIComponent(waPhone)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        }
      );
      if (!res.ok) {
        const msg = await res.text();
        toast.error(msg || "Failed to send");
        return;
      }
      const data = await res.json();
      setConversation(data.conversation);
      setText("");
    } catch (err) {
      toast.error("Send failed");
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  async function toggleHandoff(action: "take" | "release") {
    setHandoffLoading(true);
    try {
      const res = await fetch(
        `/api/whatsapp/conversations/${encodeURIComponent(waPhone)}/handoff`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      if (!res.ok) {
        toast.error("Handoff failed");
        return;
      }
      const data = await res.json();
      setConversation(data.conversation);
      toast.success(action === "take" ? "You've taken over." : "Released back to Athena.");
      router.refresh();
    } finally {
      setHandoffLoading(false);
    }
  }

  const inHandoff = conversation.status === "human_handoff";

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-lg border">
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
        <div className="text-xs text-muted-foreground">
          {inHandoff ? (
            <span className="flex items-center gap-1.5">
              <HeadsetIcon className="h-3.5 w-3.5" />
              You've taken over — Athena is paused
              {conversation.handoffReason ? ` · ${conversation.handoffReason}` : ""}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5" />
              Athena is handling this conversation
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant={inHandoff ? "outline" : "default"}
          onClick={() => toggleHandoff(inHandoff ? "release" : "take")}
          disabled={handoffLoading}
        >
          {inHandoff ? (
            <>
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Release to bot
            </>
          ) : (
            <>
              <Hand className="mr-1.5 h-3.5 w-3.5" />
              Take over
            </>
          )}
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {conversation.messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          conversation.messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-2",
                m.role === "customer" ? "justify-start" : "justify-end"
              )}
            >
              {m.role === "customer" && (
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <UserRound className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  m.role === "customer" && "rounded-tl-sm bg-muted",
                  m.role === "bot" && "rounded-tr-sm bg-primary text-primary-foreground",
                  m.role === "human" && "rounded-tr-sm bg-emerald-600 text-white"
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                {m.mediaUrl && <MessageMedia url={m.mediaUrl} mime={m.mediaType} />}
                <p className="mt-1 text-[10px] opacity-70">
                  {m.role === "bot" && "Athena · "}
                  {m.role === "human" && "You · "}
                  {new Date(m.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {m.role !== "customer" && (
                <div
                  className={cn(
                    "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    m.role === "bot" ? "bg-primary/20" : "bg-emerald-600/20"
                  )}
                >
                  {m.role === "bot" ? (
                    <Bot className="h-3.5 w-3.5" />
                  ) : (
                    <HeadsetIcon className="h-3.5 w-3.5" />
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              inHandoff
                ? "Reply as human agent…"
                : "Send a message (this will pause Athena for this chat)"
            }
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button onClick={sendMessage} disabled={sending || !text.trim()}>
            Send
          </Button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Cmd/Ctrl + Enter to send. Sending as human will take over the chat.
        </p>
      </div>
    </div>
  );
}
