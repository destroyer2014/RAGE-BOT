// ═══════════════════════════════════════════
//           PRAGMATA BOT — index.js
//       WhatsApp Bot by 51917611323
// ═══════════════════════════════════════════

import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrcode from "qrcode-terminal";
import chalk from "chalk";
import { loadCommands, handleMessage } from "./src/lib/handler.js";
import { setSock } from "./src/lib/sockGlobal.js";
import { initScheduler } from "./src/lib/scheduler.js";
import config from "./config.js";
import { getUser } from "./src/lib/database.js";
import { welcomeGroups } from "./src/commands/grupo.js";

// ── Logger silencioso (solo errores críticos) ─
const logger = pino({ level: "silent" });

// ── Auto-instalar yt-dlp si no está disponible ─
import { execSync } from "child_process";
try {
  execSync("yt-dlp --version", { stdio: "ignore" });
} catch {
  console.log("[SETUP] Instalando yt-dlp...");
  try {
    execSync("pip3 install yt-dlp", { stdio: "inherit" });
    console.log("[SETUP] yt-dlp instalado correctamente.");
  } catch {
    try {
      execSync("pip install yt-dlp", { stdio: "inherit" });
      console.log("[SETUP] yt-dlp instalado correctamente.");
    } catch {
      console.log("[SETUP] No se pudo instalar yt-dlp automáticamente.");
    }
  }
}

// ── Banner de inicio ──────────────────────────
function showBanner() {
  console.clear();
  console.log(
    chalk.red(`
██████╗  █████╗  ██████╗ ███████╗    ██████╗  ██████╗ ████████╗
██╔══██╗██╔══██╗██╔════╝ ██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝
██████╔╝███████║██║  ███╗█████╗      ██████╔╝██║   ██║   ██║   
██╔══██╗██╔══██║██║   ██║██╔══╝      ██╔══██╗██║   ██║   ██║   
██║  ██║██║  ██║╚██████╔╝███████╗    ██████╔╝╚██████╔╝   ██║   
╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ╚═════╝  ╚═════╝    ╚═╝   
  `)
  );
  console.log(chalk.yellow(`  v${config.botVersion}  |  by ${config.ownerNumber}  |  prefijo: ${config.prefix}\n`));
}

// ── Función principal ─────────────────────────
async function startBot() {
  showBanner();

  // Carga comandos primero
  await loadCommands();

  // Estado de autenticación (guarda la sesión)
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();

  console.log(chalk.cyan(`[BOT] Usando Baileys v${version.join(".")}`));

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false, // Lo manejamos nosotros
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ["PRAGMATA BOT", "Chrome", "1.0.0"],
    getMessage: async () => undefined,
  });

  // ── Guardar credenciales al actualizar ──────
  sock.ev.on("creds.update", saveCreds);

  // ── Manejo de conexión ──────────────────────
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Mostrar QR en terminal
    if (qr) {
      console.log(chalk.yellow("\n[QR] Escanea este código con WhatsApp:\n"));
      qrcode.generate(qr, { small: true });
      console.log(chalk.gray("\n  WhatsApp → Dispositivos vinculados → Vincular dispositivo\n"));
    }

    if (connection === "close") {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log(chalk.yellow(`[BOT] Reconectando... (código: ${code})`));
        setTimeout(startBot, 3000);
      } else {
        console.log(chalk.red("[BOT] Sesión cerrada. Borra /session y vuelve a iniciar."));
        process.exit(1);
      }
    }

    if (connection === "open") {
      const user = sock.user;
      console.log(chalk.green(`\n[BOT] ✅ Conectado como: ${user?.name || user?.id}`));
      console.log(chalk.green(`[BOT] 🤖 PRAGMATA BOT está listo y escuchando...\n`));
      initScheduler(sock);
    }
  });

  // ── Manejar mensajes entrantes ───────────────
  const groupsGreeted = new Set();
  // Registrar sock globalmente al arrancar (necesario para broadcastGrupos y eventos)
  setSock(sock);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    for (const msg of messages) {
      const from = msg.key.remoteJid;
      const isGroup = from?.endsWith("@g.us");

      // Detectar cuando agregan al bot a un grupo (stubType 20, type append)
      // FIX v2.5: usar continue en vez de return para no matar el loop completo
      if (type !== "notify") continue;

      // Detectar cuando agregan al bot a un grupo (stubType 20)
      if (isGroup && msg.messageStubType === 20 && !groupsGreeted.has(from)) {
        const botNumber = sock.user?.id?.split(":")[0];
        const params = msg.messageStubParameters || [];
        const isBot = params.some(p => p.includes(botNumber));
        if (!isBot) { await handleMessage(sock, msg); continue; }
        groupsGreeted.add(from);
        continue;
      }

      // Detectar cuando agregan al bot a un grupo via mensaje de sistema
      // FIX v2.5: solo saltar mensajes de sistema puros (sin contenido real)
      if (isGroup && msg.messageStubType && !msg.message) {
        const botNumber = sock.user?.id?.split(":")[0];
        const isGroupAdd =
          msg.messageStubType === 27 &&
          msg.messageStubParameters?.some(p => p.includes(botNumber));
        const isGroupCreate =
          msg.messageStubType === 28 && msg.key.fromMe;

        if ((isGroupAdd || isGroupCreate) && !groupsGreeted.has(from)) {
          groupsGreeted.add(from);
        }
        continue; // son mensajes de sistema, no comandos
      }

      // Saludo a nuevo usuario en privado eliminado

      await handleMessage(sock, msg);
    }
  });

  // ── Saludo cuando agregan al bot a un grupo (evento alternativo) ──
  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    if (action === "add") {
      // Saludo del bot cuando lo agregan
      if (groupsGreeted.has(id)) return;
      groupsGreeted.add(id);

      // Bienvenida a nuevos miembros si está activada
      if (welcomeGroups.has(id)) {
        const botNumber = sock.user?.id?.split(":")[0];
        const newMembers = participants.filter(p => !p.includes(botNumber));
        for (const jid of newMembers) {
          const num = jid.split("@")[0];
          await sock.sendMessage(id, {
            text:
              `👋 *¡Bienvenido/a al grupo!*\n━━━━━━━━━━━━━━\n` +
              `🔥 Hola @${num}, qué bueno tenerte aquí.\n\n` +
              `➤ Escribe *!menu* para ver los comandos disponibles.`,
            mentions: [jid],
          });
        }
      }
    }
  });

  return sock;
}

// ── Arrancar ──────────────────────────────────
const startTime = Date.now();

function getUptime() {
  const diff = Math.floor((Date.now() - startTime) / 1000);
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

startBot().then((sock) => {
  // Actualizar bio cada 60 segundos
  setInterval(async () => {
    try {
      await sock.updateProfileStatus(
        `⚡ PRAGMATA BOT v${config.botVersion} | 🟢 Activo: ${getUptime()} | By: ${config.ownerName}`
      );
    } catch {}
  }, 60000);
}).catch((err) => {
  console.error(chalk.red("[FATAL]"), err);
  process.exit(1);
});
