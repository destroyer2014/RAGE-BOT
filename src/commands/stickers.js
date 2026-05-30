// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/stickers.js
// ═══════════════════════════════════════════

import { writeFile, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { execSync, exec } from "child_process";
import { promisify } from "util";
import { getQuoted, getMessageType } from "../lib/utils.js";
import config from "../../config.js";
// Metadata del sticker via ffmpeg metadata
function addStickerMetadata(buffer) {
  return buffer;
}

const execAsync = promisify(exec);

async function downloadMedia(sock, msg) {
  const { downloadMediaMessage } = await import("@whiskeysockets/baileys");
  return await downloadMediaMessage(msg, "buffer", {});
}

async function imageToSticker(buffer) {
  const tmpIn = join(tmpdir(), `rage_in_${Date.now()}.jpg`);
  const tmpOut = join(tmpdir(), `rage_out_${Date.now()}.webp`);
  await writeFile(tmpIn, buffer);
  const vf = "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:white";
  const packname = config.stickerPackname.replace(/\n/g, " ");
  const author   = config.stickerAuthor.replace(/\n/g, " ");
  try {
    execSync(
      `ffmpeg -y -i "${tmpIn}" -vf "${vf}" -vcodec libwebp -compression_level 6 -metadata title="${packname}" -metadata artist="${author}" "${tmpOut}"`,
      { stdio: "pipe" }
    );
    return await readFile(tmpOut);
  } finally {
    unlink(tmpIn).catch(() => {});
    unlink(tmpOut).catch(() => {});
  }
}

async function videoToSticker(buffer) {
  const tmpIn = join(tmpdir(), `rage_vin_${Date.now()}.mp4`);
  const tmpOut = join(tmpdir(), `rage_vout_${Date.now()}.webp`);
  await writeFile(tmpIn, buffer);
  const vf = "fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:white";
  try {
    execSync(
      `ffmpeg -y -i "${tmpIn}" -t 3 -vf "${vf}" -loop 0 -preset default -an -vsync 0 "${tmpOut}"`,
      { stdio: "pipe", timeout: 60000 }
    );
    return await readFile(tmpOut);
  } finally {
    unlink(tmpIn).catch(() => {});
    unlink(tmpOut).catch(() => {});
  }
}

const stickerCommands = [
  // ────────────────────────────────────────
  // !sticker — imagen/video a sticker
  // ────────────────────────────────────────
  {
    name: "sticker",
    alias: ["s", "stiker"],
    description: "Convierte imagen/video a sticker",
    category: "Stickers",
    freeAllowed: true,
    execute: async ({ sock, msg, from, reply, react }) => {
      const quoted = getQuoted(msg);
      const msgType = getMessageType(msg);
      let targetMsg = msg;
      let targetType = msgType;

      if (msgType !== "imageMessage" && msgType !== "videoMessage") {
        if (quoted) {
          targetMsg = { message: quoted.message, key: msg.key };
          targetType = Object.keys(quoted.message)[0];
        } else {
          return reply("📸 *Envía o responde una imagen/video con* `!sticker`");
        }
      }

      if (targetType !== "imageMessage" && targetType !== "videoMessage") {
        return reply("❌ Solo puedo convertir *imágenes* o *videos cortos* a sticker.");
      }

      await react("🎨");
      try {
        const buffer = await downloadMedia(sock, targetMsg);
        const webp = targetType === "videoMessage"
          ? await videoToSticker(buffer)
          : await imageToSticker(buffer);
        await sock.sendMessage(from, { sticker: webp, mimetype: 'image/webp' }, { quoted: msg });
        await react("✅");
      } catch (err) {
        console.error("[STICKER]", err.message);
        await reply("❌ Error al crear el sticker.\n_Asegúrate de tener ffmpeg:_\n`pkg install ffmpeg`");
        await react("❌");
      }
    },
  },

  // ────────────────────────────────────────
  // !stickervid — sticker animado a video
  // ────────────────────────────────────────
  {
    name: "stickervid",
    alias: ["svid", "stickertomp4", "stickervideo"],
    description: "Convierte sticker animado a video MP4",
    category: "Stickers",
    freeAllowed: true,
    execute: async ({ sock, msg, from, reply, react }) => {
      const quoted = getQuoted(msg);
      const msgType = getMessageType(msg);
      let targetMsg = msg;

      if (msgType !== "stickerMessage") {
        if (quoted?.message?.stickerMessage) {
          targetMsg = { message: quoted.message, key: msg.key };
        } else {
          return reply("🎭 *Responde un sticker animado con* `!stickervid`");
        }
      }

      await react("🎬");
      const tmpIn = join(tmpdir(), `rage_stin_${Date.now()}.webp`);
      const tmpOut = join(tmpdir(), `rage_stout_${Date.now()}.mp4`);

      try {
        const buffer = await downloadMedia(sock, targetMsg);
        await writeFile(tmpIn, buffer);

        execSync(
          `ffmpeg -y -i "${tmpIn}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${tmpOut}"`,
          { stdio: "pipe", timeout: 30000 }
        );

        const videoBuffer = await readFile(tmpOut);
        await sock.sendMessage(
          from,
          {
            video: videoBuffer,
            caption: "🎬 Sticker convertido a video ✅",
            mimetype: "video/mp4",
          },
          { quoted: msg }
        );
        await react("✅");
      } catch (err) {
        console.error("[STICKERVID]", err.message);
        await reply("❌ No pude convertir el sticker.\n_El sticker debe ser animado._");
        await react("❌");
      } finally {
        unlink(tmpIn).catch(() => {});
        unlink(tmpOut).catch(() => {});
      }
    },
  },

  // ────────────────────────────────────────
  // !toimg — sticker a imagen
  // ────────────────────────────────────────
  {
    name: "toimg",
    alias: ["stickertoimg", "toimage", "unsticker"],
    description: "Convierte sticker a imagen",
    category: "Stickers",
    freeAllowed: true,
    execute: async ({ sock, msg, from, reply, react }) => {
      const quoted = getQuoted(msg);
      const msgType = getMessageType(msg);
      let targetMsg = msg;

      if (msgType !== "stickerMessage") {
        if (quoted?.message?.stickerMessage) {
          targetMsg = { message: quoted.message, key: msg.key };
        } else {
          return reply("🎭 *Responde un sticker con* `!toimg`");
        }
      }

      await react("🖼️");
      try {
        const buffer = await downloadMedia(sock, targetMsg);
        await sock.sendMessage(
          from,
          { image: buffer, caption: "✅ Aquí está tu imagen" },
          { quoted: msg }
        );
        await react("✅");
      } catch (err) {
        await reply("❌ No pude convertir el sticker a imagen.");
        await react("❌");
      }
    },
  },

  // ────────────────────────────────────────
  // !stext — texto a sticker estático
  // ────────────────────────────────────────
  {
    name: "stext",
    alias: ["textsticker", "tsticker"],
    description: "Crea un sticker de texto",
    category: "Stickers",
    freeAllowed: true,
    execute: async ({ sock, from, msg, reply, react, text }) => {
      if (!text) return reply("✏️ Escribe el texto.\nEj: *!stext Hola mundo!*");
      await react("✏️");
      const tmpOut = join(tmpdir(), `rage_text_${Date.now()}.webp`);
      try {
        const safeText = text.replace(/'/g, "\\'").slice(0, 80);
        execSync(
          `ffmpeg -y -f lavfi -i color=c=0x1a1a2e:s=512x512 ` +
          `-vf "drawtext=text='${safeText}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=(h-text_h)/2:line_spacing=10:fontfile=/system/fonts/DroidSans.ttf" ` +
          `-frames:v 1 "${tmpOut}"`,
          { stdio: "pipe" }
        );
        const webpBuffer = await readFile(tmpOut);
        await sock.sendMessage(from, { sticker: webpBuffer, mimetype: 'image/webp' }, { quoted: msg });
        await react("✅");
      } catch {
        await reply("❌ No pude crear el sticker de texto.\n_Requiere ffmpeg:_\n`pkg install ffmpeg`");
        await react("❌");
      } finally {
        unlink(tmpOut).catch(() => {});
      }
    },
  },

  // ────────────────────────────────────────
  // !sanim — texto a sticker ANIMADO
  // ────────────────────────────────────────
  {
    name: "sanim",
    alias: ["animsticker", "stickeranim", "stickergif"],
    description: "Crea un sticker animado de texto",
    category: "Stickers",
    freeAllowed: true,
    execute: async ({ sock, from, msg, reply, react, text }) => {
      if (!text) return reply("✏️ Escribe el texto.\nEj: *!sanim Hola mundo!*");
      await react("✨");
      const tmpOut = join(tmpdir(), `rage_anim_${Date.now()}.webp`);
      try {
        const safeText = text.replace(/'/g, "\\'").slice(0, 60);
        // Animación: texto que parpadea con fade in/out
        execSync(
          `ffmpeg -y -f lavfi -i color=c=0x1a1a2e:s=512x512:r=10 -t 2 ` +
          `-vf "drawtext=text='${safeText}':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=(h-text_h)/2:alpha='if(lt(t,0.5),t/0.5,if(lt(t,1.5),1,(2-t)/0.5))':fontfile=/system/fonts/DroidSans.ttf" ` +
          `-loop 0 -an "${tmpOut}"`,
          { stdio: "pipe", timeout: 30000 }
        );
        const webpBuffer = await readFile(tmpOut);
        await sock.sendMessage(from, { sticker: webpBuffer, mimetype: 'image/webp' }, { quoted: msg });
        await react("✅");
      } catch (err) {
        console.error("[SANIM]", err.message);
        await reply("❌ No pude crear el sticker animado.\n_Requiere ffmpeg:_\n`pkg install ffmpeg`");
        await react("❌");
      } finally {
        unlink(tmpOut).catch(() => {});
      }
    },
  },
];

export default stickerCommands;
