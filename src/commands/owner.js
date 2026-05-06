// ═══════════════════════════════════════════
//     RAGE-BOT — src/commands/owner.js
//        Comandos exclusivos del creador
// ═══════════════════════════════════════════

import config from "../../config.js";
import { setPremium, getUser, getStats, getTopUsers, setXP, resetAllXP } from "../lib/database.js";

const ownerCommands = [

  // ────────────────────────────────────────
  // !botinfo — Info técnica
  // ────────────────────────────────────────
  {
    name: "botinfo",
    alias: ["systeminfo", "sysinfo"],
    description: "Info técnica del sistema [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply }) => {
      const mem = process.memoryUsage();
      const mbUsed = (mem.heapUsed / 1024 / 1024).toFixed(2);
      const mbTotal = (mem.heapTotal / 1024 / 1024).toFixed(2);
      const uptime = process.uptime();
      const h = Math.floor(uptime / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      const s = Math.floor(uptime % 60);
      const stats = getStats();

      await reply(
        `╔══════════════════════════╗\n` +
        `║  🖥️  *RAGE-BOT SYSTEM INFO*  ║\n` +
        `╚══════════════════════════╝\n\n` +
        `⚙️  Node.js: ${process.version}\n` +
        `💾 RAM: ${mbUsed}MB / ${mbTotal}MB\n` +
        `⏱️  Uptime: ${h}h ${m}m ${s}s\n` +
        `🏠 Plataforma: ${process.platform}\n` +
        `📂 PID: ${process.pid}\n\n` +
        `╔══════════════════════════╗\n` +
        `║     📊  *ESTADÍSTICAS*       ║\n` +
        `╚══════════════════════════╝\n\n` +
        `👥 Usuarios totales: ${stats.totalUsers}\n` +
        `⭐ Usuarios premium: ${stats.premiumUsers}\n` +
        `📟 Comandos ejecutados: ${stats.totalCommands}\n`
      );
    },
  },

  // ────────────────────────────────────────
  // !addpremium — Dar premium a usuario
  // ────────────────────────────────────────
  {
    name: "addpremium",
    alias: ["darpremium", "givepremium", "setpremium"],
    description: "Da premium a un usuario [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ msg, reply, args }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const days = parseInt(args.find((a) => !isNaN(a))) || 30;

      if (!mentioned.length) return reply("👤 Menciona a quien quieres dar premium.\nEj: *!addpremium @usuario 30*");

      for (const jid of mentioned) {
        setPremium(jid, true, days);
      }

      const names = mentioned.map((j) => "@" + j.split("@")[0]).join(", ");
      await reply(
        `⭐ *Premium activado*\n━━━━━━━━━━━━━━\n` +
        `👤 Usuario: ${names}\n` +
        `📅 Duración: *${days} días*\n\n` +
        `_Ya puede usar los comandos premium._`
      );
    },
  },

  // ────────────────────────────────────────
  // !removepremium — Quitar premium
  // ────────────────────────────────────────
  {
    name: "removepremium",
    alias: ["quitarpremium", "delpremium"],
    description: "Quita el premium a un usuario [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ msg, reply }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply("👤 Menciona a quien quieres quitar el premium.\nEj: *!removepremium @usuario*");

      for (const jid of mentioned) {
        setPremium(jid, false);
      }

      const names = mentioned.map((j) => "@" + j.split("@")[0]).join(", ");
      await reply(`❌ *Premium removido de:* ${names}`);
    },
  },

  // ────────────────────────────────────────
  // !listpremium — Ver usuarios premium
  // ────────────────────────────────────────
  {
    name: "listpremium",
    alias: ["premiumlist", "premiumes"],
    description: "Lista de usuarios premium [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply }) => {
      const top = getTopUsers(100);
      const premiums = top.filter((u) => u.premium);

      if (!premiums.length) return reply("⭐ No hay usuarios premium actualmente.");

      const list = premiums.map((u) => {
        const expiry = u.premiumExpiry
          ? new Date(u.premiumExpiry).toLocaleDateString("es-PE")
          : "Sin fecha";
        return `⭐ @${u.id} — vence: ${expiry}`;
      }).join("\n");

      await reply(
        `╔══════════════════════════╗\n` +
        `║   ⭐  *USUARIOS PREMIUM*    ║\n` +
        `╚══════════════════════════╝\n\n` +
        `${list}`
      );
    },
  },

  // ────────────────────────────────────────
  // !userinfo — Info de un usuario
  // ────────────────────────────────────────
  {
    name: "userinfo",
    alias: ["infouser", "uinfo"],
    description: "Ver info de un usuario [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ msg, reply }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply("👤 Menciona a un usuario.\nEj: *!userinfo @usuario*");

      const jid = mentioned[0];
      const user = getUser(jid);
      const expiry = user.premiumExpiry
        ? new Date(user.premiumExpiry).toLocaleDateString("es-PE")
        : "N/A";

      await reply(
        `╔══════════════════════════╗\n` +
        `║    🔍  *INFO DE USUARIO*     ║\n` +
        `╚══════════════════════════╝\n\n` +
        `👤 Número: +${jid.split("@")[0]}\n` +
        `⚡ Nivel: ${user.level}\n` +
        `✨ XP: ${user.xp}\n` +
        `📟 Comandos: ${user.commandsUsed || 0}\n` +
        `⭐ Premium: ${user.premium ? "Sí" : "No"}\n` +
        `📅 Vence premium: ${expiry}\n`
      );
    },
  },

  // ────────────────────────────────────────
  // !reiniciar
  // ────────────────────────────────────────
  {
    name: "reiniciar",
    alias: ["restart", "reboot"],
    description: "Reinicia el bot [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply }) => {
      await reply("♻️ *Reiniciando RAGE-BOT...*\n_Vuelvo en unos segundos._");
      setTimeout(() => process.exit(0), 1500);
    },
  },

  // ────────────────────────────────────────
  // !broadcast
  // ────────────────────────────────────────
  {
    name: "broadcast",
    alias: ["bc", "anuncio"],
    description: "Envía mensaje a todos los chats [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ sock, reply, text }) => {
      if (!text) return reply("📢 Escribe el mensaje.\nEj: *!broadcast Hola a todos!*");
      try {
        const chats = Object.keys(await sock.chats.all?.() || {});
        let enviados = 0;
        for (const jid of chats) {
          if (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@g.us")) {
            await sock.sendMessage(jid, { text: `📢 *Mensaje del creador:*\n\n${text}` });
            enviados++;
            await new Promise((r) => setTimeout(r, 500));
          }
        }
        await reply(`✅ Mensaje enviado a *${enviados}* chats.`);
      } catch (err) {
        await reply(`❌ Error: ${err.message}`);
      }
    },
  },

  // ────────────────────────────────────────
  // !eval
  // ────────────────────────────────────────
  {
    name: "eval",
    alias: ["exec", "run", "js"],
    description: "Ejecuta código JavaScript [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply, text, sock, from, msg }) => {
      if (!text) return reply("💻 Escribe el código.\nEj: *!eval 1+1*");
      try {
        let result = eval(text);
        if (result instanceof Promise) result = await result;
        const output = typeof result === "object"
          ? JSON.stringify(result, null, 2)
          : String(result);
        await reply(`✅ *Resultado:*\n\`\`\`\n${output.slice(0, 1000)}\n\`\`\``);
      } catch (err) {
        await reply(`❌ *Error:*\n\`\`\`\n${err.message}\n\`\`\``);
      }
    },
  },

  // ────────────────────────────────────────
  // !block / !unblock  (FIX Baileys v6)
  // ────────────────────────────────────────
  {
    name: "block",
    alias: ["bloquear"],
    description: "Bloquea un número [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ sock, msg, reply, args }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = mentioned[0] || (args[0] ? `${args[0].replace(/\D/g, "")}@s.whatsapp.net` : null);
      if (!target) return reply("👤 Menciona o escribe el número.\nEj: *!block @usuario* o *!block 51999888777*");
      try {
        // Baileys v6: sendMessage con action block
        await sock.sendMessage(target, { block: true });
        await reply(`🚫 *+${target.split("@")[0]} bloqueado correctamente.*`);
      } catch (err) {
        console.error("[BLOCK]", err.message);
        // Fallback para versiones con updateBlockStatus
        try {
          await sock.updateBlockStatus(target, "block");
          await reply(`🚫 *+${target.split("@")[0]} bloqueado correctamente.*`);
        } catch {
          await reply("❌ No pude bloquear. En grupos solo puedes bloquear desde el chat privado con el usuario.");
        }
      }
    },
  },
  {
    name: "unblock",
    alias: ["desbloquear"],
    description: "Desbloquea un número [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ sock, msg, reply, args }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = mentioned[0] || (args[0] ? `${args[0].replace(/\D/g, "")}@s.whatsapp.net` : null);
      if (!target) return reply("👤 Menciona o escribe el número.\nEj: *!unblock @usuario* o *!unblock 51999888777*");
      try {
        await sock.sendMessage(target, { block: false });
        await reply(`✅ *+${target.split("@")[0]} desbloqueado correctamente.*`);
      } catch (err) {
        console.error("[UNBLOCK]", err.message);
        try {
          await sock.updateBlockStatus(target, "unblock");
          await reply(`✅ *+${target.split("@")[0]} desbloqueado correctamente.*`);
        } catch {
          await reply("❌ No pude desbloquear al usuario.");
        }
      }
    },
  },

  // ────────────────────────────────────────
  // !setprefijo / !estado / !setnombre
  // ────────────────────────────────────────
  {
    name: "setprefijo",
    alias: ["setprefix", "prefix", "prefijo"],
    description: "Cambia el prefijo del bot [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply, args }) => {
      if (!args[0]) return reply("⚙️ Ej: *!setprefijo /*");
      config.prefix = args[0].trim();
      await reply(`✅ *Prefijo cambiado a:* \`${config.prefix}\`\n_Reinicia para que sea permanente._`);
    },
  },
  {
    name: "estado",
    alias: ["setstatus", "status"],
    description: "Cambia el estado del bot [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ sock, reply, text }) => {
      if (!text) return reply("✏️ Ej: *!estado RAGE-BOT activo 🤖*");
      try {
        await sock.updateProfileStatus(text);
        await reply(`✅ *Estado:* "${text}"`);
      } catch {
        await reply("❌ No pude cambiar el estado.");
      }
    },
  },
  {
    name: "setnombre",
    alias: ["setname", "nombre"],
    description: "Cambia el nombre del bot [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ sock, reply, text }) => {
      if (!text) return reply("✏️ Ej: *!setnombre RAGE-BOT 2.0*");
      try {
        await sock.updateProfileName(text);
        await reply(`✅ *Nombre:* "${text}"`);
      } catch {
        await reply("❌ No pude cambiar el nombre.");
      }
    },
  },
  {
    name: "jid",
    alias: ["getjid"],
    description: "Ver JID de un usuario [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ msg, reply }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply("👤 Menciona a alguien.\nEj: *!jid @usuario*");
      const list = mentioned.map((j) => `• +${j.split("@")[0]}\n  \`${j}\``).join("\n\n");
      await reply(`🔍 *JIDs:*\n━━━━━━━━━━━━━━\n${list}`);
    },
  },

  // ────────────────────────────────────────
  // !addxp — Dar XP a un usuario
  // ────────────────────────────────────────
  {
    name: "addxp",
    alias: ["darxp", "givexp"],
    description: "Da XP a un usuario [OWNER] — !addxp @usuario 100",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ msg, reply, args }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const amount = parseInt(args.find((a) => !isNaN(a))) || 50;
      if (!mentioned.length) return reply("👤 Menciona a quien quieres dar XP.\nEj: *!addxp @usuario 100*");
      for (const jid of mentioned) {
        setXP(jid, amount, "add");
      }
      const names = mentioned.map((j) => "@" + j.split("@")[0]).join(", ");
      await reply(
        `✨ *XP añadida*\n━━━━━━━━━━━━━━\n` +
        `👤 Usuario: ${names}\n` +
        `➕ XP dado: *+${amount}*\n\n` +
        `_Nivel recalculado automáticamente._`
      );
    },
  },

  // ────────────────────────────────────────
  // !removexp — Quitar XP a un usuario
  // ────────────────────────────────────────
  {
    name: "removexp",
    alias: ["quitarxp", "delxp"],
    description: "Quita XP a un usuario [OWNER] — !removexp @usuario 50",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ msg, reply, args }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const amount = parseInt(args.find((a) => !isNaN(a))) || 50;
      if (!mentioned.length) return reply("👤 Menciona a quien quieres quitar XP.\nEj: *!removexp @usuario 50*");
      for (const jid of mentioned) {
        setXP(jid, amount, "remove");
      }
      const names = mentioned.map((j) => "@" + j.split("@")[0]).join(", ");
      await reply(
        `💔 *XP removida*\n━━━━━━━━━━━━━━\n` +
        `👤 Usuario: ${names}\n` +
        `➖ XP quitada: *-${amount}*\n\n` +
        `_Nivel recalculado automáticamente._`
      );
    },
  },

  // ────────────────────────────────────────
  // !resetxp — Reiniciar XP de todos
  // ────────────────────────────────────────
  {
    name: "resetxp",
    alias: ["resetexp", "borrarxp"],
    description: "Reinicia XP, nivel y comandos de todos los usuarios [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply }) => {
      const total = resetAllXP();
      await reply(
        `🔄 *XP RESETEADA*\n━━━━━━━━━━━━━━\n` +
        `✅ Se reinició la XP, nivel y comandos usados de *${total}* usuarios.\n\n` +
        `_El top ahora está limpio y todos empiezan desde 0._`
      );
    },
  },
];

export default ownerCommands;
