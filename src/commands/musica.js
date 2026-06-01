// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/musica.js
//   Descargar canciones via play-dl
// ═══════════════════════════════════════════

import { unlink, access, readFile } from "fs/promises";
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

// ── Cargar cookies de YouTube para play-dl ───
let cookiesLoaded = false;
async function loadCookies() {
  if (cookiesLoaded) return;
  try {
    if (await cookiesExist()) {
      const raw = await readFile(COOKIES_PATH, "utf-8");
      // Parsear cookies.txt formato Netscape
      // Solo las cookies esenciales de YouTube
      const ESSENTIAL = ["VISITOR_INFO1_LIVE", "YSC", "CONSENT", "__Secure-3PAPISID",
        "__Secure-3PSID", "__Secure-3PSIDCC", "SAPISID", "SSID", "HSID", "SID", "LOGIN_INFO"];
      const cookies = [];
      for (const line of raw.split("\n")) {
        if (line.startsWith("#") || !line.trim()) continue;
        const parts = line.split("\t");
        if (parts.length >= 7 && ESSENTIAL.includes(parts[5])) {
          cookies.push(`${parts[5]}=${parts[6].trim()}`);
        }
      }
      if (cookies.length > 0) {
        await playdl.setToken({ youtube: { cookie: cookies.join("; ") } });
        console.log("[MUSICA] Cookies cargadas:", cookies.length);
      }
    }
    cookiesLoaded = true;
  } catch (e) {
    console.log("[MUSICA] Error cargando cookies:", e.message);
  }
}

// ── Busca en YouTube y retorna info ──────────
async function searchYouTube(query) {
  await loadCookies();
  const results = await playdl.search(query, { limit: 1, source: { youtube: "video" } });
  if (!results || results.length === 0) throw new Error("No se encontró ningún resultado.");
  return results[0];
}

// ── Descarga audio ─────────────────────────
async function downloadAudio(url, outPath) {
  await loadCookies();
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
