import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import { User } from "@/models/user";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET to .env.local");
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response("Webhook verification failed", { status: 400 });
  }

  await dbConnect();

  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    await User.create({
      clerkId: id,
      email: email_addresses[0]?.email_address || "",
      firstName: first_name || "",
      lastName: last_name || "",
      imageUrl: image_url,
    });
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    await User.findOneAndUpdate(
      { clerkId: id },
      {
        email: email_addresses[0]?.email_address || "",
        firstName: first_name || "",
        lastName: last_name || "",
        imageUrl: image_url,
      }
    );
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;
    await User.findOneAndDelete({ clerkId: id });
  }

  return new Response("OK", { status: 200 });
}
