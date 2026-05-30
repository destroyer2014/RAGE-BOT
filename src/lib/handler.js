// ═══════════════════════════════════════════
//       PRAGMATA BOT — src/lib/handler.js
//              v2.5.3
// ═══════════════════════════════════════════

import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import NodeCache from "node-cache";
import config from "../../config.js";
import { parseMessage, isOwner, cleanJid, isGroup } from "./utils.js";
import { addXP, isPremium, checkDailyLimit, getPremiumPlan, trackMessage } from "./database.js";
import { antilinkGroups, antilinkRedes, LINK_REGEX, LINK_REGEX2, REDES_REGEX } from "../commands/grupo.js";
import { antiViewOnceGroups } from "../commands/antiviewonce.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cooldownCache = new NodeCache({ stdTTL: config.cooldown });

// ── Antiflood ────────────────────────────────────────────────
const floodMap = new Map(); // sender -> { count, resetAt, warned }
const FLOOD_LIMIT = 5;      // máx comandos
const FLOOD_WINDOW = 10000; // en 10 segundos
const FLOOD_COOLDOWN = 30000; // bloqueado 30 seg tras flood
export const commands = new Map();

// ── Sub-bots: leer subbots.json y resolver dueño ─────────────
const SUBBOTS_FILE = join(__dirname, "../../data/subbots.json");
function loadSubbots() {
  if (!existsSync(SUBBOTS_FILE)) return {};
  try { return JSON.parse(readFileSync(SUBBOTS_FILE, "utf-8")); } catch { return {}; }
}
function getSubbotOwner(senderJid) {
  const db = loadSubbots();
  for (const [ownerJid, subs] of Object.entries(db)) {
    if (Array.isArray(subs) && subs.includes(senderJid)) return ownerJid;
  }
  return null;
}

// ── Anti-spam: +3 comandos en 5s → advertencia + 10s bloqueado ──
const spamTracker = new Map(); // sender → { count, firstTs }
const spamBlocked = new Map(); // sender → unblockTs
const SPAM_MAX    = 3;
const SPAM_WINDOW = 5000;  // ms
const SPAM_BLOCK  = 10000; // ms

