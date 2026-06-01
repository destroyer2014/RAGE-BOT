// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/musica.js
//   Descargar canciones via @distube/ytdl-core
// ═══════════════════════════════════════════

import { unlink, access, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import ytdl from "@distube/ytdl-core";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import axios from "axios";

// ── Ruta de cookies ─────────────────────────
const COOKIES_PATH = "/home/container/cookies.txt";

// ── Parsear cookies.txt formato Netscape ────
async function parseCookies() {
  try {
    await access(COOKIES_PATH);
    const raw = await readFile(COOKIES_PATH, "utf-8");
    const cookies = [];
    for (const line of raw.split("\n")) {
      if (line.startsWith("#") || !line.trim()) continue;
      const parts = line.split("\t");
      if (parts.length >= 7) {
        cookies.push({ name: parts[5], value: parts[6].trim() });
      }
    }
    return cookies;
  } catch {
    return [];
  }
}

// ── Crear agente ytdl con cookies ───────────
let ytdlAgent = null;
async function getAgent() {
  if (ytdlAgent) return ytdlAgent;
  const cookies = await parseCookies();
  if (cookies.length > 0) {
    ytdlAgent = ytdl.createAgent(cookies);
    console.log("[MUSICA] Agente con", cookies.length, "cookies");
  }
  return ytdlAgent;
}

// ── Busca en YouTube ─────────────────────────
async function searchYouTube(query) {
  const res = await axios.get("https://www.youtube.com/results", {
    params: { search_query: query },
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const match = res.data.match(/\"videoId\":\"([a-zA-Z0-9_-]{11})\"/);
  if (!match) throw new Error("No se encontró ningún resultado.");
  return `https://www.youtube.com/watch?v=${match[1]}`;
}

// ── Descarga audio ───────────────────────────
async function downloadAudio(url, outPath) {
  const agent = await getAgent();
  const opts = {
    filter: "audioonly",
    quality: "highestaudio",
    ...(agent ? { agent } : {}),
  };
  const stream = ytdl(url, opts);
  const writer = createWriteStream(outPath);
  await pipeline(stream, writer);
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

      const tmpFile = join(tmpdir(), `rage_audio_${Date.now()}.mp4`);

      try {
        const url = text.startsWith("http") ? text : await searchYouTube(text);
        await sock.sendMessage(from, { text: "⬇️ Descargando audio..." }, { quoted: msg });
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
        } else if (err.message.includes("sign in") || err.message.includes("bot")) {
          await reply("❌ YouTube bloqueó la descarga.\n_Las cookies pueden haber expirado._");
        } else if (err.message.includes("too large") || err.message.includes("maxBuffer")) {
          await reply("❌ La canción es demasiado pesada (máx 20MB).");
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
      const tmpFile = join(tmpdir(), `rage_url_${Date.now()}.mp4`);

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
