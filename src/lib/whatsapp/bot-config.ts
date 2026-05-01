import { WhatsAppBotConfig } from "@/models/whatsapp-bot-config";

/**
 * Multi-tenant safe bot config lookup.
 *
 * Each company has ONE shared WhatsApp bot config. All members of the company
 * see the same conversations and write to the same bot.
 *
 * Lookup priority:
 *   1. companyId match (the canonical shared bot)
 *   2. legacy bot owned by this user with no companyId set — backfill companyId
 *   3. create a new bot owned by this user
 */
export async function getOrCreateBotConfig(user: {
  _id: unknown;
  companyId?: unknown;
}) {
  if (user.companyId) {
    let config = await WhatsAppBotConfig.findOne({
      companyId: user.companyId,
    });
    if (config) return config;

    // Backfill: if this user owns a legacy bot (created before company scoping
    // existed), claim it for the company instead of creating a duplicate.
    config = await WhatsAppBotConfig.findOne({
      userId: user._id,
      $or: [{ companyId: { $exists: false } }, { companyId: null }],
    });
    if (config) {
      config.companyId = user.companyId;
      await config.save();
      return config;
    }

    return WhatsAppBotConfig.create({
      userId: user._id,
      companyId: user.companyId,
    });
  }

  // No company — solo user
  let config = await WhatsAppBotConfig.findOne({ userId: user._id });
  if (!config) {
    config = await WhatsAppBotConfig.create({ userId: user._id });
  }
  return config;
}

/** Filter object for scoping queries by company (preferred) or user (legacy). */
export function botConfigScope(user: {
  _id: unknown;
  companyId?: unknown;
}): Record<string, unknown> {
  return user.companyId
    ? { companyId: user.companyId }
    : { userId: user._id };
}
