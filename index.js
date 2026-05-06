// ═══════════════════════════════════════════
//           RAGE-BOT — index.js
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
import config from "./config.js";

// ── Logger silencioso (solo errores críticos) ─
const logger = pino({ level: "silent" });

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
    browser: ["RAGE-BOT", "Chrome", "1.0.0"],
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
      console.log(
        chalk.gray("\n  WhatsApp → Dispositivos vinculados → Vincular dispositivo\n")
      );
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
      console.log(chalk.green(`[BOT] 🤖 RAGE-BOT está listo y escuchando...\n`));
    }
  });

  // ── Manejar mensajes entrantes ───────────────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      await handleMessage(sock, msg);
    }
  });

  return sock;
}

// ── Arrancar ──────────────────────────────────
startBot().catch((err) => {
  console.error(chalk.red("[FATAL]"), err);
  process.exit(1);
});
