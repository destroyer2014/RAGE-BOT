// ═══════════════════════════════════════════
//     RAGE-BOT — src/commands/diversion.js
// ═══════════════════════════════════════════

import { random, randomPick } from "../lib/utils.js";

// ── Respuestas de la bola 8 ─────────────────
const BOLA8 = [
  "✅ Definitivamente sí.",
  "✅ Mis fuentes dicen que sí.",
  "✅ Sin duda alguna.",
  "✅ Puedes contar con ello.",
  "✅ Las señales apuntan a que sí.",
  "🤔 Pregunta de nuevo más tarde.",
  "🤔 No puedo predecirlo ahora.",
  "🤔 Mejor no te digo.",
  "🤔 Concéntrate y pregunta de nuevo.",
  "❌ No cuentes con eso.",
  "❌ Mi respuesta es no.",
  "❌ Mis fuentes dicen que no.",
  "❌ Las perspectivas no son buenas.",
  "❌ Muy dudoso.",
];

// ── Insultos de broma ───────────────────────
const INSULTOS = [
  "Eres tan lento que Google Chrome te carga más rápido que tú piensas. 💀",
  "Tu IQ es igual al número de amigos que tienes... cero. 🙂",
  "Eres la razón por la que los envases de shampoo dicen 'no ingerir'. 🧴",
  "Si la estupidez fuera dolor, siempre estarías en el hospital. 💊",
  "Tu árbol genealógico es un cactus, todos son espinas y nadie da frutos. 🌵",
  "Eres tan aburrido que tu perfil de WhatsApp tiene menos visitas que una trampa para ratones. 🐭",
  "Tus neuronas tienen más distancia social que tú en la pandemia. 🧠",
  "Eres la persona por la que inventaron el botón de ignorar. 📵",
  "Si vendieras lo poco que sabes, seguirías siendo pobre. 💸",
  "Tienes cara de 'términos y condiciones', nadie te lee pero igual aceptan. 📄",
];

const funCommands = [
  // ────────────────────────────────────────
  // !dado
  // ────────────────────────────────────────
  {
    name: "dado",
    alias: ["dice", "roll"],
    description: "Tira un dado de 6 caras",
    category: "Diversión",
    execute: async ({ reply, args }) => {
      const caras = parseInt(args[0]) || 6;
      const resultado = random(1, caras);
      const emojis = ["", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"];
      const emoji = caras === 6 && resultado <= 6 ? emojis[resultado] : "🎲";
      await reply(`${emoji} *Dado de ${caras} caras*\nResultado: *${resultado}*`);
    },
  },

  // ────────────────────────────────────────
  // !moneda
  // ────────────────────────────────────────
  {
    name: "moneda",
    alias: ["coin", "cara", "sello", "flip"],
    description: "Lanza una moneda",
    category: "Diversión",
    execute: async ({ reply }) => {
      const result = Math.random() < 0.5 ? "🪙 *CARA*" : "🔵 *SELLO*";
      await reply(`Lanzando moneda...\n\n${result}`);
    },
  },

  // ────────────────────────────────────────
  // !8ball
  // ────────────────────────────────────────
  {
    name: "8ball",
    alias: ["bola8", "oraculo", "pregunta"],
    description: "Pregunta a la bola mágica",
    category: "Diversión",
    execute: async ({ reply, text }) => {
      if (!text) {
        return reply("❓ Escribe una pregunta.\nEj: *!8ball ¿Pasaré el examen?*");
      }
      const respuesta = randomPick(BOLA8);
      await reply(`🎱 *La Bola 8 dice...*\n\n❓ _${text}_\n\n${respuesta}`);
    },
  },

  // ────────────────────────────────────────
  // !ship
  // ────────────────────────────────────────
  {
    name: "ship",
    alias: ["amor", "love", "compatibilidad"],
    description: "Compatibilidad amorosa entre dos personas",
    category: "Diversión",
    execute: async ({ reply, args, msg }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

      let persona1 = "tú";
      let persona2 = "alguien especial";

      if (mentioned.length >= 2) {
        persona1 = `@${mentioned[0].split("@")[0]}`;
        persona2 = `@${mentioned[1].split("@")[0]}`;
      } else if (mentioned.length === 1) {
        persona1 = "tú";
        persona2 = `@${mentioned[0].split("@")[0]}`;
      } else if (args.length >= 1) {
        persona1 = args[0];
        persona2 = args[1] || "alguien";
      }

      const porcentaje = random(1, 100);
      const barra = "█".repeat(Math.floor(porcentaje / 10)) + "░".repeat(10 - Math.floor(porcentaje / 10));
      
      let nivel = "";
      if (porcentaje < 20) nivel = "💔 Ni de chiste...";
      else if (porcentaje < 40) nivel = "😬 Hay pocas esperanzas.";
      else if (porcentaje < 60) nivel = "🤔 Algo hay ahí...";
      else if (porcentaje < 80) nivel = "💕 ¡Buena vibra!";
      else if (porcentaje < 95) nivel = "❤️ ¡Hecho el uno para el otro!";
      else nivel = "💘 ¡AMOR PERFECTO! 🔥";

      await reply(
        `💘 *SHIPPEADOR 3000*\n` +
        `━━━━━━━━━━━━━━\n` +
        `👤 ${persona1}\n` +
        `❤️ + ❤️\n` +
        `👤 ${persona2}\n` +
        `━━━━━━━━━━━━━━\n` +
        `[${barra}] *${porcentaje}%*\n\n` +
        `${nivel}`
      );
    },
  },

  // ────────────────────────────────────────
  // !insulto
  // ────────────────────────────────────────
  {
    name: "insulto",
    alias: ["roast", "burn"],
    description: "Insulto de broma aleatorio",
    category: "Diversión",
    execute: async ({ reply }) => {
      await reply(`💀 *RAGE-BOT te destruye:*\n\n${randomPick(INSULTOS)}`);
    },
  },
];

export default funCommands;
