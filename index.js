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
import QRCode from "qrcode";
import express from "express";
import chalk from "chalk";
import { loadCommands, handleMessage } from "./src/lib/handler.js";
import config from "./config.js";

// ── Servidor web para mostrar QR ──────────────
const app = express();
const PORT = process.env.PORT || 3000;
let currentQR = null;
let botStatus = "iniciando";

app.get("/", async (req, res) => {
  if (botStatus === "conectado") {
    return res.send(`
      <html><body style="background:#111;color:#0f0;font-family:monospace;text-align:center;padding:50px">
        <h1>✅ RAGE-BOT CONECTADO</h1>
        <p>El bot está en línea y funcionando.</p>
      </body></html>
    `);
  }
  if (!currentQR) {
    return res.send(`
      <html><body style="background:#111;color:#fff;font-family:monospace;text-align:center;padding:50px">
        <h1>⏳ RAGE-BOT</h1>
        <p>Generando QR... recarga en 5 segundos.</p>
        <script>setTimeout(()=>location.reload(),5000)</script>
      </body></html>
    `);
  }
  const qrImage = await QRCode.toDataURL(currentQR);
  res.send(`
    <html><body style="background:#111;color:#fff;font-family:monospace;text-align:center;padding:30px">
      <h1>📱 RAGE-BOT — Escanea el QR</h1>
      <img src="${qrImage}" style="width:300px;height:300px;border:4px solid #0f0;border-radius:10px"/>
      <p>WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
      <p style="color:#888;font-size:12px">Esta página se actualiza automáticamente</p>
      <script>setTimeout(()=>location.reload(),30000)</script>
    </body></html>
  `);
});

app.listen(PORT, () => {
  console.log(chalk.cyan(`[WEB] Servidor QR en puerto ${PORT}`));
});

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

    // Mostrar QR en terminal y en web
    if (qr) {
      currentQR = qr;
      botStatus = "esperando_qr";
      console.log(chalk.yellow("\n[QR] Escanea este código con WhatsApp:\n"));
      qrcode.generate(qr, { small: true });
      console.log(chalk.green(`[WEB] QR disponible en tu URL de Railway\n`));
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
      currentQR = null;
      botStatus = "conectado";
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
