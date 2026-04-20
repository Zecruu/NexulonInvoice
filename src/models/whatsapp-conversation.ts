import mongoose, { Schema, Document } from "mongoose";

export type MessageRole = "customer" | "bot" | "human";
export type ConversationStatus =
  | "active"
  | "human_handoff"
  | "qualified"
  | "unqualified"
  | "resolved"
  | "expired";
export type Language = "en" | "es";
export type LeadTemperature = "hot" | "warm" | "cold" | "unknown";

export interface IWhatsAppMessage {
  role: MessageRole;
  content: string;
  waMessageId?: string;
  mediaUrl?: string;
  mediaType?: string;
  timestamp: Date;
}

export interface IWhatsAppConversation extends Document {
  userId: mongoose.Types.ObjectId;
  waPhone: string;
  customerName?: string;
  profileName?: string;
  status: ConversationStatus;
  language: Language;
  temperature: LeadTemperature;
  unread: boolean;
  unreadCount: number;
  messages: IWhatsAppMessage[];
  lastCustomerMessageAt?: Date;
  lastBotMessageAt?: Date;
  lastMessageAt: Date;
  lastMessagePreview: string;
  handoffReason?: string;
  qualificationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IWhatsAppMessage>(
  {
    role: {
      type: String,
      enum: ["customer", "bot", "human"],
      required: true,
    },
    content: { type: String, required: true },
    waMessageId: String,
    mediaUrl: String,
    mediaType: String,
    timestamp: { type: Date, default: Date.now, required: true },
  },
  { _id: false }
);

const WhatsAppConversationSchema = new Schema<IWhatsAppConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    waPhone: { type: String, required: true, index: true },
    customerName: String,
    profileName: String,
    status: {
      type: String,
      enum: [
        "active",
        "human_handoff",
        "qualified",
        "unqualified",
        "resolved",
        "expired",
      ],
      default: "active",
      index: true,
    },
    language: {
      type: String,
      enum: ["en", "es"],
      default: "en",
    },
    temperature: {
      type: String,
      enum: ["hot", "warm", "cold", "unknown"],
      default: "unknown",
      index: true,
    },
    unread: { type: Boolean, default: true, index: true },
    unreadCount: { type: Number, default: 0 },
    messages: { type: [MessageSchema], default: [] },
    lastCustomerMessageAt: Date,
    lastBotMessageAt: Date,
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessagePreview: { type: String, default: "" },
    handoffReason: String,
    qualificationNotes: String,
  },
  { timestamps: true }
);

WhatsAppConversationSchema.index({ userId: 1, waPhone: 1 }, { unique: true });
WhatsAppConversationSchema.index({ userId: 1, status: 1, lastMessageAt: -1 });
WhatsAppConversationSchema.index({ userId: 1, unread: 1 });

export const WhatsAppConversation =
  mongoose.models.WhatsAppConversation ||
  mongoose.model<IWhatsAppConversation>(
    "WhatsAppConversation",
    WhatsAppConversationSchema
  );
