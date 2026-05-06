// ═══════════════════════════════════════════
//       RAGE-BOT — src/commands/juegos.js
//     Ahorcado, Adivina el número, SuitPvP
//              v1.0.0
// ═══════════════════════════════════════════

import { randomPick } from "../lib/utils.js";

// ── Estado de juegos activos ─────────────────
const ahorcadoGames = new Map();
const adivinaGames = new Map();
const pvpGames = new Map();

// ── Palabras para ahorcado ───────────────────
const PALABRAS = [
  "javascript","programacion","computadora","telefono","whatsapp","discord","musica",
  "pelicula","aventura","dinosaurio","helicoptero","matematicas","ciencias","historia",
  "geografia","literatura","filosofia","psicologia","economia","politica","religion",
  "naturaleza","universo","galaxia","planeta","estrella","cometa","asteroide","nebulosa",
  "oceano","montana","desierto","selva","ciudad","pais","continente","cultura","idioma",
];

const AHORCADO_DIBUJO = [
  "  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========",
  "  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========",
];

const redesCommands = [
  // ── AHORCADO ─────────────────────────────────
  {
    name: "ahorcado",
    alias: ["hangman"],
    description: "Juega al ahorcado !ahorcado para empezar",
    category: "Juegos 🎮",
    execute: async ({ from, sender, args, reply, react, sock, msg }) => {
      const letra = (args[0] || "").toLowerCase().trim();

      // Si no hay letra, iniciar nuevo juego
      if (!letra || letra === "nuevo") {
        const palabra = PALABRAS[Math.floor(Math.random() * PALABRAS.length)];
        ahorcadoGames.set(from + sender, {
          palabra,
          letras: new Set(),
          errores: 0,
          maxErrores: 6,
        });
        const game = ahorcadoGames.get(from + sender);
        const display = palabra.split("").map(() => "_").join(" ");
        await reply(
          "🎮 *AHORCADO*\n━━━━━━━━━━━━━━\n" +
          "```" + AHORCADO_DIBUJO[0] + "```\n\n" +
          "📝 Palabra: *" + display + "*\n" +
          "❤️ Vidas: 6/6\n\n" +
          "Escribe `!ahorcado [letra]` para adivinar.\nEjemplo: `!ahorcado a`"
        );
        return;
      }

      const game = ahorcadoGames.get(from + sender);
      if (!game) return reply("❌ No tienes un juego activo. Escribe `!ahorcado` para empezar.");
      if (letra.length !== 1 || !/[a-záéíóúñ]/.test(letra)) return reply("❌ Escribe solo una letra.");
      if (game.letras.has(letra)) return reply("⚠️ Ya usaste esa letra.");

      game.letras.add(letra);
      if (!game.palabra.includes(letra)) game.errores++;

      const display = game.palabra.split("").map((l) => (game.letras.has(l) ? l : "_")).join(" ");
      const usadas = [...game.letras].join(", ");
      const vidas = game.maxErrores - game.errores;

      if (game.errores >= game.maxErrores) {
        ahorcadoGames.delete(from + sender);
        return reply(
          "💀 *PERDISTE*\n━━━━━━━━━━━━━━\n" +
          "```" + AHORCADO_DIBUJO[6] + "```\n\n" +
          "La palabra era: *" + game.palabra + "*\n\nEscribe `!ahorcado` para jugar de nuevo."
        );
      }

      if (!display.includes("_")) {
        ahorcadoGames.delete(from + sender);
        return reply("🎉 *¡GANASTE!*\n━━━━━━━━━━━━━━\nLa palabra era: *" + game.palabra + "*\n+50 XP 🌟");
      }

      await reply(
        "🎮 *AHORCADO*\n━━━━━━━━━━━━━━\n" +
        "```" + AHORCADO_DIBUJO[game.errores] + "```\n\n" +
        "📝 Palabra: *" + display + "*\n" +
        "❤️ Vidas: " + vidas + "/" + game.maxErrores + "\n" +
        "🔤 Letras usadas: " + usadas
      );
    },
  },

  // ── ADIVINA EL NÚMERO ─────────────────────────
  {
    name: "adivina",
    alias: ["adivinanumero", "guessnumber"],
    description: "Adivina el número !adivina para empezar",
    category: "Juegos 🎮",
    execute: async ({ from, sender, args, reply }) => {
      const input = parseInt(args[0]);

      if (!args[0] || args[0] === "nuevo") {
        const numero = Math.floor(Math.random() * 100) + 1;
        adivinaGames.set(from + sender, { numero, intentos: 0, maxIntentos: 7 });
        return reply(
          "🔢 *ADIVINA EL NÚMERO*\n━━━━━━━━━━━━━━\n" +
          "Estoy pensando un número del *1 al 100*.\n" +
          "Tienes *7 intentos*.\n\n" +
          "Escribe `!adivina [número]` para adivinar.\nEjemplo: `!adivina 50`"
        );
      }

      const game = adivinaGames.get(from + sender);
      if (!game) return reply("❌ No tienes un juego activo. Escribe `!adivina` para empezar.");
      if (isNaN(input) || input < 1 || input > 100) return reply("❌ Escribe un número del 1 al 100.");

      game.intentos++;
      const restantes = game.maxIntentos - game.intentos;

      if (input === game.numero) {
        adivinaGames.delete(from + sender);
        return reply("🎉 *¡CORRECTO!*\nEl número era *" + game.numero + "*\nLo adivinaste en *" + game.intentos + "* intentos. +30 XP 🌟");
      }

      if (game.intentos >= game.maxIntentos) {
        adivinaGames.delete(from + sender);
        return reply("💀 *¡PERDISTE!*\nEl número era *" + game.numero + "*\n\nEscribe `!adivina` para jugar de nuevo.");
      }

      const pista = input < game.numero ? "📈 El número es *mayor*" : "📉 El número es *menor*";
      await reply(pista + "\n🎯 Intentos restantes: *" + restantes + "*");
    },
  },

  // ── SUIT PVP ─────────────────────────────────
  {
    name: "suitpvp",
    alias: ["pvp", "batalla", "duel"],
    description: "Pelea con alguien !suitpvp @usuario",
    category: "Juegos 🎮",
    execute: async ({ from, sender, msg, args, react, reply, sock }) => {
      if (!from.endsWith("@g.us")) return reply("❌ Solo funciona en grupos.");
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const rival = mentioned[0];
      if (!rival) return reply("❌ Debes mencionar a alguien. Ejemplo: `!suitpvp @usuario`");
      if (rival === sender) return reply("❌ No puedes pelear contigo mismo.");

      await react("⚔️");

      const ataques = [
        "le lanzó una espada de diamante ⚔️",
        "le tiró una bola de fuego 🔥",
        "le pegó con un hacha 🪓",
        "le disparó una flecha 🏹",
        "le lanzó una granada 💣",
        "le pateó con toda la fuerza 🦵",
        "le golpeó con un bastón mágico 🪄",
        "lo fulminó con un rayo ⚡",
        "lo congeló con hielo ❄️",
        "lo aplastó con una roca 🪨",
      ];

      let hpA = 100, hpB = 100;
      const n1 = sender.split("@")[0];
      const n2 = rival.split("@")[0];
      let log = "⚔️ *SUIT PVP*\n━━━━━━━━━━━━━━\n";
      log += "👤 @" + n1 + " vs 👤 @" + n2 + "\n\n";

      for (let i = 0; i < 5; i++) {
        const dmgA = Math.floor(Math.random() * 25) + 10;
        const dmgB = Math.floor(Math.random() * 25) + 10;
        const atkA = ataques[Math.floor(Math.random() * ataques.length)];
        const atkB = ataques[Math.floor(Math.random() * ataques.length)];
        hpB = Math.max(0, hpB - dmgA);
        hpA = Math.max(0, hpA - dmgB);
        log += "🗡️ @" + n1 + " " + atkA + " a @" + n2 + " (-" + dmgA + " HP)\n";
        log += "🛡️ @" + n2 + " " + atkB + " a @" + n1 + " (-" + dmgB + " HP)\n\n";
        if (hpA <= 0 || hpB <= 0) break;
      }

      const ganador = hpA > hpB ? "@" + n1 : hpB > hpA ? "@" + n2 : null;
      log += "━━━━━━━━━━━━━━\n";
      log += "❤️ @" + n1 + ": " + hpA + " HP\n";
      log += "❤️ @" + n2 + ": " + hpB + " HP\n\n";
      log += ganador ? "🏆 *¡" + ganador + " GANÓ LA BATALLA!* 🎉" : "🤝 *¡EMPATE!*";

      await sock.sendMessage(from, { text: log, mentions: [sender, rival] }, { quoted: msg });
    },
  },
];

export default redesCommands;
