// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/musica.js
//   Descargar canciones como AUDIO (mp3)
//   Usa @distube/ytdl-core + ffmpeg-static
// ═══════════════════════════════════════════

import ytdl from "@distube/ytdl-core";
import ytsr from "ytsr";
import { createWriteStream, createReadStream } from "fs";
import { unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

// ── Busca en YouTube y retorna info ──────────
async function searchYouTube(query) {
  const results = await ytsr(query, { limit: 1 });
  const video = results.items.find(i => i.type === "video");
  if (!video) throw new Error("No se encontró ningún resultado.");
  return { url: video.url, title: video.title, duration: video.duration };
}

// ── Descarga audio como mp3 ─────────────────
async function downloadAudio(url, outPath) {
  return new Promise((resolve, reject) => {
    const stream = ytdl(url, {
      quality: "highestaudio",
      filter: "audioonly",
    });
    ffmpeg(stream)
      .audioBitrate(128)
      .toFormat("mp3")
      .on("end", resolve)
      .on("error", reject)
      .save(outPath);
  });
}

const musicCommands = [
  // ────────────────────────────────────────
  // !play — Descargar canción como audio
  // ────────────────────────────────────────
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

      const tmpMp3 = join(tmpdir(), `rage_audio_${Date.now()}.mp3`);

      try {
        const isUrl = text.startsWith("http");
        let url = text;
        let title = text;

        if (!isUrl) {
          const info = await searchYouTube(text);
          url = info.url;
          title = info.title;
        }

        await sock.sendMessage(from, { text: `⬇️ Descargando: *${title}*...` }, { quoted: msg });
        await downloadAudio(url, tmpMp3);

        const audioBuffer = await readFile(tmpMp3);

        await sock.sendMessage(
          from,
          {
            audio: audioBuffer,
            mimetype: "audio/mpeg",
            ptt: false,
          },
          { quoted: msg }
        );

        await react("✅");
      } catch (err) {
        console.error("[PLAY]", err.message);
        if (err.message.includes("No se encontró")) {
          await reply(`❌ No encontré ninguna canción con: *${text}*`);
        } else if (err.message.includes("Too large") || err.message.includes("size")) {
          await reply("❌ La canción es demasiado pesada (máx 20MB).");
        } else {
          await reply("❌ No pude descargar la canción. Intenta con otro nombre o URL.");
        }
        await react("❌");
      } finally {
        unlink(tmpMp3).catch(() => {});
      }
    },
  },

  // ────────────────────────────────────────
  // !playurl — Descargar por URL directa
  // ────────────────────────────────────────
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

      const tmpMp3 = join(tmpdir(), `rage_url_${Date.now()}.mp3`);

      try {
        await downloadAudio(url, tmpMp3);
        const audioBuffer = await readFile(tmpMp3);

        await sock.sendMessage(
          from,
          { audio: audioBuffer, mimetype: "audio/mpeg", ptt: false },
          { quoted: msg }
        );
        await react("✅");
      } catch (err) {
        console.error("[PLAYURL]", err.message);
        await reply("❌ No pude descargar el audio.\n_Verifica que la URL sea válida._");
        await react("❌");
      } finally {
        unlink(tmpMp3).catch(() => {});
      }
    },
  },
];

export default musicCommands;
