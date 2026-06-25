import type { Message } from "discord.js";
import type { Logger } from "../../../logger.js";
import { getModerationConfig } from "./state.js";

// Per-user sliding window of message timestamps for spam detection.
const spamBuckets = new Map<string, number[]>();

const LINK_RE = /(https?:\/\/|discord\.gg\/|discord\.com\/invite\/)/i;

/**
 * Build the `messageCreate` handler for the automod engine. It reads live
 * config each message, so dashboard changes take effect without re-attaching.
 */
export function createAutomodHandler(logger: Logger) {
  return async function onMessageCreate(message: Message): Promise<void> {
    if (message.author.bot || !message.inGuild()) return;

    const cfg = getModerationConfig();
    if (!cfg.automodEnabled) return;
    const am = cfg.automod;
    const content = message.content;
    if (!content) return;

    // 1. Word blacklist
    const lower = content.toLowerCase();
    const hit = am.blacklist.find((w) => w.length > 0 && lower.includes(w.toLowerCase()));
    if (hit) {
      await message.delete().catch(() => {});
      await actOnMember(message, am.timeoutMinutes, `blacklisted word "${hit}"`, logger);
      return;
    }

    // 2. Link / invite filtering
    if (am.blockLinks && LINK_RE.test(content)) {
      await message.delete().catch(() => {});
      await notify(message, `${message.author}, links aren't allowed here.`);
      logger.info(`Automod removed a link from ${message.author.tag}`);
      return;
    }

    // 3. Spam (too many messages in the window)
    const now = Date.now();
    const key = `${message.guildId}:${message.author.id}`;
    const recent = (spamBuckets.get(key) ?? []).filter(
      (t) => now - t < am.spamWindowSeconds * 1000,
    );
    recent.push(now);
    spamBuckets.set(key, recent);
    if (recent.length > am.spamCount) {
      spamBuckets.set(key, []);
      await actOnMember(message, am.timeoutMinutes, "spam", logger);
    }
  };
}

async function actOnMember(
  message: Message<true>,
  minutes: number,
  reason: string,
  logger: Logger,
): Promise<void> {
  const member = message.member;
  if (member && member.moderatable) {
    await member.timeout(minutes * 60_000, `Automod: ${reason}`).catch(() => {});
    logger.info(`Automod timed out ${message.author.tag} (${reason}) for ${minutes}m`);
    await notify(message, `${message.author}, you've been timed out for ${minutes} min (${reason}).`);
  } else {
    logger.info(`Automod flagged ${message.author.tag} (${reason}) but couldn't act on them.`);
  }
}

/** Send a short notice that auto-deletes after a few seconds. */
async function notify(message: Message<true>, text: string): Promise<void> {
  const channel = message.channel;
  if (!channel.isTextBased()) return;
  const sent = await channel.send(text).catch(() => null);
  if (sent) setTimeout(() => void sent.delete().catch(() => {}), 5000);
}
