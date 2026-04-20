"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import dbConnect from "@/lib/db";
import { requireAdmin, isAdmin } from "@/lib/admin";
import { User } from "@/models/user";
import { Invoice } from "@/models/invoice";
import type { Tier } from "@/lib/constants";

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getAdminStats() {
  await requireAdmin();
  await dbConnect();

  const monthStart = getMonthStart();

  const [totalUsers, proUsers, invoicesThisMonth] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ tier: "pro" }),
    Invoice.countDocuments({ createdAt: { $gte: monthStart } }),
  ]);

  return {
    totalUsers,
    proUsers,
    freeUsers: totalUsers - proUsers,
    invoicesThisMonth,
  };
}

export async function getAdminUsers(filters?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  await requireAdmin();
  await dbConnect();

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const skip = (page - 1) * limit;
  const monthStart = getMonthStart();

  const query: Record<string, unknown> = {};
  if (filters?.search) {
    query.$or = [
      { email: { $regex: filters.search, $options: "i" } },
      { firstName: { $regex: filters.search, $options: "i" } },
      { lastName: { $regex: filters.search, $options: "i" } },
      { businessName: { $regex: filters.search, $options: "i" } },
    ];
  }

  const [users, totalCount] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(query),
  ]);

  // Get invoice counts for each user this month
  const userIds = users.map((u) => u._id);
  const invoiceCounts = await Invoice.aggregate([
    {
      $match: {
        userId: { $in: userIds },
        createdAt: { $gte: monthStart },
      },
    },
    {
      $group: {
        _id: "$userId",
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map(
    invoiceCounts.map((ic) => [ic._id.toString(), ic.count])
  );

  const enrichedUsers = users.map((user) => ({
    ...user,
    _id: user._id.toString(),
    invoicesThisMonth: countMap.get(user._id.toString()) || 0,
  }));

  return {
    users: JSON.parse(JSON.stringify(enrichedUsers)),
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
  };
}

export async function updateUserTier(userId: string, tier: Tier) {
  await requireAdmin();
  await dbConnect();

  const user = await User.findByIdAndUpdate(
    userId,
    { tier, tierUpdatedAt: new Date() },
    { new: true }
  );

  if (!user) return { error: "User not found" };

  revalidatePath("/admin");
  return { success: true };
}

export async function banUser(userId: string, reason?: string) {
  const currentAdmin = await requireAdmin();
  await dbConnect();

  const target = await User.findById(userId);
  if (!target) return { error: "User not found" };
  if (isAdmin(target.email)) return { error: "Cannot ban an admin" };
  if (String(target._id) === String(currentAdmin._id)) {
    return { error: "Cannot ban yourself" };
  }

  target.banned = true;
  target.bannedAt = new Date();
  target.bannedReason = reason || "";
  await target.save();

  revalidatePath("/admin");
  return { success: true };
}

export async function unbanUser(userId: string) {
  await requireAdmin();
  await dbConnect();

  const target = await User.findByIdAndUpdate(
    userId,
    { banned: false, bannedAt: null, bannedReason: null },
    { new: true }
  );
  if (!target) return { error: "User not found" };

  revalidatePath("/admin");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const currentAdmin = await requireAdmin();
  await dbConnect();

  const target = await User.findById(userId);
  if (!target) return { error: "User not found" };
  if (isAdmin(target.email)) return { error: "Cannot delete an admin" };
  if (String(target._id) === String(currentAdmin._id)) {
    return { error: "Cannot delete yourself" };
  }

  const clerkId: string | undefined = target.clerkId;
  await User.findByIdAndDelete(userId);

  if (clerkId) {
    try {
      const client = await clerkClient();
      await client.users.deleteUser(clerkId);
    } catch (err) {
      console.error("[deleteUser] Clerk delete failed:", err);
    }
  }

  revalidatePath("/admin");
  return { success: true };
}
