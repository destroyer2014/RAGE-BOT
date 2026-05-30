// ═══════════════════════════════════════════
//      PRAGMATA BOT — src/commands/fondo.js
//   Cambia el fondo de una imagen con sharp
// ═══════════════════════════════════════════

import { writeFile, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

// Colores predefinidos
const COLORES = {
  rojo: "#FF0000", red: "#FF0000",
  verde: "#00FF00", green: "#00FF00",
  azul: "#0000FF", blue: "#0000FF",
  negro: "#000000", black: "#000000",
  blanco: "#FFFFFF", white: "#FFFFFF",
  amarillo: "#FFFF00", yellow: "#FFFF00",
  naranja: "#FF6600", orange: "#FF6600",
  rosa: "#FF69B4", pink: "#FF69B4",
  morado: "#800080", purple: "#800080",
  gris: "#808080", gray: "#808080", grey: "#808080",
  cyan: "#00FFFF", celeste: "#00BFFF",
};

function resolveColor(input) {
  if (!input) return null;
  const lower = input.toLowerCase().trim();
  if (COLORES[lower]) return COLORES[lower];
  if (/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(lower)) {
    return lower.startsWith("#") ? lower : "#" + lower;
  }
  return null;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

const fondoCommands = [
  {
    name: "fondo",
    alias: ["bgcolor", "background", "cambiofondo", "fondocolor"],
    description: "Cambia el fondo de una imagen !fondo [color]",
    category: "Efectos 🎨",
    execute: async ({ text, args, reply, react, sock, from, msg }) => {
      const colorInput = (args[0] || text || "").trim();

      const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const targetMsg = quoted ? { message: quoted } : msg;
      const mtype = Object.keys(targetMsg?.message || {})[0];
      const isImage = mtype === "imageMessage";

      if (!isImage) {
        return reply(
          "🎨 *!fondo*\n━━━━━━━━━━━━━━\n" +
          "Responde una imagen con `!fondo [color]`\n\n" +
          "*Colores:* rojo, verde, azul, negro, blanco,\namarillo, naranja, rosa, morado, gris, cyan\n\n" +
          "También hex: `!fondo #FF5500`"
        );
      }

      const color = resolveColor(colorInput);
      if (!color) {
        return reply(
          `❌ Color no reconocido: *${colorInput}*\n` +
          "Usa nombre (rojo, azul...) o hex (#FF5500)"
        );
      }

      await react("🎨");
      await sock.sendMessage(from, { text: `🖌️ Cambiando fondo a *${colorInput}*...` }, { quoted: msg });

      const tmpIn  = join(tmpdir(), `fondo_in_${Date.now()}.png`);
      const tmpOut = join(tmpdir(), `fondo_out_${Date.now()}.png`);

      try {
        // Import dinámico de sharp (wasm)
        const sharp = (await import("sharp")).default;

        const buffer = await downloadMediaMessage(
          { message: targetMsg.message, key: msg.key },
          "buffer",
          {},
          { logger: { info: () => {}, error: () => {}, warn: () => {} }, reuploadRequest: sock.updateMediaMessage }
        );

        await writeFile(tmpIn, buffer);

        const meta = await sharp(tmpIn).metadata();
        const { width, height } = meta;
        const rgb = hexToRgb(color);

        // Crear fondo sólido y componer la imagen encima
        const background = await sharp({
          create: { width, height, channels: 3, background: rgb },
        }).png().toBuffer();

        await sharp(background)
          .composite([{ input: tmpIn, blend: "over" }])
          .png()
          .toFile(tmpOut);

        const outBuffer = await readFile(tmpOut);

        await sock.sendMessage(
          from,
          {
            image: outBuffer,
            caption: `🎨 Fondo cambiado a *${colorInput}*\n_by PRAGMATA BOT_`,
          },
          { quoted: msg }
        );

        await react("✅");
      } catch (err) {
        console.error("[FONDO]", err.message);
        await reply("❌ Error al procesar la imagen.\n_Verifica que sharp esté instalado:_\n`npm install --cpu=wasm32 sharp`");
        await react("❌");
      } finally {
        unlink(tmpIn).catch(() => {});
        unlink(tmpOut).catch(() => {});
      }
    },
  },
];

export default fondoCommands;
