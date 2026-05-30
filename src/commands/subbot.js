// ═══════════════════════════════════════════
//   PRAGMATA BOT — src/commands/subbot.js
//   Sub-bots con QR real (sesión Baileys)
// ═══════════════════════════════════════════
//
// Todos pueden usar !subbot
// Sin plan → 1 sub-bot
// King     → 2 sub-bots
// Dios     → 4 sub-bots
// Creador  → 6 sub-bots
// ════════════════════════════════════════════

import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import QRCode from "qrcode";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import config from "../../config.js";
import { getPremiumPlan } from "../lib/database.js";
import { handleMessage } from "../lib/handler.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = join(__dirname, "../../data/subbot-sessions");
if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true });

// ── Mapa en memoria: jid → { sock, ownerJid } ──
const activeSessions = new Map();

// ── Límites por plan ─────────────────────────
const LIMITE_POR_PLAN = { free: 1, king: 2, dios: 4, creador: 6 };

function getLimite(plan) { return LIMITE_POR_PLAN[plan] ?? 1; }

function toJid(num) {
  const clean = (num || "").replace(/[^0-9]/g, "");
  return clean ? `${clean}@s.whatsapp.net` : null;
}

function sessionPath(jid) {
  return join(SESSIONS_DIR, jid.replace("@s.whatsapp.net", ""));
}

// ── Lanzar sesión secundaria ─────────────────
async function startSubSession(subbotJid, ownerJid, mainSock) {
  const logger = pino({ level: "silent" });
  const sessPath = sessionPath(subbotJid);
  if (!existsSync(sessPath)) mkdirSync(sessPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ["PRAGMATA SUB", "Chrome", "1.0.0"],
    getMessage: async () => undefined,
  });

  sock.ev.on("creds.update", saveCreds);

  // Evitar que errores del sub-bot maten el proceso principal
  sock.ws?.on?.("error", (e) => console.error("[SUBBOT WS]", e.message));
  process.on("unhandledRejection", (reason) => {
    if (String(reason).includes("subbot") || String(reason).includes("SUBBOT")) return;
    // solo logear, no crash
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrBuffer = await QRCode.toBuffer(qr, { width: 400, margin: 2 });
        const num = subbotJid.replace("@s.whatsapp.net", "");
        await mainSock.sendMessage(ownerJid, {
          image: qrBuffer,
          caption:
            `🤖 *Sub-Bot QR*\n` +
            `━━━━━━━━━━━━━━\n` +
            `Número destino: *+${num}*\n\n` +
            `📱 Escanea con WhatsApp → Dispositivos vinculados → Vincular dispositivo\n\n` +
            `_El QR expira en 60 segundos. Si expira, usa !subbot add ${num} de nuevo._`,
        });
      } catch (e) {
        console.error("[SUBBOT] Error mandando QR:", e.message);
      }
    }

    if (connection === "open") {
      activeSessions.set(subbotJid, { sock, ownerJid });
      const num = subbotJid.replace("@s.whatsapp.net", "");
      await mainSock.sendMessage(ownerJid, {
        text:
          `✅ *Sub-Bot Conectado*\n` +
          `━━━━━━━━━━━━━━\n` +
          `+${num} ya está activo y escuchando comandos.\n\n` +
          `_Usa !subbot list para ver el estado._`,
      });
    }

    if (connection === "close") {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      activeSessions.delete(subbotJid);
      if (code !== DisconnectReason.loggedOut) {
        setTimeout(() => startSubSession(subbotJid, ownerJid, mainSock), 5000);
      } else {
        try { rmSync(sessionPath(subbotJid), { recursive: true, force: true }); } catch {}
      }
    }
  });

  // Sub-bot: solo comandos freeAllowed
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      const body = msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text || "";
      const prefix = config.prefix;
      if (body.startsWith(prefix)) {
        const cmdName = body.slice(prefix.length).trim().split(" ")[0].toLowerCase();
        const { commands } = await import("../lib/handler.js");
        const cmd = commands.get(cmdName);
        if (cmd && !cmd.freeAllowed && !cmd.ownerOnly) {
          await sock.sendMessage(msg.key.remoteJid, {
            text:
              `🔒 *Comando no disponible en sub-bot*\n━━━━━━━━━━━━━━\n` +
              `Los sub-bots solo pueden usar:\n` +
              `• 🎨 Stickers\n• 📥 Descargas\n• ⚔️ RPG\n• ⚙️ Administración de grupo\n\n` +
              `💎 El dueño necesita un plan superior para más acceso.`,
          }, { quoted: msg });
          continue;
        }
      }
      await handleMessage(sock, msg);
    }
  });

  return sock;
}

