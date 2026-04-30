import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { Company } from "@/models/company";
import { User } from "@/models/user";
import { WhatsAppBotConfig } from "@/models/whatsapp-bot-config";
import { WhatsAppConversation } from "@/models/whatsapp-conversation";
import { Lead } from "@/models/lead";
import { slugify } from "@/lib/company";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    await dbConnect();

    const companies = await Company.find().sort({ createdAt: -1 }).lean();

    // Stats per company
    const stats = await Promise.all(
      companies.map(async (c) => {
        const [memberCount, botCount, conversationCount, leadCount] =
          await Promise.all([
            User.countDocuments({ companyId: c._id }),
            WhatsAppBotConfig.countDocuments({ companyId: c._id }),
            WhatsAppConversation.countDocuments({ companyId: c._id }),
            Lead.countDocuments({ companyId: c._id }),
          ]);
        return {
          ...c,
          _id: String(c._id),
          memberCount,
          botCount,
          conversationCount,
          leadCount,
        };
      })
    );

    return NextResponse.json({ companies: stats });
  } catch (err) {
    console.error("[GET /api/admin/companies]", err);
    return new Response("Internal error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    await dbConnect();

    const body = await req.json();
    const name: string = (body.name || "").trim();
    if (!name) return new Response("name required", { status: 400 });

    const baseSlug = slugify(name);
    let slug = baseSlug;
    let n = 1;
    while (await Company.findOne({ slug })) {
      slug = `${baseSlug}-${++n}`;
    }

    const company = await Company.create({ name, slug });
    return NextResponse.json({ company: JSON.parse(JSON.stringify(company.toObject())) });
  } catch (err) {
    console.error("[POST /api/admin/companies]", err);
    return new Response("Internal error", { status: 500 });
  }
}
