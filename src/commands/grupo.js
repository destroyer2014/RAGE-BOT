// ═══════════════════════════════════════════
//      RAGE-BOT — src/commands/grupo.js
//   Administración de grupos + Antilink
//              v2.4.0
// ═══════════════════════════════════════════

import { isGroup, cleanJid } from "../lib/utils.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ANTILINK_FILE = join(__dirname, "../../data/antilink.json");

// ── Persistencia del antilink ──────────────────
function loadAntilinkGroups() {
  try {
    if (existsSync(ANTILINK_FILE)) {
      const data = JSON.parse(readFileSync(ANTILINK_FILE, "utf-8"));
      return new Set(data);
    }
  } catch {}
  return new Set();
}

function saveAntilinkGroups() {
  try {
    writeFileSync(ANTILINK_FILE, JSON.stringify([...antilinkGroups]), "utf-8");
  } catch {}
}

export const antilinkGroups = loadAntilinkGroups();

// ── Detecta si el bot es admin — compatible con LID y número ──
async function botIsAdmin(sock, groupJid) {
  const meta = await sock.groupMetadata(groupJid);
  const botRaw = sock.user?.id || "";
  const botNum = cleanJid(botRaw).split("@")[0];
  const botLid = sock.user?.lid ? cleanJid(sock.user.lid).split("@")[0] : null;

  const me = meta.participants.find((p) => {
    const pNum = cleanJid(p.id).split("@")[0];
    return pNum === botNum || (botLid && pNum === botLid);
  });
  return me?.admin === "admin" || me?.admin === "superadmin";
}

// ── Detecta si el sender es admin — compatible con LID y número ──
async function senderIsAdmin(sock, groupJid, senderJid) {
  const meta = await sock.groupMetadata(groupJid);
  const senderNum = cleanJid(senderJid).split("@")[0];
  const p = meta.participants.find((p) => {
    const pNum = cleanJid(p.id).split("@")[0];
    return pNum === senderNum || p.id.startsWith(senderNum);
  });
  return p?.admin === "admin" || p?.admin === "superadmin";
}

// Regex: detecta links de WhatsApp y URLs generales
export const LINK_REGEX = /(?:https?:\/\/|www\.)|chat\.whatsapp\.com/i;

