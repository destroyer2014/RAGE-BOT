// ═══════════════════════════════════════════
//    PRAGMATA BOT — src/commands/imagen_ia.js
//  Generación de imágenes con Stability AI
// ═══════════════════════════════════════════

import axios from "axios";

const STABILITY_KEY = "sk-3KSc6sbTOrrscfubUy54Eq0j9GxbUO8IvfcraeBDKUiYleUG";

async function generateImage(prompt) {
  const res = await axios.post(
    "https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image",
    {
      text_prompts: [
        { text: prompt, weight: 1 },
        { text: "blurry, bad quality, watermark, nsfw", weight: -1 },
      ],
      cfg_scale: 7,
      height: 512,
      width: 512,
      samples: 1,
      steps: 30,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${STABILITY_KEY}`,
      },
      timeout: 60000,
    }
  );

  const b64 = res.data?.artifacts?.[0]?.base64;
  if (!b64) throw new Error("Sin imagen en la respuesta");
  return Buffer.from(b64, "base64");
}

const imagenIaCommands = [
  {
    name: "generar",
    alias: ["aiimg", "imagenia", "ia-imagen", "sdxl", "stablediffusion"],
    description: "Genera una imagen con IA !generar [descripción]",
    category: "IA 🤖",
    execute: async ({ text, reply, react, sock, from, msg }) => {
      if (!text) {
        return reply(
          "🖼️ *!generar*\n━━━━━━━━━━━━━━\n" +
          "Describe la imagen que quieres crear.\n" +
          "Ej: `!generar un dragón rojo volando sobre montañas`"
        );
      }

      await react("🎨");
      await sock.sendMessage(from, { text: "🎨 Generando imagen con IA..." }, { quoted: msg });

      try {
        const imageBuffer = await generateImage(text);

        await sock.sendMessage(
          from,
          {
            image: imageBuffer,
            caption: `🖼️ *Imagen generada*\n━━━━━━━━━━━━━━\n📝 ${text}\n\n_by Stability AI · PRAGMATA BOT_`,
          },
          { quoted: msg }
        );
        await react("✅");
      } catch (err) {
        console.error("[IMAGEN-IA]", err.message);
        if (err.response?.status === 402) {
          await reply("❌ Créditos de Stability AI agotados. Recarga en platform.stability.ai");
        } else {
          await reply("❌ No pude generar la imagen. Intenta con otra descripción.");
        }
        await react("❌");
      }
    },
  },
];

export default imagenIaCommands;
