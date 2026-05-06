// ═══════════════════════════════════════════
//       RAGE-BOT — src/lib/handler.js
//              v2.5.3
// ═══════════════════════════════════════════

import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import NodeCache from "node-cache";
import config from "../../config.js";
import { parseMessage, isOwner, cleanJid, isGroup } from "./utils.js";
import { addXP, isPremium } from "./database.js";
import { antilinkGroups, LINK_REGEX } from "../commands/grupo.js";
import { antiViewOnceGroups } from "../commands/antiviewonce.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cooldownCache = new NodeCache({ stdTTL: config.cooldown });
export const commands = new Map();

export async function loadCommands() {
  const commandsPath = join(__dirname, "../commands");
  const files = readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

  for (const file of files) {
    try {
      const mod = await import(`../commands/${file}`);
      const cmds = mod.default;
      if (Array.isArray(cmds)) {
        for (const cmd of cmds) {
          if (cmd.name) {
            commands.set(cmd.name.toLowerCase(), cmd);
            if (cmd.alias) {
              for (const a of cmd.alias) commands.set(a.toLowerCase(), cmd);
            }
          }
        }
      }
    } catch (err) {
      console.error(`[HANDLER] Error cargando ${file}:`, err.message);
    }
  }
  console.log(`[HANDLER] ${commands.size} comandos cargados ✅`);
}

// ── Extrae TODO el texto posible del mensaje (links incluidos) ──
function extractBody(msg) {
  const m = msg.message;
  if (!m) return "";

  // Texto normal
  if (m.conversation) return m.conversation;

  // Texto extendido (incluye links con preview)
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;

  // Imagen/video con caption
  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.videoMessage?.caption) return m.videoMessage.caption;

  // El link a veces viene solo en canonicalUrl dentro de extendedTextMessage
  const ctx = m.extendedTextMessage?.contextInfo;
  if (ctx?.externalAdReply?.sourceUrl) return ctx.externalAdReply.sourceUrl;

  return "";
}

// ── Detecta si el sender es admin del grupo (compatible con LID) ──
async function checkIsGroupAdmin(sock, groupJid, senderJid) {
  try {
    const meta = await sock.groupMetadata(groupJid);
    const senderNum = cleanJid(senderJid).split("@")[0];
    const p = meta.participants.find((p) => {
      const pNum = cleanJid(p.id).split("@")[0];
      return pNum === senderNum || p.id.startsWith(senderNum);
    });
    return p?.admin === "admin" || p?.admin === "superadmin";
  } catch {
    return false;
  }
}

