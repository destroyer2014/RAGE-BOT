// ═══════════════════════════════════════════
//   PRAGMATA BOT — src/commands/ahorcado.js
//   Ahorcado multijugador + Lotería Owner
// ═══════════════════════════════════════════

import config from "../../config.js";
import { setPremium, getTopUsers } from "../lib/database.js";

// ── AHORCADO ────────────────────────────────
const PALABRAS = [
  "JAVASCRIPT","PYTHON","ANDROID","WHATSAPP","PREMIUM","BATALLA","DRAGON",
  "LEYENDA","COMANDO","SERVIDOR","MUSICA","DISCORD","INTERNET","PROGRAMA",
  "TECLADO","PANTALLA","CAMARA","TELEFONO","YOUTUBE","FACEBOOK","INSTAGRAM",
  "GUERRERO","CASTILLO","GALAXIA","PLANETA","MONTANA","OCEANO","VOLCAN",
];

const HORCA = [
  "```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========```",
  "```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========```",
];

const partidas = new Map(); // groupJid → { palabra, oculta, letras, intentos, jugadores, creador }

function ocultarPalabra(palabra, letras) {
  return palabra.split("").map(l => letras.has(l) ? l : "＿").join(" ");
}

const ahorcadoCommands = [

  // ── !ahorcado ────────────────────────────
  {
    name: "ahorcado",
    alias: ["hangman", "horquilla"],
    description: "Juego de ahorcado multijugador en el grupo",
    category: "Juegos",
    execute: async ({ sock, from, msg, reply, args, sender, isGroup }) => {
      if (!isGroup) return reply("👥 Este juego es solo para grupos.");
      const sub = (args[0] || "").toLowerCase();

      // ── CREAR partida ──
      if (sub === "nuevo" || sub === "start" || sub === "crear") {
        if (partidas.has(from)) return reply("⚠️ Ya hay una partida activa. Usa *!ahorcado rendirse* para terminarla.");
        const palabra = PALABRAS[Math.floor(Math.random() * PALABRAS.length)];
        partidas.set(from, {
          palabra,
          oculta: new Set(),
          intentos: 0,
          jugadores: new Set([sender]),
          creador: sender,
          timeout: setTimeout(() => {
            partidas.delete(from);
            sock.sendMessage(from, { text: `⏰ *Ahorcado* — Tiempo agotado.\nLa palabra era: *${palabra}*` });
          }, 5 * 60 * 1000), // 5 minutos
        });
        const oculta = ocultarPalabra(palabra, new Set());
        await sock.sendMessage(from, {
          text:
            `🎮 *AHORCADO MULTIJUGADOR*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `${HORCA[0]}\n\n` +
            `📝 Palabra: *${oculta}*\n` +
            `🔤 ${palabra.length} letras\n\n` +
            `Adivina con: *!letra [A-Z]*\n` +
            `Unirse: *!ahorcado unirse*\n` +
            `Rendirse: *!ahorcado rendirse*\n` +
            `_Tiempo límite: 5 minutos_`,
        }, { quoted: msg });
        return;
      }

      // ── UNIRSE ──
      if (sub === "unirse" || sub === "join") {
        if (!partidas.has(from)) return reply("❌ No hay partida activa. Crea una con *!ahorcado nuevo*");
        const g = partidas.get(from);
        g.jugadores.add(sender);
        return reply(`✅ @${sender.split("@")[0]} se unió al juego. Jugadores: ${g.jugadores.size}`);
      }

      // ── RENDIRSE ──
      if (sub === "rendirse" || sub === "stop") {
        if (!partidas.has(from)) return reply("❌ No hay partida activa.");
        const g = partidas.get(from);
        clearTimeout(g.timeout);
        partidas.delete(from);
        return reply(`🏳️ Partida terminada.\nLa palabra era: *${g.palabra}*`);
      }

      // ── STATUS ──
      if (!partidas.has(from)) {
        return reply(
          `🎮 *AHORCADO*\n\n` +
          `• *!ahorcado nuevo* — Crear partida\n` +
          `• *!ahorcado unirse* — Unirse a partida activa\n` +
          `• *!letra [A]* — Adivinar letra\n` +
          `• *!ahorcado rendirse* — Terminar partida`
        );
      }
      const g = partidas.get(from);
      const oculta = ocultarPalabra(g.palabra, g.oculta);
      await reply(
        `🎮 *AHORCADO — En curso*\n` +
        `${HORCA[g.intentos]}\n\n` +
        `📝 Palabra: *${oculta}*\n` +
        `❌ Intentos: ${g.intentos}/6\n` +
        `🔤 Letras usadas: ${[...g.oculta].join(" ") || "ninguna"}`
      );
    },
  },

  // ── !letra ───────────────────────────────
  {
    name: "letra",
    alias: ["guess", "adivinaletра"],
    description: "Adivinar una letra en el ahorcado",
    category: "Juegos",
    execute: async ({ sock, from, msg, reply, args, sender }) => {
      if (!partidas.has(from)) return reply("❌ No hay partida activa. Usa *!ahorcado nuevo*");
      const g = partidas.get(from);
      const letra = (args[0] || "").toUpperCase().trim();
      if (!letra || !/^[A-ZÁÉÍÓÚÑ]$/.test(letra)) return reply("🔤 Escribe una sola letra válida.\nEj: *!letra A*");
      if (g.oculta.has(letra)) return reply(`⚠️ La letra *${letra}* ya fue usada.`);

      g.oculta.add(letra);
      const oculta = ocultarPalabra(g.palabra, g.oculta);

      if (!g.palabra.includes(letra)) {
        g.intentos++;
        if (g.intentos >= 6) {
          clearTimeout(g.timeout);
          partidas.delete(from);
          await sock.sendMessage(from, {
            text:
              `💀 *¡PERDIERON!*\n` +
              `${HORCA[6]}\n\n` +
              `La palabra era: *${g.palabra}*`,
          }, { quoted: msg });
          return;
        }
        await sock.sendMessage(from, {
          text:
            `❌ La letra *${letra}* no está en la palabra\n` +
            `${HORCA[g.intentos]}\n\n` +
            `📝 *${oculta}*\n` +
            `❌ Intentos: ${g.intentos}/6\n` +
            `🔤 Letras: ${[...g.oculta].join(" ")}`,
        }, { quoted: msg });
        return;
      }

      // Letra correcta — ¿ganaron?
      if (!oculta.includes("＿")) {
        clearTimeout(g.timeout);
        partidas.delete(from);
        const jugadores = [...g.jugadores].map(j => `@${j.split("@")[0]}`).join(", ");
        await sock.sendMessage(from, {
          text:
            `🎉 *¡GANARON!*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `La palabra era: *${g.palabra}* ✅\n\n` +
            `👥 Jugadores: ${jugadores}`,
          mentions: [...g.jugadores],
        }, { quoted: msg });
        return;
      }

      await sock.sendMessage(from, {
        text:
          `✅ ¡Correcto! La letra *${letra}* está en la palabra\n` +
          `${HORCA[g.intentos]}\n\n` +
          `📝 *${oculta}*\n` +
          `❌ Intentos: ${g.intentos}/6\n` +
          `🔤 Letras: ${[...g.oculta].join(" ")}`,
      }, { quoted: msg });
    },
  },

];

