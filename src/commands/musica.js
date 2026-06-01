// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/musica.js
//   Descargar canciones via play-dl
// ═══════════════════════════════════════════

import { unlink, access, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import playdl from "play-dl";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

// ── Ruta de cookies ─────────────────────────
const COOKIES_PATH = "/home/container/cookies.txt";

// ── Verifica si hay cookies ──────────────────
async function cookiesExist() {
  try { await access(COOKIES_PATH); return true; } catch { return false; }
}

// ── Busca en YouTube y retorna info ──────────
async function searchYouTube(query) {
  const results = await playdl.search(query, { limit: 1, source: { youtube: "video" } });
  if (!results || results.length === 0) throw new Error("No se encontró ningún resultado.");
  return results[0];
}

// ── Descarga audio como mp3 ─────────────────
async function downloadAudio(url, outPath) {
  const stream = await playdl.stream(url, { quality: 2 });
  const writer = createWriteStream(outPath);
  await pipeline(stream.stream, writer);
}

const musicCommands = [
  {
    name: "play",
    alias: ["musica", "song", "cancion", "mp3", "audio"],
    description: "Descarga una canción de YouTube como audio",
    category: "Música",
    execute: async ({ reply, react, sock, from, msg, text }) => {
      if (!text) {
        return reply(
          "🎵 Escribe el nombre de la canción.\n" +
          "Ej: *!play Bad Bunny Tití Me Preguntó*"
        );
      }

      await react("🎵");
      await sock.sendMessage(from, { text: `🔍 Buscando: *${text}*...` }, { quoted: msg });

      const tmpFile = join(tmpdir(), `rage_audio_${Date.now()}`);

      try {
        let url;
        let titulo = text;

        if (text.startsWith("http")) {
          url = text;
        } else {
          const info = await searchYouTube(text);
          url = info.url;
          titulo = info.title || text;
        }

        await sock.sendMessage(from, { text: `⬇️ Descargando: *${titulo}*...` }, { quoted: msg });
        await downloadAudio(url, tmpFile);

        const audioBuffer = await readFile(tmpFile);

        await sock.sendMessage(
          from,
          { audio: audioBuffer, mimetype: "audio/mp4", ptt: false },
          { quoted: msg }
        );
        await react("✅");
      } catch (err) {
        console.error("[PLAY]", err.message);
        if (err.message.includes("No se encontró")) {
          await reply(`❌ No encontré: *${text}*`);
        } else if (err.message.includes("429") || err.message.includes("blocked")) {
          await reply("❌ YouTube bloqueó la descarga temporalmente. Intenta más tarde.");
        } else {
          await reply("❌ No pude descargar la canción.\n_Intenta con otro nombre._");
        }
        await react("❌");
      } finally {
        unlink(tmpFile).catch(() => {});
      }
    },
  },
  {
    name: "playurl",
    alias: ["dlurl", "audiourl"],
    description: "Descarga audio desde una URL de YouTube",
    category: "Música",
    execute: async ({ reply, react, sock, from, msg, args }) => {
      const url = args[0];
      if (!url || !url.startsWith("http")) {
        return reply("🔗 Pega la URL de YouTube.\nEj: *!playurl https://youtube.com/watch?v=...*");
      }

      await react("🎵");
      await sock.sendMessage(from, { text: "⬇️ Descargando audio desde URL..." }, { quoted: msg });
      const tmpFile = join(tmpdir(), `rage_url_${Date.now()}`);

      try {
        await downloadAudio(url, tmpFile);
        const audioBuffer = await readFile(tmpFile);
        await sock.sendMessage(
          from,
          { audio: audioBuffer, mimetype: "audio/mp4", ptt: false },
          { quoted: msg }
        );
        await react("✅");
      } catch (err) {
        console.error("[PLAYURL]", err.message);
        await reply("❌ No pude descargar el audio.");
        await react("❌");
      } finally {
        unlink(tmpFile).catch(() => {});
      }
    },
  },
];

export default musicCommands;