export async function handleMessage(sock, msg) {
  try {
    if (msg.key.fromMe) return;
    if (msg.key.remoteJid === "status@broadcast") return;
    if (!msg.message) return;

    const from = msg.key.remoteJid;

    // FIX: si el participant es un LID (@lid), buscar el número real en los participantes
    let sender = msg.key.participant
      ? cleanJid(msg.key.participant)
      : cleanJid(from);

    const senderPhone = sender.split("@")[0];

    // ── Extraer body completo (captura links de cualquier tipo) ──
    const body = extractBody(msg);

    // ── ANTILINK ─────────────────────────────────────────────────
    if (isGroup(from) && antilinkGroups.has(from)) {
      const msgData = msg.message?.extendedTextMessage;
      const canonicalUrl = msgData?.canonicalUrl || "";
      const matchedUrl = msgData?.matchedText || "";

      const hasLink = LINK_REGEX.test(body) || LINK_REGEX.test(canonicalUrl) || LINK_REGEX.test(matchedUrl);

      if (hasLink) {
        const senderIsGroupAdmin = await checkIsGroupAdmin(sock, from, sender);

        if (!senderIsGroupAdmin && !isOwner(sender)) {
          try {
            await sock.sendMessage(from, { delete: msg.key });
          } catch (e) { console.log("[ANTILINK] delete error:", e.message); }
          try {
            await sock.sendMessage(
              from,
              {
                text: `⚠️ @${sender.split("@")[0]} Los links no están permitidos en este grupo.`,
                mentions: [sender],
              },
              { quoted: msg }
            );
          } catch (e) { console.log("[ANTILINK] warn error:", e.message); }
          return;
        }
      }
    }

    // ── ANTIVIEWONCE ─────────────────────────────────────────────
    const mtype = Object.keys(msg.message || {})[0] || "";
    if (
      isGroup(from) &&
      antiViewOnceGroups.has(from) &&
      (mtype === "viewOnceMessageV2" || mtype === "viewOnceMessageV2Extension")
    ) {
      try {
        const voMsg = mtype === "viewOnceMessageV2"
          ? msg.message.viewOnceMessageV2.message
          : msg.message.viewOnceMessageV2Extension.message;
        const voType = Object.keys(voMsg)[0];
        const mediaType = voType === "imageMessage" ? "image" : "video";
        const stream = await downloadContentFromMessage(voMsg[voType], mediaType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        const caption = (voMsg[voType]?.caption || "") + "\n\n👁️ _Revelado por RAGE-BOT antiviewonce_";
        if (mediaType === "image") {
          await sock.sendMessage(from, { image: buffer, caption }, { quoted: msg });
        } else {
          await sock.sendMessage(from, { video: buffer, caption, mimetype: "video/mp4" }, { quoted: msg });
        }
      } catch (e) {
        console.error("[ANTIVER]", e.message);
      }
    }

    // ── Parsear comando ──────────────────────────────────────────
    const { isCmd, command, args, text } = parseMessage(msg);

    // ── XP por mensaje normal en grupo (no comando) ──────────────
    if (!isCmd && isGroup(from) && !isOwner(sender)) {
      const result = addXP(sender, 2);
      if (result && result.leveledUp) {
        const lvlMsg = "🎉 *Subiste de nivel!*\n" +
          "━━━━━━━━━━━━━━\n" +
          "👤 @" + sender.split("@")[0] + "\n" +
          "Ahora eres *Nivel " + result.newLevel + "*\n" +
          "XP Total: " + result.xp;
        await sock.sendMessage(from, { text: lvlMsg, mentions: [sender] });
      }
      return;
    }

    if (!isCmd || !command) return;

    // Anti-spam cooldown
    const cacheKey = `${sender}_${command}`;
    if (cooldownCache.has(cacheKey)) return;
    cooldownCache.set(cacheKey, true);

    const cmd = commands.get(command);
    if (!cmd) return;

    const ownerCheck = isOwner(sender);
    const premiumCheck = isPremium(sender) || ownerCheck;

    if (cmd.ownerOnly && !ownerCheck) {
      await sock.sendMessage(from, {
        text: "👑 Este comando es solo para el *creador del bot*.",
      }, { quoted: msg });
      return;
    }

    if (cmd.premiumOnly && !premiumCheck) {
      await sock.sendMessage(from, {
        text:
          `⭐ *Comando Premium*\n━━━━━━━━━━━━━━\n` +
          `Este comando es exclusivo para usuarios *premium*.\n\n` +
          `Contacta al creador para obtener premium:\n` +
          `📞 +${config.ownerNumber}`,
      }, { quoted: msg });
      return;
    }

    // ── Guardar pushName para rankings ─────────────────────────
    const pushName = msg.pushName || null;
    if (pushName) {
      try {
        addXP(sender, 0, pushName); // actualiza el nombre sin sumar XP
      } catch {}
    }

    // ── XP ──────────────────────────────────────────────────────
    {
      const xpGain = ownerCheck ? 20 : premiumCheck ? 15 : 10;
      const result = addXP(sender, xpGain, pushName);
      if (result?.leveledUp) {
        await sock.sendMessage(from, {
          text:
            `🎉 *¡Subiste de nivel!*\n━━━━━━━━━━━━━━\n` +
            `👤 @${sender.split("@")[0]}\n` +
            `⬆️ Ahora eres *Nivel ${result.newLevel}*\n` +
            `✨ XP Total: ${result.xp}`,
          mentions: [sender],
        });
      }
    }

    // ── Admin del grupo para pasar en ctx ───────────────────────
    let senderIsGroupAdmin = false;
    if (isGroup(from)) {
      senderIsGroupAdmin = await checkIsGroupAdmin(sock, from, sender);
    }

    // ── Contexto del comando ────────────────────────────────────
    const ctx = {
      sock,
      msg,
      from,
      sender,
      pushName: msg.pushName || null,
      args,
      text,
      body,
      isOwner: ownerCheck,
      isPremium: premiumCheck,
      isGroupAdmin: senderIsGroupAdmin,
      reply: (content) => {
        if (typeof content === "string") {
          return sock.sendMessage(from, { text: content }, { quoted: msg });
        }
        return sock.sendMessage(from, content, { quoted: msg });
      },
      react: (emoji) =>
        sock.sendMessage(from, { react: { text: emoji, key: msg.key } }),
    };

    await ctx.react("⏳");
    await cmd.execute(ctx);
  } catch (err) {
    console.error("[HANDLER] Error:", err.message);
  }
}
