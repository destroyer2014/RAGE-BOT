// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/musica.js
//   Descargar canciones como AUDIO (mp3)
// ═══════════════════════════════════════════

import { exec } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const execAsync = promisify(exec);

// ── Obtiene el binario de yt-dlp ─────────────
function getYtDlpBin() {
  try {
    const ytDlpExec = require("yt-dlp-exec");
    return ytDlpExec.path || "yt-dlp";
  } catch {
    return "yt-dlp";
  }
}
const YT_DLP = getYtDlpBin();

function ytdlpAvailable() {
  return true; // yt-dlp-exec incluye el binario
}

// ── Busca en YouTube y retorna URL ──────────
async function searchYouTube(query) {
  const { stdout } = await execAsync(
    `"${YT_DLP}" "ytsearch1:${query.replace(/"/g, "")}" --get-id --no-playlist`,
    { timeout: 30000 }
  );
  const videoId = stdout.trim();
  if (!videoId) throw new Error("No se encontró ningún resultado.");
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// ── Descarga audio como mp3 ─────────────────
async function downloadAudio(url, outPath) {
  await execAsync(
    `"${YT_DLP}" -x --audio-format mp3 --audio-quality 5 ` +
    `--no-playlist --max-filesize 20m ` +
    `--output "${outPath}" "${url}"`,
    { timeout: 120000 }
  );
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

      if (!ytdlpAvailable()) {
        return reply(
          "❌ *yt-dlp no está instalado.*\n\n" +
          "Instálalo en Termux con:\n" +
          "```pkg install python\npip install yt-dlp```"
        );
      }

      await react("🎵");
      await sock.sendMessage(from, { text: `🔍 Buscando: *${text}*...` }, { quoted: msg });

      const tmpMp3 = join(tmpdir(), `rage_audio_${Date.now()}.mp3`);

      try {
        // Busca en YouTube
        const url = text.startsWith("http") ? text : await searchYouTube(text);

        await sock.sendMessage(from, { text: "⬇️ Descargando audio..." }, { quoted: msg });
        await downloadAudio(url, tmpMp3);

        // Verifica que el archivo exista
        await access(tmpMp3);

        const { readFile } = await import("fs/promises");
        const audioBuffer = await readFile(tmpMp3);

        // Envía como audio (PTT = false para que se vea como archivo, no nota de voz)
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
        if (err.message.includes("File is larger")) {
          await reply("❌ La canción es demasiado pesada (máx 20MB).");
        } else if (err.message.includes("No se encontró")) {
          await reply(`❌ No encontré ninguna canción con: *${text}*`);
        } else {
          await reply("❌ No pude descargar la canción.\n_Verifica que yt-dlp esté actualizado:_\n`pip install -U yt-dlp`");
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

      if (!ytdlpAvailable()) {
        return reply("❌ *yt-dlp no está instalado.*\n```pkg install python\npip install yt-dlp```");
      }

      await react("🎵");
      await sock.sendMessage(from, { text: "⬇️ Descargando audio desde URL..." }, { quoted: msg });

      const tmpMp3 = join(tmpdir(), `rage_url_${Date.now()}.mp3`);

      try {
        await downloadAudio(url, tmpMp3);
        await access(tmpMp3);

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
        await reply("❌ No pude descargar el audio.\n_Verifica que la URL sea válida._");
        await react("❌");
      } finally {
        unlink(tmpMp3).catch(() => {});
      }
    },
  },
];

export default musicCommands;
