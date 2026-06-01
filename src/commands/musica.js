// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/musica.js
//   Descargar canciones via Invidious API
//   Sin yt-dlp, sin cookies, funciona en servidores
// ═══════════════════════════════════════════

import { tmpdir } from "os";
import { join } from "path";
import { writeFile, unlink } from "fs/promises";
import axios from "axios";

// ── Instancias públicas de Invidious ────────
const INVIDIOUS_INSTANCES = [
  "https://invidious.nerdvpn.de",
  "https://invidious.privacyredirect.com",
  "https://inv.nadeko.net",
  "https://invidious.lunar.icu",
  "https://yt.artemislena.eu",
];

// ── Buscar video en YouTube via Invidious ───
async function searchVideo(query) {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await axios.get(`${instance}/api/v1/search`, {
        params: { q: query, type: "video", fields: "videoId,title,lengthSeconds", page: 1 },
        timeout: 8000,
      });
      if (res.data && res.data.length > 0) {
        const v = res.data[0];
        return {
          id: v.videoId,
          title: v.title,
          duration: v.lengthSeconds,
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          instance,
        };
      }
    } catch {}
  }
  throw new Error("No se encontró ningún resultado.");
}

// ── Obtener URL de audio via Invidious ──────
async function getAudioUrl(videoId, instance) {
  for (const inst of [instance, ...INVIDIOUS_INSTANCES.filter(i => i !== instance)]) {
    try {
      const res = await axios.get(`${inst}/api/v1/videos/${videoId}`, {
        params: { fields: "adaptiveFormats,formatStreams" },
        timeout: 10000,
      });
      const formats = [...(res.data.adaptiveFormats || []), ...(res.data.formatStreams || [])];
      // Buscar formato de audio mp4 o webm
      const audio = formats.find(f => f.type && f.type.includes("audio/mp4"))
                 || formats.find(f => f.type && f.type.includes("audio/webm"))
                 || formats.find(f => f.type && f.type.includes("audio"));
      if (audio && audio.url) return { url: audio.url, instance: inst };
    } catch {}
  }
  throw new Error("No se pudo obtener el audio.");
}

// ── Descargar audio como buffer ─────────────
async function downloadAudioBuffer(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 90000,
    maxContentLength: 25 * 1024 * 1024,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "*/*",
    },
  });
  return Buffer.from(res.data);
}

// ── Formatear duración ─────────────────────
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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

      try {
        let videoId, titulo, duracion, instancia;

        // Si es URL de YouTube
        if (text.includes("youtube.com") || text.includes("youtu.be")) {
          const match = text.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
          if (!match) return reply("❌ URL de YouTube inválida.");
          videoId = match[1];
          titulo = "Video de YouTube";
          duracion = "";
          instancia = INVIDIOUS_INSTANCES[0];
        } else {
          const info = await searchVideo(text);
          videoId = info.id;
          titulo = info.title;
          duracion = ` (${formatDuration(info.duration)})`;
          instancia = info.instance;
        }

        await sock.sendMessage(from, {
          text: `🎵 *${titulo}*${duracion}\n⬇️ Descargando...`
        }, { quoted: msg });

        const { url: audioUrl } = await getAudioUrl(videoId, instancia);
        const audioBuffer = await downloadAudioBuffer(audioUrl);

        if (audioBuffer.length > 22 * 1024 * 1024) {
          return reply("❌ La canción es demasiado pesada (máx ~22MB).");
        }

        // Detectar mimetype
        const isWebm = audioUrl.includes("webm");
        const mimetype = isWebm ? "audio/webm" : "audio/mp4";

        await sock.sendMessage(
          from,
          { audio: audioBuffer, mimetype, ptt: false },
          { quoted: msg }
        );

        await react("✅");
      } catch (err) {
        console.error("[PLAY]", err.message);
        if (err.message.includes("No se encontró")) {
          await reply(`❌ No encontré: *${text}*\nIntenta con otro nombre.`);
        } else if (err.message.includes("No se pudo")) {
          await reply("❌ No pude obtener el audio.\nIntenta con otra canción.");
        } else {
          await reply("❌ Error al descargar.\n_Intenta nuevamente en unos segundos._");
        }
        await react("❌");
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

      try {
        const match = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
        if (!match) return reply("❌ URL de YouTube inválida.");
        const videoId = match[1];

        const { url: audioUrl } = await getAudioUrl(videoId, INVIDIOUS_INSTANCES[0]);
        const audioBuffer = await downloadAudioBuffer(audioUrl);

        if (audioBuffer.length > 22 * 1024 * 1024) {
          return reply("❌ La canción es demasiado pesada (máx ~22MB).");
        }

        const isWebm = audioUrl.includes("webm");
        await sock.sendMessage(
          from,
          { audio: audioBuffer, mimetype: isWebm ? "audio/webm" : "audio/mp4", ptt: false },
          { quoted: msg }
        );
        await react("✅");
      } catch (err) {
        console.error("[PLAYURL]", err.message);
        await reply("❌ No pude descargar el audio.\n_Verifica que la URL sea válida._");
        await react("❌");
      }
    },
  },
];

export default musicCommands;