const groupCommands = [

  // ── Mencionar a todos ─────────────────────
  {
    name: "everyone",
    alias: ["todos", "all", "tagall", "mencionar"],
    description: "Menciona a todos en el grupo",
    category: "Grupo",
    execute: async ({ sock, msg, from, reply }) => {
      if (!isGroup(from)) return reply("❌ Solo funciona en grupos.");
      try {
        const metadata = await sock.groupMetadata(from);
        const members = metadata.participants;
        const mentions = members.map((m) => m.id);
        const text =
          `📢 *¡Atención a todos!*\n` +
          `━━━━━━━━━━━━━━\n` +
          members.map((m) => `@${m.id.split("@")[0]}`).join(" ");
        await sock.sendMessage(from, { text, mentions }, { quoted: msg });
      } catch {
        await reply("❌ No tengo permisos para mencionar en este grupo.");
      }
    },
  },

  // ── Ban ───────────────────────────────────
  {
    name: "ban",
    alias: ["expulsar", "kick", "remove"],
    description: "Expulsa a un usuario del grupo",
    category: "Grupo Admin",
    execute: async ({ sock, msg, from, reply, sender, isOwner }) => {
      if (!isGroup(from)) return reply("❌ Solo funciona en grupos.");
      const isAdmin = await senderIsAdmin(sock, from, sender);
      if (!isAdmin && !isOwner) return reply("🔒 Solo admins pueden usar este comando.");
      const isBot = await botIsAdmin(sock, from);
      if (!isBot) return reply("❌ El bot necesita ser admin del grupo para esto.");
      const mentioned =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
        (msg.message?.extendedTextMessage?.contextInfo?.participant
          ? [msg.message.extendedTextMessage.contextInfo.participant]
          : []);
      if (!mentioned.length) return reply("👤 Menciona a quien quieres expulsar.\nEj: *!ban @usuario*");
      try {
        await sock.groupParticipantsUpdate(from, mentioned, "remove");
        await reply(`✅ *${mentioned.map((j) => "@" + j.split("@")[0]).join(", ")} fue expulsado del grupo.* 🚪`);
      } catch {
        await reply("❌ No pude expulsar. ¿Soy admin del grupo?");
      }
    },
  },

  // ── Add ───────────────────────────────────
  {
    name: "add",
    alias: ["agregar", "añadir"],
    description: "Agrega un número al grupo (ej: !add 51999888777)",
    category: "Grupo Admin",
    execute: async ({ sock, from, reply, sender, args, isOwner }) => {
      if (!isGroup(from)) return reply("❌ Solo funciona en grupos.");
      const isAdmin = await senderIsAdmin(sock, from, sender);
      if (!isAdmin && !isOwner) return reply("🔒 Solo admins pueden usar este comando.");
      const isBot = await botIsAdmin(sock, from);
      if (!isBot) return reply("❌ El bot necesita ser admin del grupo.");
      if (!args[0]) return reply("📱 Escribe el número.\nEj: *!add 51999888777*");
      const number = args[0].replace(/[^0-9]/g, "");
      const jid = `${number}@s.whatsapp.net`;
      try {
        const result = await sock.groupParticipantsUpdate(from, [jid], "add");
        const status = result?.[0]?.status;
        if (status === "200") {
          await reply(`✅ @${number} fue agregado al grupo.`);
        } else if (status === "403") {
          await reply(`❌ @${number} tiene privacidad activada, no se puede agregar.`);
        } else {
          await reply(`⚠️ No se pudo agregar a @${number}. Estado: ${status}`);
        }
      } catch {
        await reply("❌ Error al agregar al usuario.");
      }
    },
  },

  // ── Promote / Demote ─────────────────────
  {
    name: "promote",
    alias: ["makeadmin", "hacreadmin", "admin"],
    description: "Hace admin a un usuario",
    category: "Grupo Admin",
    execute: async ({ sock, msg, from, reply, sender, isOwner }) => {
      if (!isGroup(from)) return reply("❌ Solo funciona en grupos.");
      const isAdmin = await senderIsAdmin(sock, from, sender);
      if (!isAdmin && !isOwner) return reply("🔒 Solo admins pueden usar este comando.");
      const isBot = await botIsAdmin(sock, from);
      if (!isBot) return reply("❌ El bot necesita ser admin del grupo.");
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply("👤 Menciona a quien quieres hacer admin.\nEj: *!promote @usuario*");
      try {
        await sock.groupParticipantsUpdate(from, mentioned, "promote");
        await reply(`⬆️ *${mentioned.map((j) => "@" + j.split("@")[0]).join(", ")} ahora es admin del grupo.* 👑`);
      } catch {
        await reply("❌ No pude hacer admin. ¿Soy admin del grupo?");
      }
    },
  },
  {
    name: "demote",
    alias: ["quitaradmin", "removeadmin"],
    description: "Quita el admin a un usuario",
    category: "Grupo Admin",
    execute: async ({ sock, msg, from, reply, sender, isOwner }) => {
      if (!isGroup(from)) return reply("❌ Solo funciona en grupos.");
      const isAdmin = await senderIsAdmin(sock, from, sender);
      if (!isAdmin && !isOwner) return reply("🔒 Solo admins pueden usar este comando.");
      const isBot = await botIsAdmin(sock, from);
      if (!isBot) return reply("❌ El bot necesita ser admin del grupo.");
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply("👤 Menciona a quien quieres quitar admin.\nEj: *!demote @usuario*");
      try {
        await sock.groupParticipantsUpdate(from, mentioned, "demote");
        await reply(`⬇️ *${mentioned.map((j) => "@" + j.split("@")[0]).join(", ")} ya no es admin del grupo.*`);
      } catch {
        await reply("❌ No pude quitar el admin.");
      }
    },
  },

  // ── Mute / Unmute ─────────────────────────
  {
    name: "mute",
    alias: ["silenciar", "cerrar", "lock"],
    description: "Silencia el grupo",
    category: "Grupo Admin",
    execute: async ({ sock, from, reply, sender, isOwner }) => {
      if (!isGroup(from)) return reply("❌ Solo funciona en grupos.");
      const isAdmin = await senderIsAdmin(sock, from, sender);
      if (!isAdmin && !isOwner) return reply("🔒 Solo admins pueden usar este comando.");
      const isBot = await botIsAdmin(sock, from);
      if (!isBot) return reply("❌ El bot necesita ser admin del grupo.");
      try {
        await sock.groupSettingUpdate(from, "announcement");
        await reply("🔇 *Grupo silenciado.*\nSolo admins pueden enviar mensajes.");
      } catch {
        await reply("❌ No pude silenciar el grupo.");
      }
    },
  },
  {
    name: "unmute",
    alias: ["abrir", "unlock", "open"],
    description: "Abre el grupo para todos",
    category: "Grupo Admin",
    execute: async ({ sock, from, reply, sender, isOwner }) => {
      if (!isGroup(from)) return reply("❌ Solo funciona en grupos.");
      const isAdmin = await senderIsAdmin(sock, from, sender);
      if (!isAdmin && !isOwner) return reply("🔒 Solo admins pueden usar este comando.");
      const isBot = await botIsAdmin(sock, from);
      if (!isBot) return reply("❌ El bot necesita ser admin del grupo.");
      try {
        await sock.groupSettingUpdate(from, "not_announcement");
        await reply("🔊 *Grupo abierto.*\nTodos pueden enviar mensajes.");
      } catch {
        await reply("❌ No pude abrir el grupo.");
      }
    },
  },

  // ── Cambiar nombre / descripción ─────────
  {
    name: "gtitle",
    alias: ["renombrar", "nombre", "groupname"],
    description: "Cambia el nombre del grupo",
    category: "Grupo Admin",
    execute: async ({ sock, from, reply, sender, text, isOwner }) => {
      if (!isGroup(from)) return reply("❌ Solo funciona en grupos.");
      const isAdmin = await senderIsAdmin(sock, from, sender);
      if (!isAdmin && !isOwner) return reply("🔒 Solo admins pueden usar este comando.");
      const isBot = await botIsAdmin(sock, from);
      if (!isBot) return reply("❌ El bot necesita ser admin del grupo.");
      if (!text) return reply("✏️ Escribe el nuevo nombre.\nEj: *!gtitle Mi Grupo Épico*");
      try {
        await sock.groupUpdateSubject(from, text);
        await reply(`✅ *Nombre del grupo cambiado a:*\n"${text}"`);
      } catch {
        await reply("❌ No pude cambiar el nombre del grupo.");
      }
    },
  },
  {
    name: "gdesc",
    alias: ["descripcion", "groupdesc", "setdesc"],
    description: "Cambia la descripción del grupo",
    category: "Grupo Admin",
    execute: async ({ sock, from, reply, sender, text, isOwner }) => {
      if (!isGroup(from)) return reply("❌ Solo funciona en grupos.");
      const isAdmin = await senderIsAdmin(sock, from, sender);
      if (!isAdmin && !isOwner) return reply("🔒 Solo admins pueden usar este comando.");
      const isBot = await botIsAdmin(sock, from);
      if (!isBot) return reply("❌ El bot necesita ser admin del grupo.");
      if (!text) return reply("✏️ Escribe la nueva descripción.\nEj: *!gdesc Bienvenidos al grupo*");
      try {
        await sock.groupUpdateDescription(from, text);
        await reply(`✅ *Descripción del grupo actualizada.*`);
      } catch {
        await reply("❌ No pude cambiar la descripción.");
      }
    },
  },

  // ── Info del grupo ────────────────────────
  {
    name: "ginfo",
    alias: ["groupinfo", "infogrupo", "grupo"],
    description: "Muestra información del grupo",
    category: "Grupo",
    execute: async ({ sock, from, reply }) => {
      if (!isGroup(from)) return reply("❌ Solo funciona en grupos.");
      try {
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter((p) => p.admin === "admin" || p.admin === "superadmin");
        const created = new Date(meta.creation * 1000).toLocaleDateString("es-PE");
        await reply(
          `📊 *Info del Grupo*\n━━━━━━━━━━━━━━\n` +
          `📌 Nombre: ${meta.subject}\n` +
          `📝 Descripción: ${meta.desc || "Sin descripción"}\n` +
          `👥 Miembros: ${meta.participants.length}\n` +
          `👑 Admins: ${admins.length}\n` +
          `📅 Creado: ${created}\n` +
          `🆔 ID: ${from}`
        );
      } catch {
        await reply("❌ No pude obtener la info del grupo.");
      }
    },
  },

  // ── Warn ──────────────────────────────────
  {
    name: "warn",
    alias: ["advertir", "aviso"],
    description: "Advierte a un usuario",
    category: "Grupo Admin",
    execute: async ({ sock, msg, from, reply, sender, text, isOwner }) => {
      if (!isGroup(from)) return reply("❌ Solo funciona en grupos.");
      const isAdmin = await senderIsAdmin(sock, from, sender);
      if (!isAdmin && !isOwner) return reply("🔒 Solo admins pueden usar este comando.");
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply("👤 Menciona a quien quieres advertir.\nEj: *!warn @usuario motivo*");
      const motivo = text.replace(/@\d+/g, "").trim() || "Sin motivo especificado";
      await sock.sendMessage(from, {
        text:
          `⚠️ *ADVERTENCIA*\n━━━━━━━━━━━━━━\n` +
          `👤 Usuario: ${mentioned.map((j) => "@" + j.split("@")[0]).join(", ")}\n` +
          `📝 Motivo: ${motivo}\n━━━━━━━━━━━━━━\n` +
          `_Si continúas, serás expulsado del grupo._`,
        mentions: mentioned,
      }, { quoted: msg });
    },
  },

  // ── ID ────────────────────────────────────
  {
    name: "id",
    alias: ["chatid", "gid"],
    description: "Muestra el ID del chat actual",
    category: "General",
    execute: async ({ reply, from, sender }) => {
      await reply(`🆔 *IDs del chat*\n━━━━━━━━━━━━━━\n📍 Chat: \`${from}\`\n👤 Tú: \`${sender}\``);
    },
  },

  // ── ANTILINK ──────────────────────────────
  {
    name: "antilink",
    alias: ["antlink", "nolinks"],
    description: "Activa/desactiva el antilink en el grupo",
    category: "Grupo Admin",
    execute: async ({ sock, from, reply, sender, args, isOwner }) => {
      if (!isGroup(from)) return reply("❌ Solo funciona en grupos.");
      const isAdmin = await senderIsAdmin(sock, from, sender);
      if (!isAdmin && !isOwner) return reply("🔒 Solo admins pueden usar este comando.");

      const sub = (args[0] || "").toLowerCase();
      if (sub === "on" || sub === "activar") {
        antilinkGroups.add(from);
        saveAntilinkGroups();
        await reply("🔗 *Antilink ACTIVADO* ✅\nLos links enviados por no-admins serán eliminados y el usuario advertido.");
      } else if (sub === "off" || sub === "desactivar") {
        antilinkGroups.delete(from);
        saveAntilinkGroups();
        await reply("🔗 *Antilink DESACTIVADO* ❌\nAhora se permiten links en el grupo.");
      } else {
        const estado = antilinkGroups.has(from) ? "✅ ACTIVADO" : "❌ DESACTIVADO";
        await reply(`🔗 *Antilink:* ${estado}\n\nUso:\n*!antilink on* — activar\n*!antilink off* — desactivar`);
      }
    },
  },

  // ── Reiniciar / Broadcast / Estado ────────
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
  {
    name: "broadcast",
    alias: ["bc", "anuncio"],
    description: "Envía un mensaje a todos los chats [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ sock, reply, text }) => {
      if (!text) return reply("📢 Escribe el mensaje.\nEj: *!broadcast Hola a todos!*");
      try {
        const chats = Object.keys(await sock.chats.all());
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
  {
    name: "estado",
    alias: ["status", "setstatus"],
    description: "Cambia el estado del bot [OWNER]",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ sock, reply, text }) => {
      if (!text) return reply("✏️ Escribe el nuevo estado.\nEj: *!estado RAGE-BOT activo 🤖*");
      try {
        await sock.updateProfileStatus(text);
        await reply(`✅ *Estado actualizado:*\n"${text}"`);
      } catch {
        await reply("❌ No pude cambiar el estado.");
      }
    },
  },
  // ── Pareja aleatoria ──────────────────────
  {
    name: "pareja",
    alias: ["ship", "amor", "couple"],
    description: "Forma una pareja aleatoria del grupo 💕",
    category: "Grupo",
    execute: async ({ sock, from, reply, msg }) => {
      if (!isGroup(from)) return reply("❌ Solo funciona en grupos.");
      try {
        const meta = await sock.groupMetadata(from);
        const members = meta.participants.filter((p) => p.id.endsWith("@s.whatsapp.net") || p.id.endsWith("@lid"));
        if (members.length < 2) return reply("❌ Necesito al menos 2 miembros en el grupo.");
        const shuffled = members.sort(() => Math.random() - 0.5);
        const [p1, p2] = shuffled;
        const n1 = p1.id.split("@")[0];
        const n2 = p2.id.split("@")[0];
        const compat = Math.floor(Math.random() * 41) + 60;
        const frases = [
          "💕 ¡La pareja del día es @" + n1 + " y @" + n2 + "! ¡Qué bonitos hacen juntos! 🥰",
          "💘 ¡El bot ha hablado! @" + n1 + " y @" + n2 + " son la pareja perfecta 💑",
          "❤️ @" + n1 + " + @" + n2 + " = Amor verdadero 💍✨",
          "🌹 @" + n1 + " y @" + n2 + " tienen una compatibilidad del " + compat + "% 💞",
          "💖 El universo dice que @" + n1 + " y @" + n2 + " deberían estar juntos 🔮",
        ];
        const frase = frases[Math.floor(Math.random() * frases.length)];
        await sock.sendMessage(from, { text: frase, mentions: [p1.id, p2.id] }, { quoted: msg });
      } catch {
        await reply("❌ No pude obtener los miembros del grupo.");
      }
    },
  },
];
export default groupCommands;
