// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/musica.js
//   Buscar con YouTube Data API v3 + descargar con ytjar RapidAPI
// ═══════════════════════════════════════════

import { unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { createWriteStream } from "fs";
import axios from "axios";

const YT_API_KEY = "AIzaSyCKBzgma9coMHFUsXt5Wt-VLUveFTU1hgI";
const RAPID_API_KEY = "68493 5b1dbmsh60ff273781a78d7p1fd7bbjsn452f27ecaf24".replace(" ", "");

// ── Buscar con YouTube Data API v3 ───────────
async function searchYouTube(query) {
  const res = await axios.get("https://www.googleapis.com/youtube/v3/search", {
    params: {
      part: "snippet",
      q: query,
      type: "video",
      maxResults: 1,
      key: YT_API_KEY,
    },
  });
  const items = res.data.items;
  if (!items || items.length === 0) throw new Error("No se encontró ningún resultado.");
  return {
    videoId: items[0].id.videoId,
    title: items[0].snippet.title,
  };
}

// ── Obtener URL de descarga via ytjar ────────
async function getMp3Url(videoId) {
  const res = await axios.get("https://youtube-mp36.p.rapidapi.com/dl", {
    params: { id: videoId },
    headers: {
      "x-rapidapi-host": "youtube-mp36.p.rapidapi.com",
      "x-rapidapi-key": RAPID_API_KEY,
    },
    timeout: 30000,
  });
  if (res.data.status !== "ok") throw new Error("No se pudo obtener el MP3: " + res.data.msg);
  return { url: res.data.link, title: res.data.title };
}

// ── Descargar MP3 desde URL ──────────────────
async function downloadMp3(url, outPath) {
  const res = await axios.get(url, { responseType: "stream", timeout: 60000 });
  const writer = createWriteStream(outPath);
  await new Promise((resolve, reject) => {
    res.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
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

      const tmpFile = join(tmpdir(), `rage_audio_${Date.now()}.mp3`);

      try {
        let videoId, titulo;

        if (text.startsWith("http")) {
          const match = text.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
          if (!match) throw new Error("URL de YouTube inválida.");
          videoId = match[1];
          titulo = text;
        } else {
          const result = await searchYouTube(text);
          videoId = result.videoId;
          titulo = result.title;
        }

        await sock.sendMessage(from, { text: `⬇️ Descargando: *${titulo}*...` }, { quoted: msg });

        const mp3 = await getMp3Url(videoId);
        await downloadMp3(mp3.url, tmpFile);

        const audioBuffer = await readFile(tmpFile);
        await sock.sendMessage(
          from,
          { audio: audioBuffer, mimetype: "audio/mpeg", ptt: false },
          { quoted: msg }
        );
        await react("✅");
      } catch (err) {
        console.error("[PLAY]", err.message);
        if (err.message.includes("No se encontró")) {
          await reply(`❌ No encontré: *${text}*`);
        } else if (err.message.includes("No se pudo obtener")) {
          await reply("❌ No se pudo convertir la canción. Intenta con otro nombre.");
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
      await sock.sendMessage(from, { text: "⬇️ Procesando URL..." }, { quoted: msg });
      const tmpFile = join(tmpdir(), `rage_url_${Date.now()}.mp3`);

      try {
        const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (!match) throw new Error("URL inválida.");
        const videoId = match[1];

        const mp3 = await getMp3Url(videoId);
        await sock.sendMessage(from, { text: `⬇️ Descargando: *${mp3.title}*...` }, { quoted: msg });
        await downloadMp3(mp3.url, tmpFile);

        const audioBuffer = await readFile(tmpFile);
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
        unlink(tmpFile).catch(() => {});
      }
    },
  },
];

export default musicCommands;
