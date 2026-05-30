// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/totext.js
//   Audio a texto via AssemblyAI (Whisper)
// ═══════════════════════════════════════════

import axios from "axios";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { createReadStream } from "fs";
import FormData from "form-data";

const execAsync = promisify(exec);
const ASSEMBLY_KEY = "a3549748e732402890e57444aa1beb1e";

async function uploadToAssembly(filePath) {
  const form = new FormData();
  form.append("file", createReadStream(filePath));

  const res = await axios.post("https://api.assemblyai.com/v2/upload", form, {
    headers: {
      ...form.getHeaders(),
      authorization: ASSEMBLY_KEY,
    },
    timeout: 60000,
  });
  return res.data.upload_url;
}

async function transcribeAudio(uploadUrl) {
  // Crear transcripción
  const res = await axios.post(
    "https://api.assemblyai.com/v2/transcript",
    { audio_url: uploadUrl, language_detection: true },
    {
      headers: { authorization: ASSEMBLY_KEY, "Content-Type": "application/json" },
      timeout: 15000,
    }
  );

  const transcriptId = res.data.id;

  // Polling hasta que termine
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const poll = await axios.get(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      { headers: { authorization: ASSEMBLY_KEY }, timeout: 10000 }
    );

    if (poll.data.status === "completed") return poll.data.text;
    if (poll.data.status === "error") throw new Error(poll.data.error || "Error transcribiendo");
  }

  throw new Error("Timeout: el audio tardó demasiado");
}

const totextCommands = [
  {
    name: "totext",
    alias: ["transcribir", "audio2texto", "voz2texto", "stt"],
    description: "Convierte un audio/nota de voz a texto !totext",
    category: "IA 🤖",
    execute: async ({ react, reply, sock, from, msg }) => {
      const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const targetMsg = quoted ? { message: quoted } : msg;
      const mtype = Object.keys(targetMsg?.message || {})[0];
      const isAudio = ["audioMessage", "videoMessage", "pttMessage"].includes(mtype);

      if (!isAudio) {
        return reply(
          "🎙️ *!totext*\n━━━━━━━━━━━━━━\n" +
          "Envía o *responde* una nota de voz / audio con `!totext` para transcribirlo."
        );
      }

      await react("🎙️");
      await sock.sendMessage(from, { text: "⏳ Transcribiendo audio..." }, { quoted: msg });

      const tmpRaw = join(tmpdir(), `totext_${Date.now()}.raw`);
      const tmpMp3 = tmpRaw.replace(".raw", ".mp3");

      try {
        const buffer = await downloadMediaMessage(
          { message: targetMsg.message, key: msg.key },
          "buffer",
          {},
          { logger: { info: () => {}, error: () => {}, warn: () => {} }, reuploadRequest: sock.updateMediaMessage }
        );

        await writeFile(tmpRaw, buffer);
        await execAsync(`ffmpeg -i "${tmpRaw}" -ar 16000 -ac 1 -b:a 64k "${tmpMp3}" -y`, { timeout: 30000 });

        const uploadUrl = await uploadToAssembly(tmpMp3);
        const text = await transcribeAudio(uploadUrl);

        if (!text || text.trim() === "") {
          return reply("❌ No pude detectar voz en el audio.");
        }

        await reply(`🎙️ *Transcripción*\n━━━━━━━━━━━━━━\n${text}`);
        await react("✅");
      } catch (err) {
        console.error("[TOTEXT]", err.message);
        await reply(`❌ Error al transcribir: ${err.message}`);
        await react("❌");
      } finally {
        unlink(tmpRaw).catch(() => {});
        unlink(tmpMp3).catch(() => {});
      }
    },
  },
];

export default totextCommands;