// ── LOTERÍA ──────────────────────────────────
export const loteriaCommands = [
  {
    name: "loteria",
    alias: ["sorteo", "rifa"],
    description: "Sortear 1 premium de 1 semana entre todos los grupos [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ sock, from, msg, reply }) => {
      await reply("🎰 *Iniciando lotería PRAGMATA BOT...*\nSorteando en todos los grupos...");

      try {
        // Obtener todos los grupos donde está el bot
        const grupos = await sock.groupFetchAllParticipating();
        const jids   = Object.keys(grupos);

        if (!jids.length) return reply("❌ El bot no está en ningún grupo.");

        // Recopilar todos los participantes de todos los grupos
        let todos = [];
        for (const gid of jids) {
          const meta = grupos[gid];
          for (const p of meta.participants) {
            if (p.id !== sock.user.id) todos.push({ jid: p.id, grupo: meta.subject });
          }
        }

        if (!todos.length) return reply("❌ No se encontraron participantes.");

        // Sortear 1 ganador
        const ganador = todos[Math.floor(Math.random() * todos.length)];
        const tag = `@${ganador.jid.split("@")[0]}`;

        // Dar premium 7 días
        setPremium(ganador.jid, true, 7);

        // Anunciar en todos los grupos
        const anuncio =
          `🎰 *¡LOTERÍA PRAGMATA BOT!*\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `🎉 ¡Tenemos un ganador!\n\n` +
          `👑 *${tag}* ha ganado\n` +
          `💎 *PREMIUM por 1 semana* gratis\n\n` +
          `🤖 Premio otorgado automáticamente\n` +
          `⚡ *PRAGMATA BOT v${config.botVersion}* — by *Zemo & Smith*`;

        for (const gid of jids) {
          try {
            await sock.sendMessage(gid, { text: anuncio, mentions: [ganador.jid] });
            await new Promise(r => setTimeout(r, 500)); // pequeña pausa entre grupos
          } catch {}
        }

        await reply(
          `✅ *Lotería completada*\n` +
          `👑 Ganador: ${tag}\n` +
          `📍 Grupo: ${ganador.grupo}\n` +
          `💎 Premium 7 días otorgado`
        );

      } catch (e) {
        await reply(`❌ Error en la lotería: ${e.message}`);
      }
    },
  },
];

export default [...ahorcadoCommands, ...loteriaCommands];
