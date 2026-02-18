"use server";

import dbConnect from "@/lib/db";
import { getCurrentUser } from "@/lib/get-user";
import { Invoice } from "@/models/invoice";
import { Client } from "@/models/client";

export async function getDashboardMetrics() {
  const user = await getCurrentUser();
  await dbConnect();

  const [invoiceStats, totalClients] = await Promise.all([
    Invoice.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: null,
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
          overdueCount: {
            $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] },
          },
          totalInvoices: { $sum: 1 },
        },
      },
    ]),
    Client.countDocuments({ userId: user._id }),
  ]);

  const stats = invoiceStats[0] || {
    totalRevenue: 0,
    outstandingAmount: 0,
    overdueCount: 0,
    totalInvoices: 0,
  };

  return {
    totalRevenue: stats.totalRevenue,
    outstandingAmount: stats.outstandingAmount,
    overdueCount: stats.overdueCount,
    totalInvoices: stats.totalInvoices,
    totalClients,
  };
}

export async function getRecentInvoices(limit: number = 5) {
  const user = await getCurrentUser();
  await dbConnect();

  const invoices = await Invoice.find({ userId: user._id })
    .populate("clientId", "name email")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return JSON.parse(JSON.stringify(invoices));
}

export async function getRevenueByMonth(months: number = 12) {
  const user = await getCurrentUser();
  await dbConnect();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const data = await Invoice.aggregate([
    {
      $match: {
        userId: user._id,
        status: "paid",
        paidAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$paidAt" },
          month: { $month: "$paidAt" },
        },
        revenue: { $sum: "$total" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  // Fill in missing months with zero
  const result = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const existing = data.find(
      (item) => item._id.year === year && item._id.month === month
    );
    result.push({
      month: d.toLocaleString("en-US", { month: "short" }),
      revenue: existing ? existing.revenue : 0,
      count: existing ? existing.count : 0,
    });
  }

  return result;
}

export async function getInvoiceStatusBreakdown() {
  const user = await getCurrentUser();
  await dbConnect();

  const data = await Invoice.aggregate([
    { $match: { userId: user._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  return data.map((item) => ({
    status: item._id as string,
    count: item.count as number,
  }));
}
