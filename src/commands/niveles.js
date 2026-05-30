// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/niveles.js
//        Sistema de niveles y XP
// ═══════════════════════════════════════════

import { getUser, getTopUsers, xpBar, xpForLevel, getPremiumPlan } from "../lib/database.js";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

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
      const plan = getPremiumPlan(sender);
      const planesInfo = { plata: "🥈 Rage-Plata", dorado: "🥇 Rage-Dorado", king: "👑 King-Rage", dios: "🔱 Dios-Rage" };
      const premiumTag = user.premium ? `⭐ *PREMIUM* — ${planesInfo[plan] || "Plan activo"}` : "👤 Normal";
      const expiry = user.premiumExpiry ? `\n⏳ Expira: *${new Date(user.premiumExpiry).toLocaleDateString("es-PE")}*` : "";

      let rango = "🥉 Novato";
      if (user.level >= 5)  rango = "🥈 Aprendiz";
      if (user.level >= 10) rango = "🥇 Veterano";
      if (user.level >= 20) rango = "💎 Élite";
      if (user.level >= 50) rango = "👑 Leyenda";

      const nombre = user.name || `+${sender.split("@")[0]}`;
      const caption =
        `👤 *${nombre}*\n` +
        `🏅 ${rango}  |  ${premiumTag}${expiry}\n\n` +
        `⚡ Nivel: *${user.level}*  ✨ XP: *${user.xp}*/${nextXP}\n` +
        `[${bar}]\n` +
        `📟 Comandos usados: *${user.commandsUsed || 0}*`;

      const bannerFile = plan ? `banner-${plan}.png` : "banner-sinpremium.png";
      const bannerPath = join(__dirname, "../../assets", bannerFile);
      try {
        const img = await readFile(bannerPath);
        await sock.sendMessage(from, { image: img, mimetype: "image/png" }, { quoted: msg });
        await sock.sendMessage(from, { text: caption });
      } catch {
        await reply(caption);
      }
    },
  },

  // ────────────────────────────────────────
  // !verperfil — Ver perfil de otro usuario
  // ────────────────────────────────────────
  {
    name: "verperfil",
    alias: ["verrank", "vernivel", "verperfil"],
    description: "Ver el perfil de otro usuario",
    category: "Niveles",
    execute: async ({ reply, msg, sock, from }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply("👤 Menciona a alguien.\nEj: *!verperfil @usuario*");

      const target = mentioned[0];
      const user = getUser(target);
      if (!user) return reply("❌ Ese usuario aún no tiene perfil en el bot.");

      const nextXP = xpForLevel(user.level + 1);
      const bar = xpBar(user.xp, nextXP);
      const plan = getPremiumPlan(target);
      const planesInfo = {
        plata:  "🥈 Rage-Plata",
        dorado: "🥇 Rage-Dorado",
        king:   "👑 King-Rage",
        dios:   "🔱 Dios-Rage",
      };
      const premiumTag = user.premium
        ? `⭐ *PREMIUM* — ${planesInfo[plan] || "Plan activo"}`
        : "👤 Normal";
      const expiry = user.premiumExpiry
        ? `\n⏳ Expira: *${new Date(user.premiumExpiry).toLocaleDateString("es-PE")}*`
        : "";

      let rango = "🥉 Novato";
      if (user.level >= 5)  rango = "🥈 Aprendiz";
      if (user.level >= 10) rango = "🥇 Veterano";
      if (user.level >= 20) rango = "💎 Élite";
      if (user.level >= 50) rango = "👑 Leyenda";

      const nombre = user.name || `+${target.split("@")[0]}`;
      const caption =
        `👤 *${nombre}*\n` +
        `🏅 ${rango}  |  ${premiumTag}${expiry}\n\n` +
        `⚡ Nivel: *${user.level}*  ✨ XP: *${user.xp}*/${nextXP}\n` +
        `[${bar}]\n` +
        `📟 Comandos usados: *${user.commandsUsed || 0}*`;

      const bannerFile = plan ? `banner-${plan}.png` : "banner-sinpremium.png";
      const bannerPath = join(__dirname, "../../assets", bannerFile);
      try {
        const img = await readFile(bannerPath);
        await sock.sendMessage(from, { image: img }, { quoted: msg });
        await sock.sendMessage(from, { text: caption });
      } catch {
        await reply(caption);
      }
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
      const medalTxt = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
      const mentions = top.filter(u => u.displayId && u.displayId.length <= 15).map(u => u.displayId + "@s.whatsapp.net");

      try {
        const Jimp = (await import("jimp")).default;
        const { loadFont, FONT_SANS_16_WHITE, FONT_SANS_14_WHITE, FONT_SANS_32_WHITE } = await import("jimp");

        const W = 600, ROW = 40, H = 90 + top.length * ROW;
        const img = new Jimp({ width: W, height: H, color: 0x0d0d0dff });

        // Borde dorado
        for (let x = 0; x < W; x++) {
          for (let t = 0; t < 3; t++) {
            img.setPixelColor(0xc9a84cff, x, t);
            img.setPixelColor(0xc9a84cff, x, H - 1 - t);
          }
        }
        for (let y = 0; y < H; y++) {
          for (let t = 0; t < 3; t++) {
            img.setPixelColor(0xc9a84cff, t, y);
            img.setPixelColor(0xc9a84cff, W - 1 - t, y);
          }
        }

        // Línea separadora título
        for (let x = 20; x < W - 20; x++) img.setPixelColor(0xc9a84cff, x, 55);

        // Filas alternadas
        top.forEach((_, i) => {
          const y = 65 + i * ROW;
          const color = i % 2 === 0 ? 0x151515ff : 0x1a1a1aff;
          for (let px = 10; px < W - 10; px++)
            for (let py = y; py < y + ROW - 2; py++)
              img.setPixelColor(color, px, py);
        });

        // Línea inferior
        for (let x = 20; x < W - 20; x++) img.setPixelColor(0xc9a84cff, x, H - 12);

        const font16 = await loadFont(FONT_SANS_16_WHITE);
        const font32 = await loadFont(FONT_SANS_32_WHITE);

        // Título
        img.print({ font: font32, x: 0, y: 10, text: { text: "TOP 10 - PRAGMATA BOT", alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, maxWidth: W });

        // Filas
        top.forEach((u, i) => {
          let label;
          if (u.name && !/^[0-9]{10,}$/.test(u.name)) label = u.name;
          else if (u.phone) label = "+" + u.phone;
          else label = "@" + (u.id || "????");

          const y = 72 + i * ROW;
          const pos = medalTxt[i];
          const stats = `Nv.${u.level} | ${u.xp} XP${u.premium ? " *" : ""}`;
          img.print({ font: font16, x: 20, y, text: `${pos}. ${label.slice(0, 24)}` });
          img.print({ font: font16, x: 0, y, text: { text: stats, alignmentX: Jimp.HORIZONTAL_ALIGN_RIGHT }, maxWidth: W - 20 });
        });

        const buffer = await img.getBuffer("image/png");
        await sock.sendMessage(from, { image: buffer, mimetype: "image/png", caption: "_Usa más comandos para subir en el ranking_ 🔥" }, { quoted: msg });
      } catch {
        const list = top.map((u, i) => {
          let label;
          if (u.name && !/^[0-9]{10,}$/.test(u.name)) label = u.name;
          else if (u.phone) label = "+" + u.phone;
          else label = "@" + (u.id || "????");
          return `${medals[i]} *${label}* — Nv.*${u.level}* | XP: ${u.xp}${u.premium ? " ⭐" : ""}`;
        }).join("\n");
        await sock.sendMessage(from, {
          text: `🏆 *TOP 10 - PRAGMATA BOT*\n\n${list}\n\n_Usa más comandos para subir en el ranking_`,
          mentions,
        }, { quoted: msg });
      }
    },
  },
];

export default nivelesCommands;
