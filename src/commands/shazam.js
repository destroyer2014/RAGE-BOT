// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/shazam.js
//   Reconocimiento de música via AudD.io
// ═══════════════════════════════════════════

import axios from "axios";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

const execAsync = promisify(exec);
const AUDD_API_KEY = "946c87ae6edae926c2c0a015c564559f";

const shazamCommands = [
  {
    name: "shazam",
    alias: ["reconocer", "quecancion", "identify"],
    description: "Reconoce una canción enviando un audio/video !shazam",
    category: "Música 🎵",
    execute: async ({ react, reply, sock, from, msg }) => {
      const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const targetMsg = quoted
        ? { message: quoted }
        : msg;

      const mtype = Object.keys(targetMsg?.message || {})[0];
      const isAudio = mtype === "audioMessage" || mtype === "videoMessage" || mtype === "pttMessage";

      if (!isAudio) {
        return reply(
          "🎵 *!shazam*\n━━━━━━━━━━━━━━\n" +
          "Envía o responde un *audio/video* con `!shazam` para identificar la canción."
        );
      }

      await react("🎵");
      await sock.sendMessage(from, { text: "🔍 Analizando audio..." }, { quoted: msg });

      const tmpPath = join(tmpdir(), `shazam_${Date.now()}`);
      const mp3Path = tmpPath + ".mp3";

      try {
        // Descargar el media
        const buffer = await downloadMediaMessage(
          { message: targetMsg.message, key: msg.key },
          "buffer",
          {},
          { logger: { info: () => {}, error: () => {}, warn: () => {} }, reuploadRequest: sock.updateMediaMessage }
        );

        await writeFile(tmpPath + ".raw", buffer);

        // Convertir a mp3 con ffmpeg
        await execAsync(
          `ffmpeg -i "${tmpPath}.raw" -ar 22050 -ac 1 -b:a 64k -t 20 "${mp3Path}" -y`,
          { timeout: 30000 }
        );

        const { readFile } = await import("fs/promises");
        const audioBuffer = await readFile(mp3Path);
        const base64Audio = audioBuffer.toString("base64");

        // Llamar a AudD.io
        const formData = new URLSearchParams();
        formData.append("api_token", AUDD_API_KEY);
        formData.append("audio", base64Audio);
        formData.append("return", "apple_music,spotify");

        const res = await axios.post("https://api.audd.io/", formData.toString(), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 30000,
        });

        const result = res.data?.result;
        if (!result) {
          return reply("❌ No pude reconocer la canción. Intenta con un audio más claro.");
        }

        const spotify = result.spotify;
        const apple = result.apple_music;
        const previewUrl = spotify?.preview_url || apple?.previews?.[0]?.url || null;

        let txt =
          "🎵 *Canción encontrada*\n" +
          "━━━━━━━━━━━━━━\n" +
          `🎤 *Artista:* ${result.artist}\n` +
          `🎵 *Título:* ${result.title}\n` +
          `💿 *Álbum:* ${result.album || "?"}\n` +
          `📅 *Año:* ${result.release_date || "?"}\n`;

        if (spotify?.external_urls?.spotify) {
          txt += `\n🟢 *Spotify:* ${spotify.external_urls.spotify}`;
        }

        await reply(txt);
        await react("✅");
      } catch (err) {
        console.error("[SHAZAM]", err.message);
        await reply("❌ Error al reconocer. Asegúrate de que el audio sea claro y tenga música.");
        await react("❌");
      } finally {
        unlink(tmpPath + ".raw").catch(() => {});
        unlink(mp3Path).catch(() => {});
      }
    },
  },
];

export default shazamCommands;
