// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/musica.js
//   Descargar canciones via yt-dlp + cookies
// ═══════════════════════════════════════════

import { unlink, access } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { exec } from "child_process";
import ytDlpExec from "yt-dlp-exec";

const execAsync = promisify(exec);

// ── Ruta de cookies ─────────────────────────
const COOKIES_PATH = "/home/container/cookies.txt";

// ── Verifica si yt-dlp está disponible ──────
async function ytdlpAvailable() {
  try {
    await ytDlpExec("--version");
    return true;
  } catch {
    return false;
  }
}

// ── Verifica si hay cookies ──────────────────
async function cookiesExist() {
  try {
    await access(COOKIES_PATH);
    return true;
  } catch {
    return false;
  }
}

// ── Construye flags de cookies ───────────────
async function getCookieFlag() {
  if (await cookiesExist()) return `--cookies "${COOKIES_PATH}"`;
  return "";
}

// ── Busca en YouTube y retorna URL ──────────
async function searchYouTube(query) {
  const opts = {
    getUrl: true,
    noPlaylist: true,
    defaultSearch: `ytsearch1:${query}`,
  };
  if (await cookiesExist()) opts.cookies = COOKIES_PATH;
  const result = await ytDlpExec("ytsearch1:" + query, { ...opts, getUrl: true });
  // yt-dlp-exec retorna string con la URL
  const url = typeof result === "string" ? result.trim().split("\n")[0] : "";
  if (!url) throw new Error("No se encontró ningún resultado.");
  return url;
}

// ── Descarga audio como mp3 ─────────────────
async function downloadAudio(url, outPath) {
  const opts = {
    extractAudio: true,
    audioFormat: "mp3",
    audioQuality: 5,
    noPlaylist: true,
    maxFilesize: "20m",
    output: outPath,
  };
  if (await cookiesExist()) opts.cookies = COOKIES_PATH;
  await ytDlpExec(url, opts);
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

      if (!await ytdlpAvailable()) {
        return reply("❌ *yt-dlp no está disponible en el servidor.*");
      }

      await react("🎵");
      await sock.sendMessage(from, { text: `🔍 Buscando: *${text}*...` }, { quoted: msg });

      const tmpMp3 = join(tmpdir(), `rage_audio_${Date.now()}.mp3`);

      try {
        const url = text.startsWith("http") ? text : await searchYouTube(text);
        await sock.sendMessage(from, { text: "⬇️ Descargando audio..." }, { quoted: msg });
        await downloadAudio(url, tmpMp3);

        const { readFile } = await import("fs/promises");
        const audioBuffer = await readFile(tmpMp3);

        await sock.sendMessage(
          from,
          { audio: audioBuffer, mimetype: "audio/mpeg", ptt: false },
          { quoted: msg }
        );
        await react("✅");
      } catch (err) {
        console.error("[PLAY]", err.message);
        if (err.message.includes("File is larger")) {
          await reply("❌ La canción es demasiado pesada (máx 20MB).");
        } else if (err.message.includes("No se encontró")) {
          await reply(`❌ No encontré: *${text}*`);
        } else if (err.message.includes("Sign in") || err.message.includes("bot")) {
          await reply("❌ YouTube bloqueó la descarga.\n_Las cookies pueden haber expirado._");
        } else {
          await reply("❌ No pude descargar la canción.\n_Intenta con otro nombre._");
        }
        await react("❌");
      } finally {
        unlink(tmpMp3).catch(() => {});
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

      if (!await ytdlpAvailable()) {
        return reply("❌ *yt-dlp no está disponible en el servidor.*");
      }

      await react("🎵");
      await sock.sendMessage(from, { text: "⬇️ Descargando audio desde URL..." }, { quoted: msg });
      const tmpMp3 = join(tmpdir(), `rage_url_${Date.now()}.mp3`);

      try {
        await downloadAudio(url, tmpMp3);
        const { readFile } = await import("fs/promises");
        const audioBuffer = await readFile(tmpMp3);
        await sock.sendMessage(
          from,
          { audio: audioBuffer, mimetype: "audio/mpeg", ptt: false },
          { quoted: msg }
        );
        await react("✅");
      } catch (err) {
        console.error("[PLAYURL]", err.message);
        await reply("❌ No pude descargar el audio.");
        await react("❌");
      } finally {
        unlink(tmpMp3).catch(() => {});
      }
    },
  },
];

export default musicCommands;