function checkSpam(sender) {
  const now = Date.now();

  // ¿Está bloqueado?
  if (spamBlocked.has(sender)) {
    if (now < spamBlocked.get(sender)) return "blocked";
    spamBlocked.delete(sender);
    spamTracker.delete(sender);
  }

  const track = spamTracker.get(sender) || { count: 0, firstTs: now };

  // Resetear ventana si ya pasaron 5s
  if (now - track.firstTs > SPAM_WINDOW) {
    track.count  = 1;
    track.firstTs = now;
  } else {
    track.count++;
  }

  spamTracker.set(sender, track);

  if (track.count > SPAM_MAX) {
    spamBlocked.set(sender, now + SPAM_BLOCK);
    spamTracker.delete(sender);
    return "warn"; // primera vez que supera el límite
  }
  return "ok";
}

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

  // Desenvuelve mensajes reenviados, efímeros y viewOnce que envuelven el real
  const inner = m.ephemeralMessage?.message
    || m.viewOnceMessage?.message
    || m.viewOnceMessageV2?.message
    || m.documentWithCaptionMessage?.message
    || null;
  if (inner) return extractBody({ message: inner });

  // Texto normal
  if (m.conversation) return m.conversation;

  // Texto extendido (links con preview, reenviados con texto, etc.)
  const ext = m.extendedTextMessage;
  if (ext) {
    // Reenvíos de invitación de grupo llegan sin .text pero con contextInfo
    const parts = [
      ext.text,
      ext.matchedText,
      ext.canonicalUrl,
      ext.contextInfo?.externalAdReply?.sourceUrl,
    ].filter(Boolean);
    if (parts.length) return parts.join(" ");
  }

  // Imagen/video con caption
  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.videoMessage?.caption) return m.videoMessage.caption;

  // Invitación de grupo (tarjeta nativa de WhatsApp)
  if (m.groupInviteMessage?.inviteLink) return m.groupInviteMessage.inviteLink;
  if (m.groupInviteMessage?.caption) return m.groupInviteMessage.caption || "";

  // Botones / listas
  if (m.buttonsResponseMessage?.selectedDisplayText) return m.buttonsResponseMessage.selectedDisplayText;
  if (m.listResponseMessage?.title) return m.listResponseMessage.title;

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

    // Resolver sender: si es LID (@lid), buscar el número real en los participantes del grupo
    let sender = msg.key.participant
      ? cleanJid(msg.key.participant)
      : cleanJid(from);

    if (sender.endsWith("@lid") && isGroup(from)) {
      try {
        const meta = await sock.groupMetadata(from);
        const lidNum = sender.split("@")[0];
        const match = meta.participants.find((p) =>
          cleanJid(p.id).split("@")[0] === lidNum || p.lid?.split("@")[0] === lidNum
        );
        if (match) sender = cleanJid(match.id);
      } catch {}
    }

    const senderPhone = sender.split("@")[0];

    // ── Extraer body completo (captura links de cualquier tipo) ──
    const body = extractBody(msg);

    // ── HELPER: resolver sender LID y ejecutar acción antilink ──
    async function applyAntilink(resolvedSender, label) {
      const senderIsGroupAdmin = await checkIsGroupAdmin(sock, from, resolvedSender);
      if (senderIsGroupAdmin || isOwner(resolvedSender)) return;

      const deleteKey = {
        remoteJid: from,
        fromMe: false,
        id: msg.key.id,
        participant: resolvedSender,
      };
      try {
        await sock.sendMessage(from, { delete: deleteKey });
        console.log(`[${label}] mensaje borrado:`, deleteKey.id);
      } catch (e) { console.log(`[${label}] delete error:`, e.message); }

      const botIsAdminCheck = await (async () => {
        try {
          const meta = await sock.groupMetadata(from);
          const botRaw = sock.user?.id || "";
          const botNum = cleanJid(botRaw).split("@")[0];
          const botLid = sock.user?.lid ? cleanJid(sock.user.lid).split("@")[0] : null;
          const me = meta.participants.find((p) => {
            const pNum = cleanJid(p.id).split("@")[0];
            return pNum === botNum || (botLid && pNum === botLid);
          });
          return me?.admin === "admin" || me?.admin === "superadmin";
        } catch { return false; }
      })();

      if (botIsAdminCheck) {
        try {
          await sock.groupParticipantsUpdate(from, [resolvedSender], "remove");
          console.log(`[${label}] usuario expulsado:`, resolvedSender);
        } catch (e) { console.log(`[${label}] kick error:`, e.message); }
        try {
          await sock.sendMessage(from, {
            text: `🚫 @${resolvedSender.split("@")[0]} fue *expulsado* por enviar links.`,
            mentions: [resolvedSender],
          });
        } catch (e) { console.log(`[${label}] notify error:`, e.message); }
      } else {
        try {
          await sock.sendMessage(from, {
            text: `⚠️ @${resolvedSender.split("@")[0]} Los links no están permitidos en este grupo.`,
            mentions: [resolvedSender],
          }, { quoted: msg });
        } catch (e) { console.log(`[${label}] warn error:`, e.message); }
      }
    }

    // ── Resolver sender real (LID → número) ──────────────────────
    async function resolveSender(rawSender) {
      let resolved = rawSender;
      // Fallback para groupInviteMessage
      if (!resolved || resolved === from) {
        const inviterJid = msg.message?.groupInviteMessage?.inviterJid;
        if (inviterJid) resolved = cleanJid(inviterJid);
      }
      if (resolved && resolved.endsWith("@lid")) {
        try {
          const meta = await sock.groupMetadata(from);
          const lidNum = resolved.split("@")[0];
          const match = meta.participants.find((p) =>
            cleanJid(p.id).split("@")[0] === lidNum || p.lid?.split("@")[0] === lidNum
          );
          if (match) resolved = cleanJid(match.id);
        } catch {}
      }
      return resolved;
    }

    // ── ANTILINK 1: grupos WhatsApp ───────────────────────────────
    if (isGroup(from) && antilinkGroups.has(from)) {
      console.log("[ANTILINK] body detectado:", JSON.stringify(body), "| grupo:", from);
      const msgData = msg.message?.extendedTextMessage;
      const canonicalUrl = msgData?.canonicalUrl || "";
      const matchedUrl = msgData?.matchedText || "";
      const groupInviteLink = msg.message?.groupInviteMessage?.inviteLink || "";
      const hasLink = LINK_REGEX.test(body) || LINK_REGEX.test(canonicalUrl) || LINK_REGEX.test(matchedUrl) || groupInviteLink !== "";
      if (hasLink) {
        const resolvedSender = await resolveSender(sender);
        await applyAntilink(resolvedSender, "ANTILINK");
        return;
      }
    }

    // ── ANTILINK 2: cualquier URL (incluso sin https) ─────────────
    if (isGroup(from) && !antilinkGroups.has(from)) {
      const cfgRedes = antilinkRedes[from] || {};
      const anyRedActiva = Object.values(cfgRedes).some(Boolean);
      // Solo activar antilink2 si hay al menos una red activa (evita falsos positivos)
      if (anyRedActiva && LINK_REGEX2(body)) {
        // Verificar si alguna red específica matchea
        let matched = false;
        for (const [red, regex] of Object.entries(REDES_REGEX)) {
          if (cfgRedes[red] && regex.test(body)) {
            matched = true;
            break;
          }
        }
        if (!matched) {
          // Es un link genérico — no actuar si solo hay redes específicas activas
        }
      }
    }

    // ── ANTILINK 3: por red social específica ─────────────────────
    if (isGroup(from)) {
      const cfgRedes = antilinkRedes[from] || {};
      for (const [red, regex] of Object.entries(REDES_REGEX)) {
        if (cfgRedes[red] && regex.test(body)) {
          const resolvedSender = await resolveSender(sender);
          await applyAntilink(resolvedSender, `ANTI-${red.toUpperCase()}`);
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
        const caption = (voMsg[voType]?.caption || "") + "\n\n👁️ _Revelado por PRAGMATA BOT antiviewonce_";
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
      // ── Contador de mensajes para estadísticas ─────────────────
      trackMessage(from, sender);
      return;
    }

    if (!isCmd || !command) return;

    // ── Anti-spam ────────────────────────────────────────────────
    if (!isOwner(sender)) {
      const spamStatus = checkSpam(sender);
      if (spamStatus === "warn") {
        await sock.sendMessage(from, {
          text: `⚠️ @${sender.split("@")[0]} *¡Spam detectado!*\nEspera *10 segundos* antes de usar otro comando.`,
          mentions: [sender],
        }, { quoted: msg });
        return;
      }
      if (spamStatus === "blocked") return;
    }

    // ── Antiflood ────────────────────────────────────────────────
    const now = Date.now();
    let flood = floodMap.get(sender);
    if (!flood || now > flood.resetAt) {
      flood = { count: 0, resetAt: now + FLOOD_WINDOW, warnedAt: 0, blockedUntil: 0 };
      floodMap.set(sender, flood);
    }
    if (flood.blockedUntil > now) {
      // bloqueado: solo avisar 1 vez cada 10s para no spamear
      if (now - flood.warnedAt > 10000) {
        flood.warnedAt = now;
        const segs = Math.ceil((flood.blockedUntil - now) / 1000);
        await sock.sendMessage(from, {
          text: `⛔ *Antiflood activado*\nEspera *${segs}s* antes de usar otro comando.`,
        }, { quoted: msg });
      }
      return;
    }
    flood.count++;
    if (flood.count > FLOOD_LIMIT) {
      flood.blockedUntil = now + FLOOD_COOLDOWN;
      flood.warnedAt = now;
      await sock.sendMessage(from, {
        text: `⚠️ *Demasiados comandos seguidos.*\nEstarás bloqueado por *30 segundos*.`,
      }, { quoted: msg });
      return;
    }

    // Anti-spam cooldown por comando individual
    const cacheKey = `${sender}_${command}`;
    if (cooldownCache.has(cacheKey)) return;
    cooldownCache.set(cacheKey, true);

    const cmd = commands.get(command);
    if (!cmd) return;

    const ownerCheck = isOwner(sender);

    // ── Sub-bot: heredar permisos del dueño ─────────────────────
    const subbotOwnerJid = getSubbotOwner(sender);
    const effectiveSender = subbotOwnerJid || sender;
    const effectivePremium = isPremium(effectiveSender) || ownerCheck;
    const effectivePlan = getPremiumPlan(effectiveSender);

    const premiumCheck = effectivePremium;

    // ── Plan Dios/Creador puede usar comandos Owner ──────────────
    const isDiosPlan = effectivePlan === "dios" || effectivePlan === "creador";
    const ownerOrDios = ownerCheck || isDiosPlan;

    if (cmd.ownerOnly && !ownerOrDios) {
      await sock.sendMessage(from, {
        text:
          `👑 *Comando Owner*\n━━━━━━━━━━━━━━\n` +
          `Este comando requiere plan *Dios-Rage* o ser el creador.\n\n` +
          `🔱 *Plan Dios-Rage* — S/. 15.00/mes\n` +
          `💰 Ver planes: *!adqpremium*\n` +
          `📞 Contacto: +${config.ownerNumber}`,
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

    // ── Límite diario para rangos especiales ────────────────────
    if (cmd.premiumOnly && premiumCheck && !ownerCheck) {
      const limitCheck = checkDailyLimit(effectiveSender);
      if (!limitCheck.ok) {
        const planActual = limitCheck.plan || "plata";
        const upgrade = planActual === "plata" ? "Dorado (30/día)" :
                        planActual === "dorado" ? "King (60/día)" :
                        planActual === "king"   ? "Dios (♾️ ilimitado)" :
                        planActual === "dios"   ? "Creador (Bot personalizado)" : null;
        const upgradeText = upgrade
          ? `\n⬆️ *Sube a ${upgrade}* para más usos\n📞 +${config.ownerNumber}`
          : "";
        await sock.sendMessage(from, {
          text:
            `⏳ *Límite diario alcanzado*\n━━━━━━━━━━━━━━\n` +
            `Has usado *${limitCheck.used}/${limitCheck.limit}* comandos premium hoy.\n` +
            `Plan actual: *${planActual.toUpperCase()}*` +
            upgradeText +
            `\n\n_Vuelve mañana o mejora tu plan._ 😜`,
        }, { quoted: msg });
        return;
      }
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
      isGroup: isGroup(from),
      reply: (content) => {
        if (typeof content === "string") {
          return sock.sendMessage(from, { text: content }, { quoted: msg });
        }
        return sock.sendMessage(from, content, { quoted: msg });
      },
      react: (emoji) =>
        sock.sendMessage(from, { react: { text: emoji, key: msg.key } }),
    };

    // ── Bloqueo RPG en chat privado ─────────────────────────────
    const isPrivate = !isGroup(from);
    const isRpgCmd = cmd.category === "RPG ⚔️";
    const RPG_PV_WHITELIST = ["buzon", "buzonver", "correo", "inbox", "mensajes"];
    const isCorreo = RPG_PV_WHITELIST.includes(command);
    if (isPrivate && isRpgCmd && !isCorreo && !ownerCheck) {
      await sock.sendMessage(from, {
        text:
          "⚔️ *Los comandos RPG solo funcionan en el grupo.*\n" +
          "━━━━━━━━━━━━━━\n" +
          "Únete aquí y juega con todos:\n" +
          "🔗 https://chat.whatsapp.com/Jk42VXskOD07rKXqwk4y7L",
      }, { quoted: msg });
      return;
    }

    await ctx.react("⏳");
    await cmd.execute(ctx);
  } catch (err) {
    console.error("[HANDLER] Error:", err.message);
  }
}
