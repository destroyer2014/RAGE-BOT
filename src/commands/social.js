// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/social.js
//        Comandos sociales para todos
// ═══════════════════════════════════════════

import { getUser, addXP, setXP } from "../lib/database.js";
import fs from "fs";
import { join } from "path";

const USERS_FILE = join(process.cwd(), "data", "users.json");

function saveTimestamp(sender, field) {
  try {
    const db = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    const id = sender.split("@")[0];
    if (db[id]) { db[id][field] = Date.now(); fs.writeFileSync(USERS_FILE, JSON.stringify(db, null, 2)); }
  } catch {}
}

const socialCommands = [

  // ── !duelo @usuario ──────────────────────────
  {
    name: "duelo",
    alias: ["battle", "pelea"],
    description: "Duelo 1v1 contra otro usuario",
    category: "Social",
    execute: async ({ sock, from, msg, reply, sender }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply("⚔️ Menciona a tu rival.\nEj: *!duelo @usuario*");
      const rival = mentioned[0];
      if (rival === sender) return reply("❌ No puedes duelarte contigo mismo 😂");

      const myAtk = Math.floor(Math.random() * 50) + 50;
      const rivalAtk = Math.floor(Math.random() * 50) + 50;
      const win = myAtk >= rivalAtk;
      const xpGain = win ? 30 : 5;
      addXP(sender, xpGain);

      const rivalNum = rival.split("@")[0];
      await sock.sendMessage(from, {
        text:
          `⚔️ *DUELO RAGE*\n━━━━━━━━━━━━━━\n` +
          `🗡️ Tu ataque: *${myAtk}*\n` +
          `🛡️ Rival (@${rivalNum}): *${rivalAtk}*\n\n` +
          (win
            ? `🏆 *¡GANASTE!* +${xpGain} XP 🔥`
            : `💀 *Perdiste...* Pero ganaste ${xpGain} XP por intentarlo`),
        mentions: [rival],
      }, { quoted: msg });
    },
  },

  // ── !robar @usuario ──────────────────────────
  {
    name: "robar",
    alias: ["steal", "robo"],
    description: "Intenta robar XP a otro usuario",
    category: "Social",
    execute: async ({ sock, from, msg, reply, sender }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply("🦹 Menciona a tu víctima.\nEj: *!robar @usuario*");
      const victim = mentioned[0];
      if (victim === sender) return reply("❌ No puedes robarte a ti mismo 😅");

      const victimUser = getUser(victim);
      if (!victimUser || victimUser.xp < 10) return reply("❌ Esa persona no tiene suficiente XP para robar.");

      const success = Math.random() < 0.45;
      const amount = Math.floor(Math.random() * 20) + 10;
      const victimNum = victim.split("@")[0];

      if (success) {
        addXP(sender, amount);
        setXP(victim, -amount);
        await sock.sendMessage(from, {
          text:
            `🦹 *¡ROBO EXITOSO!*\n━━━━━━━━━━━━━━\n` +
            `Le robaste *${amount} XP* a @${victimNum} 😈\n` +
            `_Cuidado, puede vengarse..._`,
          mentions: [victim],
        }, { quoted: msg });
      } else {
        setXP(sender, -10);
        await sock.sendMessage(from, {
          text:
            `🚨 *¡Te atraparon!*\n━━━━━━━━━━━━━━\n` +
            `Intentaste robarle a @${victimNum} pero fallaste 😂\n` +
            `Perdiste *10 XP* como castigo.`,
          mentions: [victim],
        }, { quoted: msg });
      }
    },
  },

  // ── !trabajar ────────────────────────────────
  {
    name: "trabajar",
    alias: ["work", "laburo"],
    description: "Gana XP trabajando (cooldown 2h)",
    category: "Social",
    execute: async ({ reply, sender }) => {
      const user = getUser(sender);
      const now = Date.now();
      const cooldown = 2 * 60 * 60 * 1000;
      if (user.lastWork && now - user.lastWork < cooldown) {
        const resta = cooldown - (now - user.lastWork);
        const mins = Math.ceil(resta / 60000);
        return reply(`⏳ Ya trabajaste.\nPuedes volver en *${mins} min*.`);
      }
      const trabajos = [
        { desc: "Repartiste comida 🛵", xp: 25 },
        { desc: "Vendiste stickers 🎨", xp: 30 },
        { desc: "Arreglaste computadoras 💻", xp: 35 },
        { desc: "Diste clases de música 🎵", xp: 28 },
        { desc: "Trabajaste en el mercado 🏪", xp: 20 },
        { desc: "Hiciste delivery de PRAGMATA BOT 🤖", xp: 40 },
      ];
      const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)];
      addXP(sender, trabajo.xp);
      saveTimestamp(sender, "lastWork");
      await reply(
        `💼 *RAGE WORK*\n━━━━━━━━━━━━━━\n` +
        `${trabajo.desc}\n` +
        `💰 Ganaste *${trabajo.xp} XP* 🔥\n\n` +
        `_Vuelve en 2 horas para trabajar de nuevo._`
      );
    },
  },

  // ── !diario ──────────────────────────────────
  {
    name: "diario",
    alias: ["daily", "recompensa"],
    description: "Recompensa diaria de XP",
    category: "Social",
    execute: async ({ reply, sender }) => {
      const user = getUser(sender);
      const now = Date.now();
      const cooldown = 24 * 60 * 60 * 1000;
      if (user.lastDaily && now - user.lastDaily < cooldown) {
        const resta = cooldown - (now - user.lastDaily);
        const hrs = Math.floor(resta / 3600000);
        const mins = Math.ceil((resta % 3600000) / 60000);
        return reply(`🎁 Ya reclamaste tu recompensa hoy.\nVuelve en *${hrs}h ${mins}m*.`);
      }
      const xp = Math.floor(Math.random() * 30) + 50;
      addXP(sender, xp);
      saveTimestamp(sender, "lastDaily");
      await reply(
        `🎁 *RECOMPENSA DIARIA*\n━━━━━━━━━━━━━━\n` +
        `✨ Recibiste *${xp} XP* hoy 🔥\n\n` +
        `_Vuelve mañana para tu próxima recompensa._`
      );
    },
  },

];

export default socialCommands;
