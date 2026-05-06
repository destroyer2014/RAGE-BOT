// ═══════════════════════════════════════════
//     RAGE-BOT — src/commands/niveles.js
//        Sistema de niveles y XP
// ═══════════════════════════════════════════

import { getUser, getTopUsers, xpBar, xpForLevel } from "../lib/database.js";

const nivelesCommands = [

  // ────────────────────────────────────────
  // !misxp — Ver XP y nivel (con submenú)
  // ────────────────────────────────────────
  {
    name: "misxp",
    alias: ["mixin", "stats", "miestado"],
    description: "Ver tu XP, nivel y estadísticas del bot",
    category: "Niveles",
    execute: async ({ reply, sender, args }) => {
      const sub = (args[0] || "").toLowerCase();

      // Sin subcomando → mostrar submenú
      if (!sub) {
        await reply(
          `╔══════════════════════════╗\n` +
          `║   ✨  *MIS STATS - BOT*     ║\n` +
          `╚══════════════════════════╝\n\n` +
          `Elige una opción:\n\n` +
          `📊 *!misxp nivel* — Tu nivel actual y XP\n` +
          `📟 *!misxp comandos* — Comandos que has usado\n` +
          `🏅 *!misxp rango* — Tu rango actual\n` +
          `📋 *!misxp todo* — Todo de una vez\n\n` +
          `_También puedes usar !perfil para un resumen completo._`
        );
        return;
      }

      const user = getUser(sender);
      const nextXP = xpForLevel(user.level + 1);
      const bar = xpBar(user.xp, nextXP);

      let rango = "🥉 Novato";
      if (user.level >= 5)  rango = "🥈 Aprendiz";
      if (user.level >= 10) rango = "🥇 Veterano";
      if (user.level >= 20) rango = "💎 Élite";
      if (user.level >= 50) rango = "👑 Leyenda";

      if (sub === "nivel") {
        await reply(
          `⚡ *TU NIVEL*\n━━━━━━━━━━━━━━\n` +
          `🔢 Nivel actual: *${user.level}*\n` +
          `✨ XP: *${user.xp}* / ${nextXP}\n` +
          `[${bar}]\n\n` +
          `_${nextXP - user.xp} XP para el siguiente nivel_`
        );
      } else if (sub === "comandos") {
        await reply(
          `📟 *TUS COMANDOS*\n━━━━━━━━━━━━━━\n` +
          `🤖 Comandos de bot usados: *${user.commandsUsed || 0}*\n` +
          `✨ XP ganada total: *${(user.commandsUsed || 0) * 10}* (aprox)\n\n` +
          `_Sigue usando comandos para ganar XP y subir de nivel 🚀_`
        );
      } else if (sub === "rango") {
        await reply(
          `🏅 *TU RANGO*\n━━━━━━━━━━━━━━\n` +
          `${rango}\n\n` +
          `Niveles para subir rango:\n` +
          `🥉 Novato: Nv. 1\n` +
          `🥈 Aprendiz: Nv. 5\n` +
          `🥇 Veterano: Nv. 10\n` +
          `💎 Élite: Nv. 20\n` +
          `👑 Leyenda: Nv. 50`
        );
      } else if (sub === "todo") {
        await reply(
          `╔══════════════════════════╗\n` +
          `║   ✨  *MIS ESTADÍSTICAS*    ║\n` +
          `╚══════════════════════════╝\n\n` +
          `⚡ Nivel: *${user.level}*\n` +
          `✨ XP: *${user.xp}* / ${nextXP}\n` +
          `[${bar}]\n` +
          `🏅 Rango: ${rango}\n` +
          `📟 Comandos usados: *${user.commandsUsed || 0}*\n` +
          `⭐ Premium: ${user.premium ? "Sí ✅" : "No"}\n\n` +
          `_${nextXP - user.xp} XP para el nivel ${user.level + 1}_`
        );
      } else {
        await reply(`❓ Subcomando no reconocido. Usa *!misxp* para ver las opciones.`);
      }
    },
  },


  {
    name: "perfil",
    alias: ["profile", "nivel", "level", "rank", "xp"],
    description: "Ver tu perfil, nivel y XP",
    category: "Niveles",
    execute: async ({ reply, sender, msg, sock, from }) => {
      const user = getUser(sender);
      const nextXP = xpForLevel(user.level + 1);
      const bar = xpBar(user.xp, nextXP);
      const premiumTag = user.premium ? "⭐ *PREMIUM*" : "👤 Normal";

      // Rango por nivel
      let rango = "🥉 Novato";
      if (user.level >= 5)  rango = "🥈 Aprendiz";
      if (user.level >= 10) rango = "🥇 Veterano";
      if (user.level >= 20) rango = "💎 Élite";
      if (user.level >= 50) rango = "👑 Leyenda";

      await reply(
        `╔══════════════════════════╗\n` +
        `║     👤  *MI PERFIL*          ║\n` +
        `╚══════════════════════════╝\n\n` +
        `📛 Usuario: @${sender.split("@")[0]}\n` +
        `🏅 Rango: ${rango}\n` +
        `${premiumTag}\n\n` +
        `╔══════════════════════════╗\n` +
        `║     📊  *ESTADÍSTICAS*       ║\n` +
        `╚══════════════════════════╝\n\n` +
        `⚡ Nivel: *${user.level}*\n` +
        `✨ XP: *${user.xp}* / ${nextXP}\n` +
        `[${bar}]\n` +
        `📟 Comandos usados: *${user.commandsUsed || 0}*\n`,
      );
    },
  },

  // ────────────────────────────────────────
  // !top — Top 10 usuarios
  // ────────────────────────────────────────
  {
    name: "top",
    alias: ["ranking", "leaderboard", "top10"],
    description: "Top 10 usuarios con más XP",
    category: "Niveles",
    execute: async ({ sock, from, msg, reply }) => {
      const top = getTopUsers(10);
      if (!top.length) return reply("📊 Aún no hay usuarios en el ranking.");

      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      // Mostrar número limpio sin código de país extraño
      const mentions = top
        .filter(u => u.displayId && u.displayId.length <= 15)
        .map(u => u.displayId + "@s.whatsapp.net");
      const list = top
        .map((u, i) => {
          // Prioridad: nombre guardado → número de teléfono → últimos 4 dígitos
          let label;
          if (u.name && !/^[0-9]{10,}$/.test(u.name)) {
            label = u.name;
          } else if (u.phone) {
            label = "+" + u.phone;
          } else {
            label = "@" + (u.id || "????");
          }
          return `${medals[i]} *${label}* — Nv.*${u.level}* | XP: ${u.xp}${u.premium ? " ⭐" : ""}`;
        })
        .join("\n");

      await sock.sendMessage(from, {
        text:
          `╔══════════════════════════╗\n` +
          `║   🏆  *TOP 10 - RAGE-BOT*   ║\n` +
          `╚══════════════════════════╝\n\n` +
          `${list}\n\n` +
          `_Usa más comandos para subir en el ranking_`,
        mentions,
      }, { quoted: msg });
    },
  },
];

export default nivelesCommands;