// ── Comando !subbot ──────────────────────────
const subbotCommands = [
  {
    name: "subbot",
    alias: ["sb", "subbots"],
    description: "Gestiona sub-bots con QR real",
    category: "General",
    freeAllowed: true,

    execute: async ({ reply, args, sender, sock }) => {
      const plan   = getPremiumPlan(sender) || "free";
      const limite = getLimite(plan);
      const subCmd = (args[0] ?? "").toLowerCase();

      const propios = [...activeSessions.entries()]
        .filter(([, v]) => v.ownerJid === sender)
        .map(([jid]) => jid);

      // ── Sin argumentos: ayuda ─────────────────
      if (!subCmd || subCmd === "help" || subCmd === "ayuda") {
        return reply(
          `🤖 *Gestor de Sub-Bots*\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `Plan: *${plan.toUpperCase()}* | Slots: *${propios.length}/${limite}*\n\n` +
          `📌 *Comandos:*\n` +
          `• *!subbot add <número>* — Conectar sub-bot (te manda QR al privado)\n` +
          `• *!subbot list*         — Ver sub-bots activos\n` +
          `• *!subbot remove <nº>*  — Desconectar sub-bot\n\n` +
          `💎 *Límites por plan:*\n` +
          `• Sin plan → 1 sub-bot\n` +
          `• 👑 King  → 2 sub-bots\n` +
          `• 🔱 Dios  → 4 sub-bots\n` +
          `• 🤖 Creador → 6 sub-bots\n\n` +
          `_Ejemplo: !subbot add 51987654321_`
        );
      }

      // ── list ──────────────────────────────────
      if (subCmd === "list" || subCmd === "lista") {
        if (propios.length === 0) {
          return reply(
            `🤖 *Sub-Bots*\n━━━━━━━━━━━━━━━━━━\n` +
            `No tienes sub-bots activos.\n\n` +
            `Usa *!subbot add <número>* para agregar uno.\n` +
            `Slots: *0/${limite}*`
          );
        }
        const lista = propios
          .map((jid, i) => `${i + 1}. +${jid.replace("@s.whatsapp.net", "")} 🟢`)
          .join("\n");
        return reply(
          `🤖 *Sub-Bots Activos*\n━━━━━━━━━━━━━━━━━━\n${lista}\n\n` +
          `Slots usados: *${propios.length}/${limite}*`
        );
      }

      // ── add ───────────────────────────────────
      if (subCmd === "add" || subCmd === "agregar") {
        const numRaw = args[1];
        if (!numRaw) return reply("📝 Uso: *!subbot add <número>*\nEj: *!subbot add 51987654321*");

        const jid = toJid(numRaw);
        if (!jid) return reply("❌ Número inválido. Solo dígitos, ej: *51987654321*");

        if (activeSessions.has(jid)) {
          return reply(`⚠️ El número *+${numRaw.replace(/\D/g, "")}* ya tiene una sesión activa.`);
        }

        if (propios.length >= limite) {
          return reply(
            `❌ Alcanzaste el límite de tu plan *${plan}* (máx. ${limite} sub-bots).\n\n` +
            `Mejora tu plan para tener más slots:\n` +
            `📞 +${config.ownerNumber}`
          );
        }

        await reply(
          `⏳ Generando sesión para *+${numRaw.replace(/\D/g, "")}*...\n\n` +
          `📲 Te mandaré el QR a este privado en unos segundos.`
        );

        startSubSession(jid, sender, sock).catch((e) => {
          console.error("[SUBBOT] Error iniciando sesión:", e.message);
        });

        return;
      }

      // ── remove ────────────────────────────────
      if (subCmd === "remove" || subCmd === "eliminar" || subCmd === "del") {
        const numRaw = args[1];
        if (!numRaw) return reply("📝 Uso: *!subbot remove <número>*");

        const jid = toJid(numRaw);
        const session = activeSessions.get(jid);

        if (!jid || !session || session.ownerJid !== sender) {
          return reply(`❌ No tienes un sub-bot activo con el número *+${(numRaw || "").replace(/\D/g, "")}*.`);
        }

        try { await session.sock.logout(); } catch {}
        try { session.sock.end(); } catch {}
        activeSessions.delete(jid);
        try { rmSync(sessionPath(jid), { recursive: true, force: true }); } catch {}

        return reply(
          `🗑️ Sub-bot *+${numRaw.replace(/\D/g, "")}* desconectado y eliminado.\n` +
          `Slots disponibles: *${limite - (propios.length - 1)}/${limite}*`
        );
      }

      return reply(
        `❓ Subcomando desconocido: *${subCmd}*\n\nOpciones: *add*, *list*, *remove*\nEscribe *!subbot* para ayuda.`
      );
    },
  },
];

export default subbotCommands;
