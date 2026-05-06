// ═══════════════════════════════════════════
//    RAGE-BOT — src/commands/descargas.js
//     Descargar videos de YT, TikTok, FB
//              v1.1.0
// ═══════════════════════════════════════════

import { exec } from "child_process";
import { unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

// ── Helper: descarga video compatible con WhatsApp ──
async function downloadVideo(url, label, ctx) {
  const { react, sock, from, msg } = ctx;
  const tmpFile = join(tmpdir(), "ragebot_vid_" + Date.now() + ".mp4");
  try {
    const cmds = [
      // Intento 1: formato simple sin JS runtime
      "yt-dlp -f \"best[ext=mp4][height<=720]/best[ext=mp4]/best\" " +
      "--recode-video mp4 " +
      "--postprocessor-args \"ffmpeg:-c:v libx264 -c:a aac -movflags +faststart\" " +
      "-o \"" + tmpFile + "\" \"" + url + "\" --no-playlist",
      // Intento 2: sin restricción de formato
      "yt-dlp -f \"bestvideo[height<=720]+bestaudio/best\" " +
      "--merge-output-format mp4 " +
      "--postprocessor-args \"ffmpeg:-c:v libx264 -c:a aac -movflags +faststart\" " +
      "-o \"" + tmpFile + "\" \"" + url + "\" --no-playlist",
    ];

    let downloaded = false;
    for (const cmd of cmds) {
      try {
        await execAsync(cmd, { timeout: 180000 });
        downloaded = true;
        break;
      } catch (e) {
        console.error("[DESCARGAS] intento fallido:", e.message.split("\n")[0]);
      }
    }

    if (!downloaded) throw new Error("No se pudo descargar");

    const buffer = await readFile(tmpFile);
    await sock.sendMessage(from, {
      video: buffer,
      caption: "✅ *" + label + "*\n🔗 " + url,
      mimetype: "video/mp4",
    }, { quoted: msg });
    await react("✅");
  } catch (err) {
    console.error("[DESCARGAS]", err.message);
    await ctx.reply("❌ No pude descargar el video. Verifica el link o intenta de nuevo.");
    await react("❌");
  } finally {
    try { await unlink(tmpFile); } catch {}
  }
}


const descargasCommands = [
  // ── YouTube video ──────────────────────────
  {
    name: "ytvideo",
    alias: ["ytv", "ytdown", "descargayt"],
    description: "Descarga un video de YouTube !ytvideo [url o nombre]",
    category: "Descargas 📥",
    execute: async (ctx) => {
      const { text, react, reply, sock, from, msg } = ctx;
      if (!text) return reply("❌ Uso: `!ytvideo [url o nombre del video]`");
      await react("⏳");

      let url = text;
      if (!text.startsWith("http")) {
        try {
          const { stdout } = await execAsync(
            "yt-dlp \"ytsearch1:" + text.replace(/"/g, "") + "\" --get-url --no-playlist -f \"best[ext=mp4][height<=720]/best\"",
            { timeout: 30000 }
          );
          url = stdout.trim().split("\n")[0];
          if (!url) return reply("❌ No encontré ese video en YouTube.");
        } catch {
          return reply("❌ Error buscando el video. Intenta con el link directo.");
        }
      }

      await downloadVideo(url, "Video de YouTube", ctx);
    },
  },

  // ── TikTok video ───────────────────────────
  {
    name: "tiktok",
    alias: ["tt", "tkvideo", "descargatt"],
    description: "Descarga un video de TikTok !tiktok [url]",
    category: "Descargas 📥",
    execute: async (ctx) => {
      const { text, react, reply, sock, from, msg } = ctx;
      if (!text || !text.startsWith("http")) return reply("❌ Uso: `!tiktok [url del video]`\nEjemplo: `!tiktok https://vt.tiktok.com/xxx`");

      await react("⏳");
      const tmpFile = join(tmpdir(), "ragebot_tt_" + Date.now() + ".mp4");
      try {
        // Usar tikwm.com API — no requiere impersonación
        const apiUrl = "https://www.tikwm.com/api/?url=" + encodeURIComponent(text) + "&hd=1";
        const { stdout: apiRes } = await execAsync("curl -s \"" + apiUrl + "\"", { timeout: 20000 });
        const data = JSON.parse(apiRes);

        if (!data || data.code !== 0) throw new Error("API error: " + (data?.msg || "sin respuesta"));

        // Si es foto redirigir
        if (data.data?.images && data.data.images.length > 0) {
          await reply("❌ Ese link es una *foto*, usa `!ttfoto [url]` para descargar fotos de TikTok.");
          await react("❌");
          return;
        }

        const videoUrl = data.data?.hdplay || data.data?.play;
        if (!videoUrl) throw new Error("No se encontró URL del video");

        // Descargar el video
        await execAsync(
          "curl -L -s -A \"Mozilla/5.0\" -o \"" + tmpFile + "\" \"" + videoUrl + "\"",
          { timeout: 120000 }
        );

        const buffer = await readFile(tmpFile);
        await sock.sendMessage(from, {
          video: buffer,
          caption: "✅ *Video de TikTok*\n🔗 " + text,
          mimetype: "video/mp4",
        }, { quoted: msg });
        await react("✅");
      } catch (err) {
        console.error("[TIKTOK ERROR]", err.message);
        await reply("❌ No pude descargar el video: " + err.message);
        await react("❌");
      } finally {
        try { await unlink(tmpFile); } catch {}
      }
    },
  },

  // ── TikTok foto ────────────────────────────
  {
    name: "ttfoto",
    alias: ["ttphoto", "tiktokfoto", "tikfoto"],
    description: "Descarga una foto de TikTok !ttfoto [url]",
    category: "Descargas 📥",
    execute: async (ctx) => {
      const { text, react, reply, sock, from, msg } = ctx;
      if (!text || !text.startsWith("http")) return reply("❌ Uso: `!ttfoto [url de la foto]`\nEjemplo: `!ttfoto https://vt.tiktok.com/xxx`");

      await react("⏳");
      try {
        // Usar tikwm.com API que soporta fotos y videos de TikTok
        const apiUrl = "https://www.tikwm.com/api/?url=" + encodeURIComponent(text) + "&hd=1";
        const { stdout: apiRes } = await execAsync("curl -s \"" + apiUrl + "\"", { timeout: 20000 });
        const data = JSON.parse(apiRes);

        if (!data || data.code !== 0) throw new Error("API no devolvió datos");

        const images = data.data?.images;
        const cover = data.data?.cover;

        if (images && images.length > 0) {
          // Es un post de fotos — enviar todas las imágenes
          for (let i = 0; i < Math.min(images.length, 10); i++) {
            const imgUrl = images[i];
            const tmpImg = join(tmpdir(), "ragebot_ttimg_" + Date.now() + "_" + i + ".jpg");
            await execAsync("curl -L -s -o \"" + tmpImg + "\" \"" + imgUrl + "\"", { timeout: 20000 });
            const buf = await readFile(tmpImg);
            await sock.sendMessage(from, {
              image: buf,
              caption: i === 0 ? "📸 *Foto " + (i+1) + "/" + images.length + " de TikTok*\n🔗 " + text : "📸 *Foto " + (i+1) + "/" + images.length + "*",
              mimetype: "image/jpeg",
            }, { quoted: msg });
            try { await unlink(tmpImg); } catch {}
          }
        } else if (cover) {
          // Es un video — enviar el cover como imagen
          const tmpImg = join(tmpdir(), "ragebot_ttcover_" + Date.now() + ".jpg");
          await execAsync("curl -L -s -o \"" + tmpImg + "\" \"" + cover + "\"", { timeout: 20000 });
          const buf = await readFile(tmpImg);
          await sock.sendMessage(from, {
            image: buf,
            caption: "🖼️ *Thumbnail de TikTok*\n🔗 " + text,
            mimetype: "image/jpeg",
          }, { quoted: msg });
          try { await unlink(tmpImg); } catch {}
        } else {
          throw new Error("No se encontraron imágenes");
        }

        await react("✅");
      } catch (err) {
        console.error("[TTFOTO]", err.message);
        await reply("❌ No pude descargar la foto. Verifica el link.");
        await react("❌");
      }
    },
  },

  // ── Facebook video ─────────────────────────
  {
    name: "fbvideo",
    alias: ["fb", "facebook", "descargafb"],
    description: "Descarga un video de Facebook !fbvideo [url]",
    category: "Descargas 📥",
    execute: async (ctx) => {
      const { text, react, reply } = ctx;
      if (!text || !text.startsWith("http")) return reply("❌ Uso: `!fbvideo [url del video]`\nEjemplo: `!fbvideo https://www.facebook.com/watch?v=xxx`");
      await react("⏳");
      await downloadVideo(text, "Video de Facebook", ctx);
    },
  },
];

export default descargasCommands;
