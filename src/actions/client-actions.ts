"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { Client } from "@/models/client";
import { Invoice } from "@/models/invoice";
import { clientSchema, ClientFormData } from "@/lib/validations";

export async function getClients(filters?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const user = await getCurrentUser();
  await dbConnect();

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { userId: user._id };

  if (filters?.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { email: { $regex: filters.search, $options: "i" } },
    ];
  }

  const [clients, totalCount] = await Promise.all([
    Client.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Client.countDocuments(query),
  ]);

  return {
    clients: JSON.parse(JSON.stringify(clients)),
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
  };
}

export async function getClientById(clientId: string) {
  const user = await getCurrentUser();
  await dbConnect();

  const client = await Client.findOne({
    _id: clientId,
    userId: user._id,
  }).lean();

  if (!client) return null;

  // Get invoice stats for this client
  const stats = await Invoice.aggregate([
    {
      $match: {
        clientId: client._id,
        userId: user._id,
      },
    },
    {
      $group: {
        _id: null,
        totalInvoices: { $sum: 1 },
        totalRevenue: {
          $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] },
        },
        outstandingAmount: {
          $sum: {
            $cond: [
              { $in: ["$status", ["sent", "viewed", "overdue"]] },
              "$total",
              0,
            ],
          },
        },
      },
    },
  ]);

  return {
    ...JSON.parse(JSON.stringify(client)),
    stats: stats[0] || { totalInvoices: 0, totalRevenue: 0, outstandingAmount: 0 },
  };
}

export async function createClient(data: ClientFormData) {
  const user = await getCurrentUser();
  await dbConnect();

  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const client = await Client.create({
    ...parsed.data,
    userId: user._id,
  });

  revalidatePath("/clients");
  return { success: true, clientId: client._id.toString() };
}

export async function updateClient(clientId: string, data: ClientFormData) {
  const user = await getCurrentUser();
  await dbConnect();

  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const client = await Client.findOneAndUpdate(
    { _id: clientId, userId: user._id },
    parsed.data,
    { new: true }
  );

  if (!client) return { error: "Client not found" };

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function deleteClient(clientId: string) {
  const user = await getCurrentUser();
  await dbConnect();

  // Check for active invoices
  const activeInvoices = await Invoice.countDocuments({
    clientId,
    userId: user._id,
    status: { $nin: ["draft", "cancelled"] },
  });

  if (activeInvoices > 0) {
    return {
      error: `Cannot delete client with ${activeInvoices} active invoice(s). Cancel them first.`,
    };
  }

  await Client.findOneAndDelete({ _id: clientId, userId: user._id });

  revalidatePath("/clients");
  return { success: true };
}

export async function getClientInvoices(clientId: string) {
  const user = await getCurrentUser();
  await dbConnect();

  const invoices = await Invoice.find({
    clientId,
    userId: user._id,
  })
    .sort({ createdAt: -1 })
    .lean();

  return JSON.parse(JSON.stringify(invoices));
}
