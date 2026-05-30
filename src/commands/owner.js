// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/owner.js
//        Comandos exclusivos del creador
// ═══════════════════════════════════════════

import config from "../../config.js";
import { broadcastTodos } from "../lib/sockGlobal.js";
import { setPremium, setPremiumPlan, getUser, getStats, getTopUsers, setXP, resetAllXP, setRangoEspecial } from "../lib/database.js";
import { db, saveDB, savePlayer, enviarMensajeBuzon, enviarBroadcastBuzon, inicializarBancoMedallas } from "../lib/rpg-database.js";

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
    execute: async ({ reply, msg, pushName}) => {
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
        `║  🖥️  *PRAGMATA BOT SYSTEM INFO*  ║\n` +
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
    execute: async ({ msg, reply, args, pushName}) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const planesValidos = ["semanal","plata","dorado","king","dios"];

      // Detectar si el último arg es un plan válido
      const ultimoArg = (args[args.length - 1] || "").toLowerCase();
      const planDetectado = planesValidos.includes(ultimoArg) ? ultimoArg : null;

      // Si pusieron un plan, usar setPremiumPlan; si no, usar días numéricos
      const days = planDetectado ? null : (parseInt(args.find((a) => !isNaN(a) && a.length <= 4)) || 30);

      // Soporte para número sin @ (ej: !setpremium 51987654321 dios)
      const numArg = args.find((a) => /^\d{6,15}$/.test(a));
      const byNumber = numArg ? [`${numArg}@s.whatsapp.net`] : [];
      const targets = mentioned.length ? mentioned : byNumber;

      if (!targets.length) return reply(
        "👤 Menciona a alguien o escribe su número.\n" +
        "Ej: *!setpremium @usuario dios*\n" +
        "Ej: *!setpremium @usuario 30* (días genéricos)\n" +
        "Planes: semanal | plata | dorado | king | dios"
      );

      const resultados = [];
      for (const jid of targets) {
        if (planDetectado) {
          setPremiumPlan(jid, planDetectado);
          const u = getUser(jid);
          const nombre = u.name || "+" + jid.split("@")[0];
          resultados.push("✅ *" + nombre + "* → Plan *" + planDetectado.toUpperCase() + "*");
        } else {
          setPremium(jid, true, days);
          resultados.push("✅ *+" + jid.split("@")[0] + "* → " + days + " días");
        }
      }

      await reply(
        "⭐ *Premium activado*\n━━━━━━━━━━━━━━\n" +
        resultados.join("\n") +
        "\n\n_Ya puede usar los comandos premium._"
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
    execute: async ({ msg, reply, pushName}) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply("👤 Menciona a quien quieres quitar el premium.\nEj: *!removepremium @usuario*");

      for (const jid of mentioned) {
        setPremium(jid, false);
      }

      const names = mentioned.map((j) => "@" + j.split("@")[0]).join(", ");
      await reply(`❌ *Premium removido de:* ${names}`);
    },
  },

  // !setplan — Asignar plan premium específico
  // ────────────────────────────────────────
  {
    name: "setplan",
    alias: ["asignarplan", "darplan"],
    description: "Asignar plan premium específico a un usuario [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply, args, msg, pushName}) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const planes = { semanal: 7, plata: 15, dorado: 30, king: 30, dios: 30 };
      // Detectar plan (última palabra que sea un plan válido)
      const plan = (args[args.length - 1] || "").toLowerCase();
      if (!planes[plan]) return reply(
        "👤 Uso: *!setplan @usuario [plan]*\n" +
        "Planes: semanal | plata | dorado | king | dios\n" +
        "Planes disponibles:\n" +
        "• *plata* → 15 días\n" +
        "• *dorado* → 30 días\n" +
        "• *king* → 30 días\n" +
        "• *dios* → 30 días"
      );
      // Soportar mención O número directo (ej: !setplan 51999888777 dios)
      let targets = [...mentioned];
      if (!targets.length) {
        const numArg = args.find(a => /^\d{7,15}$/.test(a));
        if (numArg) targets.push(`${numArg}@s.whatsapp.net`);
      }
      if (!targets.length) return reply("👤 Menciona al usuario o escribe su número.\nEj: *!setplan @usuario dios*\nEj: *!setplan 51999888777 dios*");
      const resultados = [];
      for (const jid of targets) {
        setPremiumPlan(jid, plan);
        const u = getUser(jid);
        const nombre = u.name || `+${jid.split("@")[0]}`;
        resultados.push(`✅ *${nombre}* → Plan *${plan}* (${planes[plan]} días)`);
      }
      await reply(`👑 *Planes asignados:*\n\n${resultados.join("\n")}`);
    },
  },

  // !rankingsemanal — Enviar ranking manualmente
  // ────────────────────────────────────────
  {
    name: "rankingsemanal",
    alias: ["ranking", "topweekly"],
    description: "Enviar ranking semanal al grupo [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply, from, msg, pushName}) => {
      const { sendWeeklyRanking } = await import("../lib/scheduler.js");
      await sendWeeklyRanking(from);
      await reply("✅ Ranking semanal enviado.");
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
    execute: async ({ reply, msg, pushName}) => {
      const top = getTopUsers(100);
      const premiums = top.filter((u) => u.premium);

      if (!premiums.length) return reply("⭐ No hay usuarios premium actualmente.");

      const planesLabel = {
        plata:  "🥈 RAGE-PLATA",
        dorado: "🥇 RAGE-DORADO",
        king:   "👑 KING-RAGE",
        dios:   "🔱 DIOS-RAGE",
      };

      const list = premiums.map((u, i) => {
        const nombre = u.name || u.phone || u.id;
        const plan   = planesLabel[u.premiumPlan] || "⭐ PREMIUM";
        const expiry = u.premiumExpiry
          ? new Date(u.premiumExpiry).toLocaleDateString("es-PE")
          : "Sin fecha";
        return `${i + 1}. *${nombre}* — ${plan}\n   📅 Vence: ${expiry}`;
      }).join("\n\n");

      await reply(
        `╔══════════════════════════╗\n` +
        `║   💎  *USUARIOS PREMIUM*    ║\n` +
        `╚══════════════════════════╝\n\n` +
        `${list}\n\n` +
        `_Total: ${premiums.length} usuario(s) premium_`
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
    execute: async ({ msg, reply, sock, from, pushName}) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply("👤 Menciona a un usuario.\nEj: *!userinfo @usuario*");

      const jid  = mentioned[0];
      const user = getUser(jid);

      // Nombre: guardado en DB o pushName del contexto
      const ctxName = msg.message?.extendedTextMessage?.contextInfo?.pushName || null;
      const nombre  = user.name || ctxName || `+${jid.split("@")[0]}`;

      // Plan premium
      const planesLabel = {
        plata:  "🥈 Rage-Plata",
        dorado: "🥇 Rage-Dorado",
        king:   "👑 King-Rage",
        dios:   "🔱 Dios-Rage",
      };
      const planNombre = user.premiumPlan ? planesLabel[user.premiumPlan] : null;
      const premiumStr = user.premium
        ? `✅ Sí — ${planNombre || "Plan activo"}`
        : "❌ No";
      const expiry = user.premiumExpiry
        ? new Date(user.premiumExpiry).toLocaleDateString("es-PE")
        : null;

      // Rango por nivel
      let rango = "🥉 Novato";
      if (user.level >= 5)  rango = "🥈 Aprendiz";
      if (user.level >= 10) rango = "🥇 Veterano";
      if (user.level >= 20) rango = "💎 Élite";
      if (user.level >= 50) rango = "👑 Leyenda";

      await reply(
        `╔══════════════════════════╗\n` +
        `║    🔍  *INFO DE USUARIO*     ║\n` +
        `╚══════════════════════════╝\n\n` +
        `👤 *Nombre:* ${nombre}\n` +
        `🏅 *Rango:* ${rango}\n\n` +
        `⚡ *Nivel:* ${user.level}\n` +
        `✨ *XP:* ${user.xp}\n` +
        `📟 *Comandos usados:* ${user.commandsUsed || 0}\n\n` +
        `💎 *Premium:* ${premiumStr}\n` +
        `${expiry ? `📅 *Vence:* ${expiry}\n` : ""}`
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
    execute: async ({ reply, msg, pushName}) => {
      await reply("♻️ *Reiniciando PRAGMATA BOT...*\n_Vuelvo en unos segundos._");
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
    execute: async ({ sock, reply, text, args }) => {
      // Modo: !broadcast todos <mensaje>  o  !broadcast grupos <mensaje>  o  !broadcast <mensaje>
      let modo = "grupos";
      let mensaje = text;
      if (args[0] === "todos")   { modo = "todos";   mensaje = args.slice(1).join(" "); }
      if (args[0] === "grupos")  { modo = "grupos";  mensaje = args.slice(1).join(" "); }
      if (args[0] === "chats")   { modo = "chats";   mensaje = args.slice(1).join(" "); }

      if (!mensaje.trim()) return reply(
        "📢 *Uso:*\n" +
        "`!broadcast <mensaje>` → solo grupos\n" +
        "`!broadcast todos <mensaje>` → grupos + chats privados\n" +
        "`!broadcast chats <mensaje>` → solo chats privados"
      );

      const textoFinal = `📢 *Mensaje del creador:*\n\n${mensaje}`;

      try {
        if (modo === "grupos" || modo === "todos") {
          const { grupos, chats } = await broadcastTodos(textoFinal);
          if (modo === "grupos") return reply(`✅ Broadcast enviado a *${grupos}* grupo(s).`);
          return reply(`✅ Broadcast enviado a *${grupos}* grupo(s) y *${chats}* chat(s) privado(s).`);
        }
        // solo chats privados
        const allChats = await sock.getChats?.() || [];
        const privados = allChats.filter(c => c.id.endsWith("@s.whatsapp.net") && !c.id.startsWith("status"));
        let enviados = 0;
        for (const chat of privados) {
          try { await sock.sendMessage(chat.id, { text: textoFinal }); enviados++; } catch {}
          await new Promise(r => setTimeout(r, 700));
        }
        await reply(`✅ Broadcast enviado a *${enviados}* chat(s) privado(s).`);
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
    execute: async ({ reply, text, sock, from, msg, pushName}) => {
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
    execute: async ({ sock, msg, reply, args, pushName}) => {
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
    execute: async ({ sock, msg, reply, args, pushName}) => {
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
    execute: async ({ reply, args, msg, pushName}) => {
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
    execute: async ({ sock, reply, text, msg, pushName}) => {
      if (!text) return reply("✏️ Ej: *!estado PRAGMATA BOT activo 🤖*");
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
    execute: async ({ sock, reply, text, msg, pushName}) => {
      if (!text) return reply("✏️ Ej: *!setnombre PRAGMATA BOT 2.0*");
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
    execute: async ({ msg, reply, pushName}) => {
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
    execute: async ({ msg, reply, args, pushName}) => {
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
    execute: async ({ msg, reply, args, pushName}) => {
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
    execute: async ({ reply, msg, pushName}) => {
      const total = resetAllXP();
      await reply(
        `🔄 *XP RESETEADA*\n━━━━━━━━━━━━━━\n` +
        `✅ Se reinició la XP, nivel y comandos usados de *${total}* usuarios.\n\n` +
        `_El top ahora está limpio y todos empiezan desde 0._`
      );
    },
  },

  // ────────────────────────────────────────
  // !leave — Bot se sale del grupo
  // ────────────────────────────────────────
  {
    name: "leave",
    alias: ["salir", "salirgrupo"],
    description: "El bot se sale del grupo actual [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ sock, from, reply, isGroup, msg, pushName}) => {
      if (!isGroup) return reply("❌ Este comando solo funciona en grupos.");
      await reply("👋 *Hasta luego!* Saliendo del grupo...");
      await sock.groupLeave(from);
    },
  },

  // ────────────────────────────────────────
  // !join [enlace] — Bot se une a un grupo
  // ────────────────────────────────────────
  {
    name: "join",
    alias: ["unirse", "joingroup"],
    description: "El bot se une a un grupo por enlace [OWNER] — !join https://chat.whatsapp.com/...",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ sock, reply, text, msg, pushName}) => {
      if (!text) return reply("🔗 Proporciona el enlace de invitación.\nEj: *!join https://chat.whatsapp.com/ABC123*");
      const match = text.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/);
      if (!match) return reply("❌ Enlace inválido. Debe ser tipo:\n`https://chat.whatsapp.com/XXXXXX`");
      const code = match[1];
      try {
        await sock.groupAcceptInvite(code);
        await reply("✅ *Bot unido al grupo exitosamente.*");
      } catch {
        await reply("❌ No pude unirme al grupo.\n_El enlace puede estar caducado o ser inválido._");
      }
    },
  },

  // ── !setlesbiana ─────────────────────────
  {
    name: "setlesbiana",
    alias: ["darllesbiana"],
    description: "Da rango Lesbiana a un usuario por 1 semana [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ msg, reply, args, pushName}) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const numArg = args.find((a) => /^\d{6,15}$/.test(a));
      const byNumber = numArg ? [`${numArg}@s.whatsapp.net`] : [];
      const targets = mentioned.length ? mentioned : byNumber;

      if (!targets.length) return reply("👤 Menciona a alguien o escribe su número.\nEj: *!setlesbiana @usuario*\nEj: *!setlesbiana 50148205949*");

      for (const jid of targets) {
        setRangoEspecial(jid, "lesbiana");
      }

      const names = targets.map((j) => "@" + j.split("@")[0]).join(", ");
      await reply(
        `🏳️‍🌈 *Rango Lesbiana activado* 🌸\n━━━━━━━━━━━━━━\n` +
        `👤 Usuario: ${names}\n` +
        `📅 Duración: *7 días*\n` +
        `⚙️ Límite: *10 comandos premium por día*\n\n` +
        `_Ya puede usar comandos premium con límite diario._ 😏`
      );
    },
  },

  // ── !setgei ──────────────────────────────
  {
    name: "setgei",
    alias: ["dargei"],
    description: "Da rango Gei a un usuario por 1 semana [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ msg, reply, args, pushName}) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const numArg = args.find((a) => /^\d{6,15}$/.test(a));
      const byNumber = numArg ? [`${numArg}@s.whatsapp.net`] : [];
      const targets = mentioned.length ? mentioned : byNumber;

      if (!targets.length) return reply("👤 Menciona a alguien o escribe su número.\nEj: *!setgei @usuario*\nEj: *!setgei 50148205949*");

      for (const jid of targets) {
        setRangoEspecial(jid, "gei");
      }

      const names = targets.map((j) => "@" + j.split("@")[0]).join(", ");
      await reply(
        `🏳️‍🌈 *Rango Gei activado* 🌈\n━━━━━━━━━━━━━━\n` +
        `👤 Usuario: ${names}\n` +
        `📅 Duración: *7 días*\n` +
        `⚙️ Límite: *10 comandos premium por día*\n\n` +
        `_Ya puede usar comandos premium con límite diario._ 😂`
      );
    },
  },
  // ────────────────────────────────────────
  // !rpgnotificar — Avisa del grupo RPG a todos los jugadores (1 vez)
  // ────────────────────────────────────────
  {
    name: "rpgnotificar",
    alias: ["notificarrpg", "avisarpg"],
    description: "Enviar aviso del grupo RPG a todos los jugadores registrados (1 vez cada uno) [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply, sock, args }) => {
      const link = args[0] || null;
      if (!link) return reply("❌ Debes indicar el link del grupo.\nEj: `!rpgnotificar https://chat.whatsapp.com/XXX`");

      if (!db.players) return reply("❌ No hay jugadores registrados.");

      const jugadores = Object.entries(db.players).filter(([, p]) => p.clase);
      if (!jugadores.length) return reply("❌ No hay jugadores con personaje creado.");

      let enviados = 0;
      let omitidos = 0;

      for (const [jid, p] of jugadores) {
        // Ya notificado → saltar
        if (p.grupoRpgNotificado) { omitidos++; continue; }

        const nombre = p.nombre || jid.split("@")[0];
        const mensaje =
          `╭━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
          `┃  ⚔️  *RAGE RPG — GRUPO OFICIAL*  ⚔️  ┃\n` +
          `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
          `¡Hola *${nombre}*! 👋\n\n` +
          `Tenemos un grupo oficial donde encontrarás:\n` +
          `│ 📢 Anuncios de eventos y actualizaciones\n` +
          `│ 🏆 Torneos y competencias RPG\n` +
          `│ 💬 Comunidad de jugadores\n` +
          `│ 🎁 Sorteos y códigos exclusivos\n` +
          `│ 🛡️ Soporte directo\n\n` +
          `🔗 *Únete aquí:*\n${link}\n\n` +
          `_¡Te esperamos, aventurero!_ ⚔️`;

        try {
          await sock.sendMessage(jid, { text: mensaje });
          p.grupoRpgNotificado = true;
          savePlayer(p);
          enviados++;
          // Pausa para no saturar WhatsApp
          await new Promise(r => setTimeout(r, 1500));
        } catch {
          omitidos++;
        }
      }

      await reply(
        `✅ *Notificación RPG completada*\n` +
        `━━━━━━━━━━━━━━\n` +
        `📨 Enviados: *${enviados}*\n` +
        `⏭️ Omitidos (ya notificados o error): *${omitidos}*`
      );
    },
  },
  // ────────────────────────────────────────
  // !msgrpg — Broadcast de mensaje a todos los jugadores RPG
  // ────────────────────────────────────────
  {
    name: "msgrpg",
    alias: ["mensajerpg", "broadcastrpg"],
    description: "Enviar mensaje al buzón de todos los jugadores RPG [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply, sock, args }) => {
      const texto = args.join(" ").trim();
      if (!texto) return reply("❌ Escribe el mensaje.\nEj: `!msgrpg Habrá mantenimiento mañana a las 10pm`");
      const titulo = "📢 Anuncio del Sistema";
      const total = enviarBroadcastBuzon({ titulo, cuerpo: texto });
      // Notificar por privado a cada jugador
      const jugadores = Object.entries(db.players).filter(([, p]) => p.clase);
      let notificados = 0;
      for (const [jid] of jugadores) {
        try {
          await sock.sendMessage(jid, {
            text:
              `📬 *Tienes un nuevo mensaje en tu buzón*\n` +
              `━━━━━━━━━━━━━━\n` +
              `📨 *De:* SISTEMA RPG\n` +
              `📌 *${titulo}*\n\n` +
              `Usa \`!buzonver\` para leerlo. ⚔️`
          });
          notificados++;
          await new Promise(r => setTimeout(r, 1200));
        } catch {}
      }
      await reply(`✅ Mensaje enviado al buzón de *${total}* jugadores.\n📲 Notificaciones por privado: *${notificados}*`);
    },
  },

  // ────────────────────────────────────────
  // !recompensarpg — Recompensa global a todos los jugadores
  // ────────────────────────────────────────
  {
    name: "recompensarpg",
    alias: ["recompensaglobal", "premiarpg"],
    description: "Enviar recompensa global al buzón de todos los jugadores [OWNER]\nUso: !recompensarpg oro|gemas|item cantidad [mensaje]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply, sock, args }) => {
      // Formato: !recompensarpg oro 500 Gracias por el evento
      const tipo = (args[0] || "").toLowerCase();
      const cantidad = parseInt(args[1]);
      const mensaje = args.slice(2).join(" ").trim() || "¡Recompensa especial del sistema!";
      if (!["oro", "gemas"].includes(tipo) && !tipo) {
        return reply(
          "❌ Uso: `!recompensarpg [oro|gemas|item] [cantidad] [mensaje opcional]`\n" +
          "Ej: `!recompensarpg oro 500 Gracias por participar`\n" +
          "Ej: `!recompensarpg gemas 100 Recompensa de evento`"
        );
      }
      if (isNaN(cantidad) || cantidad <= 0) return reply("❌ Cantidad inválida.");
      const recompensa = tipo === "oro"   ? { oro: cantidad }
                       : tipo === "gemas" ? { gemas: cantidad }
                       : { item: tipo, cantidad };
      const detalle = tipo === "oro" ? `💰 ${cantidad} oro` : tipo === "gemas" ? `💎 ${cantidad} gemas` : `🎒 ${cantidad}x ${tipo}`;
      const titulo = "🎁 Recompensa Global";
      const cuerpo = mensaje + `\n\n🎁 *Recompensa:* ${detalle}\n_Reclámala abriendo este mensaje con_ \`!buzonver\``;
      const total = enviarBroadcastBuzon({ titulo, cuerpo, recompensa });
      const jugadores = Object.entries(db.players).filter(([, p]) => p.clase);
      let notificados = 0;
      for (const [jid] of jugadores) {
        try {
          await sock.sendMessage(jid, {
            text:
              `🎁 *¡Tienes una recompensa en tu buzón!*\n` +
              `━━━━━━━━━━━━━━\n` +
              `📨 *De:* SISTEMA RPG\n` +
              `💰 ${detalle}\n\n` +
              `Usa \`!buzonver\` para reclamarla. ⚔️`
          });
          notificados++;
          await new Promise(r => setTimeout(r, 1200));
        } catch {}
      }
      await reply(`✅ Recompensa enviada al buzón de *${total}* jugadores.\n📲 Notificaciones: *${notificados}*`);
    },
  },

  // ────────────────────────────────────────
  // !resetgemas — Resetear gemas de todos los jugadores
  // ────────────────────────────────────────
  {
    name: "resetgemas",
    alias: ["borrgemas", "cleargemas", "quitargemas"],
    description: "Pone las gemas de todos los jugadores a 0 [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply, args }) => {
      const cantidad = parseInt(args[0]) || 0; // opcional: dejar X gemas en vez de 0
      const jugadores = Object.entries(db.players).filter(([, p]) => p.clase);
      let afectados = 0;
      for (const [, p] of jugadores) {
        if ((p.gemas || 0) > cantidad) {
          p.gemas = cantidad;
          afectados++;
        }
      }
      saveDB();
      return reply(
        `✅ *Gemas reseteadas*\n` +
        `━━━━━━━━━━━━━━\n` +
        `👥 Jugadores afectados: *${afectados}*\n` +
        `💎 Gemas establecidas a: *${cantidad}*`
      );
    },
  },

  // ────────────────────────────────────────
  // !revocarrecompensa — Revocar último broadcast no reclamado
  // ────────────────────────────────────────
  {
    name: "revocarrecompensa",
    alias: ["revocarrecompensa", "borrarrecompensa", "quitarrecompensa"],
    description: "Elimina el último correo global no reclamado del buzón de todos [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply, args }) => {
      // Si se pasa un título como arg, filtrar por ese título
      const filtroTitulo = args.join(" ").trim().toLowerCase();
      const jugadores = Object.entries(db.players).filter(([, p]) => p.clase && Array.isArray(p.buzon) && p.buzon.length);
      let removidos = 0;
      let titulo = null;

      for (const [jid, p] of jugadores) {
        // Buscar el último mensaje no reclamado (con o sin recompensa)
        for (let i = p.buzon.length - 1; i >= 0; i--) {
          const m = p.buzon[i];
          const noReclamado = !m.reclamado && !m.leido;
          const matchTitulo = !filtroTitulo || (m.titulo || "").toLowerCase().includes(filtroTitulo);
          if (noReclamado && matchTitulo) {
            if (!titulo) titulo = m.titulo;
            p.buzon.splice(i, 1);
            removidos++;
            break;
          }
        }
      }

      saveDB();
      if (removidos === 0)
        return reply("⚠️ No se encontró ningún correo no reclamado para revocar.\n_Tip: usa_ `!revocarrecompensa Recompensa Global` _para filtrar por título._");
      return reply(
        `✅ *Correo revocado*\n` +
        `━━━━━━━━━━━━━━\n` +
        `📨 Título: *${titulo || "(sin título)"}*\n` +
        `👥 Removido de *${removidos}* buzones.\n` +
        `_(Solo afecta correos no reclamados)_`
      );
    },
  },

  // ────────────────────────────────────────
  // !recompensajugador — Recompensa a 1 jugador específico
  // ────────────────────────────────────────
  {
    name: "recompensajugador",
    alias: ["premiojugador", "darrecompensa"],
    description: "Enviar recompensa a un jugador específico [OWNER]\nUso: !recompensajugador @u oro|gemas cantidad [mensaje]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply, sock, msg, args }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const jid = mentioned[0];
      if (!jid) return reply("❌ Menciona al jugador.\nEj: `!recompensajugador @usuario oro 500 Premio especial`");
      const p = db.players[jid];
      if (!p || !p.clase) return reply("❌ Ese jugador no tiene personaje RPG.");
      const tipo = (args[1] || "").toLowerCase();
      const cantidad = parseInt(args[2]);
      const mensaje = args.slice(3).join(" ").trim() || "¡Recompensa especial del sistema!";
      if (!tipo || isNaN(cantidad) || cantidad <= 0)
        return reply("❌ Uso: `!recompensajugador @u [oro|gemas|item] [cantidad] [mensaje]`");
      const recompensa = tipo === "oro"   ? { oro: cantidad }
                       : tipo === "gemas" ? { gemas: cantidad }
                       : { item: tipo, cantidad };
      const detalle = tipo === "oro" ? `💰 ${cantidad} oro` : tipo === "gemas" ? `💎 ${cantidad} gemas` : `🎒 ${cantidad}x ${tipo}`;
      const titulo = "🎁 Recompensa Personal";
      const cuerpo = mensaje + `\n\n🎁 *Recompensa:* ${detalle}\n_Reclámala abriendo este mensaje con_ \`!buzonver\``;
      enviarMensajeBuzon(jid, { titulo, cuerpo, recompensa });
      try {
        await sock.sendMessage(jid, {
          text:
            `🎁 *¡Tienes una recompensa en tu buzón!*\n` +
            `━━━━━━━━━━━━━━\n` +
            `📨 *De:* SISTEMA RPG\n` +
            `${detalle}\n\n` +
            `Usa \`!buzonver\` para reclamarla. ⚔️`
        });
      } catch {}
      await reply(`✅ Recompensa enviada a *${p.nombre}*: ${detalle}`);
    },
  },
  // ────────────────────────────────────────
  // !iniciarbancoclan — Dar 2000 medallas iniciales a todos los clanes
  // ────────────────────────────────────────
  {
    name: "iniciarbancoclan",
    alias: ["bancoclaninit", "clanmedallainit"],
    description: "Dar 2000 medallas iniciales al banco de todos los clanes [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ reply }) => {
      const clanes = Object.values(db.guilds || {});
      if (!clanes.length) return reply("❌ No hay clanes registrados.");
      let count = 0;
      for (const clan of clanes) {
        inicializarBancoMedallas(clan, 2000);
        count++;
      }
      await reply(`✅ Se dieron *2000🏅* al banco de *${count}* clan(es) y se inicializó el árbol de habilidades.`);
    },
  },
];

export default ownerCommands;
