// ═══════════════════════════════════════════
//       PRAGMATA BOT — src/commands/ia.js
//         Chat con IA (Groq) + Voz
//              v1.1.0
// ═══════════════════════════════════════════

import { exec } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import https from "https";

const execAsync = promisify(exec);

// ── Llama a la API de Groq (gratis) ─────────
async function askGroq(prompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return reject(new Error("NO_KEY"));

    const messages = [
      {
        role: "system",
        content: "Eres PRAGMATA BOT, un asistente de WhatsApp divertido, directo y útil. Responde siempre en español de forma concisa, máximo 3 párrafos.",
      },
      { role: "user", content: prompt },
    ];

    const body = JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 500,
      temperature: 0.8,
    });

    const options = {
      hostname: "api.groq.com",
      path: "/openai/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error.message));
          resolve(json.choices?.[0]?.message?.content?.trim() || "Sin respuesta.");
        } catch { reject(new Error("Error parseando respuesta")); }
      });
    });

    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("Timeout")); });
    req.write(body);
    req.end();
  });
}

// ── Texto a audio con espeak + ffmpeg ───────
async function textToAudio(text) {
  const tmpWav = join(tmpdir(), `ragebot_tts_${Date.now()}.wav`);
  const tmpOgg = tmpWav.replace(".wav", ".ogg");

  await execAsync(
    `espeak -v es -s 150 -w "${tmpWav}" "${text.replace(/"/g, "'").substring(0, 400)}"`,
    { timeout: 15000 }
  );
  await execAsync(
    `ffmpeg -i "${tmpWav}" -c:a libopus -b:a 64k "${tmpOgg}" -y`,
    { timeout: 15000 }
  );

  const buffer = await readFile(tmpOgg);
  try { await unlink(tmpWav); } catch {}
  try { await unlink(tmpOgg); } catch {}
  return buffer;
}

const NO_KEY_MSG =
  "❌ *IA no configurada*\n━━━━━━━━━━━━━━\n" +
  "El owner debe configurar su API key de Groq (gratis):\n\n" +
  "1. Entra a *console.groq.com*\n" +
  "2. Crea una cuenta y genera una API key\n" +
  "3. En Termux antes de iniciar el bot:\n" +
  "`export GROQ_API_KEY=gsk_TUKEY`\n\n" +
  "_O agrégalo permanentemente en ~/.bashrc_";

const iaCommands = [
  {
    name: "ia",
    alias: ["gpt", "chatgpt", "chat", "groq"],
    description: "Chatea con IA !ia [mensaje]",
    category: "IA 🤖",
    execute: async (ctx) => {
      const { text, react, reply } = ctx;
      if (!text) return reply("❌ Uso: `!ia [tu pregunta]`\nEjemplo: `!ia ¿Qué es un agujero negro?`");

      await react("🤖");
      try {
        const respuesta = await askGroq(text);
        await reply(`🤖 *RAGE-IA*\n━━━━━━━━━━━━━━\n${respuesta}`);
        await react("✅");
      } catch (err) {
        if (err.message === "NO_KEY") {
          await reply(NO_KEY_MSG);
        } else {
          await reply(`❌ Error IA: ${err.message}`);
        }
        await react("❌");
      }
    },
  },

  {
    name: "iavoz",
    alias: ["voz", "audioia", "gptaudio"],
    description: "Respuesta de la IA en audio !iavoz [mensaje]",
    category: "IA 🤖",
    execute: async (ctx) => {
      const { text, react, reply, sock, from, msg } = ctx;
      if (!text) return reply("❌ Uso: `!iavoz [tu pregunta]`\nEjemplo: `!iavoz ¿Cuál es la capital de Perú?`");

      await react("🎙️");
      try {
        const respuesta = await askGroq(text);

        await reply(`🤖 *RAGE-IA*\n━━━━━━━━━━━━━━\n${respuesta}`);

        const audioBuffer = await textToAudio(respuesta);
        await sock.sendMessage(from, {
          audio: audioBuffer,
          mimetype: "audio/ogg; codecs=opus",
          ptt: true,
        }, { quoted: msg });

        await react("✅");
      } catch (err) {
        if (err.message === "NO_KEY") {
          await reply(NO_KEY_MSG);
        } else {
          await reply(
            `❌ Error: ${err.message}\n\n` +
            "_Para !iavoz necesitas instalar:\n`pkg install espeak ffmpeg -y`_"
          );
        }
        await react("❌");
      }
    },
  },
];

export default iaCommands;
