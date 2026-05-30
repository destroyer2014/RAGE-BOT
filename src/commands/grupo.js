// ═══════════════════════════════════════════
//      PRAGMATA BOT — src/commands/grupo.js
//   Administración de grupos + Antilink v3.0
// ═══════════════════════════════════════════

import { isGroup, cleanJid } from "../lib/utils.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Archivos de persistencia ──────────────────────────────────
const ANTILINK_FILE       = join(__dirname, "../../data/antilink.json");
const ANTILINK_REDES_FILE = join(__dirname, "../../data/antilink_redes.json");

// ── Persistencia antilink WhatsApp (general) ──────────────────
function loadAntilinkGroups() {
  try {
    if (existsSync(ANTILINK_FILE)) return new Set(JSON.parse(readFileSync(ANTILINK_FILE, "utf-8")));
  } catch {}
  return new Set();
}
function saveAntilinkGroups() {
  try { writeFileSync(ANTILINK_FILE, JSON.stringify([...antilinkGroups]), "utf-8"); } catch {}
}
export const antilinkGroups = loadAntilinkGroups();

// ── Persistencia antilink por red social ─────────────────────
function loadAntilinkRedes() {
  try {
    if (existsSync(ANTILINK_REDES_FILE)) return JSON.parse(readFileSync(ANTILINK_REDES_FILE, "utf-8"));
  } catch {}
  return {};
}
function saveAntilinkRedes() {
  try { writeFileSync(ANTILINK_REDES_FILE, JSON.stringify(antilinkRedes), "utf-8"); } catch {}
}
export const antilinkRedes = loadAntilinkRedes();

// ── Regexes por plataforma ────────────────────────────────────
export const REDES_REGEX = {
  tiktok:    /\b(?:https?:\/\/)?(?:www\.)?tiktok\.com(\/\S*)?/i,
  youtube:   /\b(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)(\/\S*)?/i,
  telegram:  /\b(?:https?:\/\/)?(?:www\.)?(?:telegram\.org|t\.me)(\/\S*)?/i,
  facebook:  /\b(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.me|fb\.watch)(\/\S*)?/i,
  instagram: /\b(?:https?:\/\/)?(?:www\.)?instagram\.com(\/\S*)?/i,
  twitter:   /\b(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)(\/\S*)?/i,
  discord:   /\b(?:https?:\/\/)?(?:www\.)?(?:discord\.com|discord\.gg)(\/\S*)?/i,
  threads:   /\b(?:https?:\/\/)?(?:www\.)?threads\.net(\/\S*)?/i,
  twitch:    /\b(?:https?:\/\/)?(?:www\.)?twitch\.tv(\/\S*)?/i,
};

// ── Regex general (links WhatsApp + cualquier URL) ────────────
export const LINK_REGEX = /(?:https?:\/\/|ftp:\/\/|www\.|ftp\.)|chat\.whatsapp\.com|whatsapp\.com\/channel/i;

// ── Antilink2: detecta CUALQUIER URL incluso sin https ────────
export const LINK_REGEX2 = (text) => {
  const urlRegex = /(?:[a-zA-Z]+:\/\/[^\s]+)|(?:\b(www\.|ftp\.)[^\s]+\.[a-z]{2,}\/?[^\s]*)|(?:\b[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?)/gi;
  const urls = [...new Set(
    (text.match(urlRegex) || [])
      .map((m) => m.replace(/[.,;!?]+$/, ""))
      .map((m) => (/^(?:www\.|ftp\.)/.test(m) ? "http://" + m : m))
      .map((m) => (/^(?!https?:\/\/|ftp:\/\/)/.test(m) ? "http://" + m : m))
      .filter((u) => {
        try {
          const parsed = new URL(u);
          return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(parsed.hostname);
        } catch { return false; }
      })
  )];
  return urls.length > 0;
};

// ── Persistencia del welcome ───────────────────
const WELCOME_FILE = join(__dirname, "../../data/welcome.json");

function loadWelcomeGroups() {
  try {
    if (existsSync(WELCOME_FILE)) return new Set(JSON.parse(readFileSync(WELCOME_FILE, "utf-8")));
  } catch {}
  return new Set();
}
function saveWelcomeGroups() {
  try { writeFileSync(WELCOME_FILE, JSON.stringify([...welcomeGroups]), "utf-8"); } catch {}
}
export const welcomeGroups = loadWelcomeGroups();

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
  // Resolver LID a número real si aplica
  let resolvedJid = cleanJid(senderJid);
  if (resolvedJid.endsWith("@lid")) {
    const lidNum = resolvedJid.split("@")[0];
    const match = meta.participants.find((p) =>
      cleanJid(p.id).split("@")[0] === lidNum || p.lid?.split("@")[0] === lidNum
    );
    if (match) resolvedJid = cleanJid(match.id);
  }
  const senderNum = resolvedJid.split("@")[0];
  const p = meta.participants.find((p) => {
    const pNum = cleanJid(p.id).split("@")[0];
    return pNum === senderNum || p.id.startsWith(senderNum);
  });
  return p?.admin === "admin" || p?.admin === "superadmin";
}



const groupCommands = [

  // ── Mencionar a todos ─────────────────────
  {
    name: "everyone",
    alias: ["todos", "all", "tagall", "mencionar"],
    description: "Menciona a todos en el grupo",
    category: "Grupo",
    freeAllowed: true,
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
    freeAllowed: true,
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
    freeAllowed: true,
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
    freeAllowed: true,
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
    freeAllowed: true,
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
    freeAllowed: true,
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
    freeAllowed: true,
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
    freeAllowed: true,
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
    freeAllowed: true,
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
    freeAllowed: true,
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
    freeAllowed: true,
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
    freeAllowed: true,
    execute: async ({ reply, from, sender }) => {
      await reply(`🆔 *IDs del chat*\n━━━━━━━━━━━━━━\n📍 Chat: \`${from}\`\n👤 Tú: \`${sender}\``);
    },
  },

  // ── ANTILINK ──────────────────────────────
  {
    name: "antilink",
    alias: ["antlink", "nolinks"],
    description: "Activa/desactiva el antilink de grupos WhatsApp",
    category: "Grupo Admin",
    execute: async ({ sock, from, reply, sender, args, isOwner }) => {
      if (!isGroup(from)) return reply("❌ Solo funciona en grupos.");
      const isAdmin = await senderIsAdmin(sock, from, sender);
      if (!isAdmin && !isOwner) return reply("🔒 Solo admins pueden usar este comando.");
      const sub = (args[0] || "").toLowerCase();
      if (sub === "on" || sub === "activar") {
        antilinkGroups.add(from);
        saveAntilinkGroups();
        await reply("🔗 *Antilink ACTIVADO* ✅\nEliminaré links de grupos de WhatsApp y expulsaré al que los mande (excepto admins).");
      } else if (sub === "off" || sub === "desactivar") {
        antilinkGroups.delete(from);
        saveAntilinkGroups();
        await reply("🔗 *Antilink DESACTIVADO* ❌");
      } else {
        const estado = antilinkGroups.has(from) ? "✅ ACTIVADO" : "❌ DESACTIVADO";
        await reply(`🔗 *Antilink WhatsApp:* ${estado}\n\n*!antilink on* — activar\n*!antilink off* — desactivar`);
      }
    },
  },

  // ── !antired ─── antilink por red social ──────────────────────
  {
    name: "antired",
    alias: ["antiredes", "antisocial"],
    description: "Activa/desactiva antilink por red social específica",
    category: "Grupo Admin",
    execute: async ({ sock, from, reply, sender, args, isOwner }) => {
      if (!isGroup(from)) return reply("❌ Solo funciona en grupos.");
      const isAdmin = await senderIsAdmin(sock, from, sender);
      if (!isAdmin && !isOwner) return reply("🔒 Solo admins pueden usar este comando.");

      const redes = Object.keys(REDES_REGEX);
      const red = (args[0] || "").toLowerCase();
      const accion = (args[1] || "").toLowerCase();

      // Ver estado de todas
      if (!red || red === "status" || red === "estado") {
        const cfg = antilinkRedes[from] || {};
        const lista = redes.map((r) => `${cfg[r] ? "✅" : "❌"} ${r}`).join("\n");
        return reply(`📵 *Antilink Redes — Estado*\n\n${lista}\n\n*Uso:* !antired [red] [on/off]\nEj: !antired tiktok on`);
      }

      if (!redes.includes(red)) {
        return reply(`❌ Red no válida. Opciones:\n${redes.join(", ")}`);
      }

      if (accion === "on" || accion === "activar") {
        if (!antilinkRedes[from]) antilinkRedes[from] = {};
        antilinkRedes[from][red] = true;
        saveAntilinkRedes();
        await reply(`📵 *Anti-${red} ACTIVADO* ✅\nExpulsaré a quien mande links de ${red} (excepto admins).`);
      } else if (accion === "off" || accion === "desactivar") {
        if (!antilinkRedes[from]) antilinkRedes[from] = {};
        antilinkRedes[from][red] = false;
        saveAntilinkRedes();
        await reply(`📵 *Anti-${red} DESACTIVADO* ❌`);
      } else {
        const estado = antilinkRedes[from]?.[red] ? "✅ ACTIVADO" : "❌ DESACTIVADO";
        await reply(`📵 *Anti-${red}:* ${estado}\n\n!antired ${red} on — activar\n!antired ${red} off — desactivar`);
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
      await reply("♻️ *Reiniciando PRAGMATA BOT...*\n_Vuelvo en unos segundos._");
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
        // sock.chats.all() no existe en Baileys moderno — usamos el store de chats directamente
        const rawChats = sock.chats?.all?.()
          ?? (sock.store?.chats ? Object.values(sock.store.chats) : null)
          ?? (sock.chatsMap ? [...sock.chatsMap.keys()] : null);

        let jids = [];
        if (rawChats && typeof rawChats[Symbol.iterator] === "function") {
          for (const c of rawChats) {
            const id = typeof c === "string" ? c : (c?.id ?? c?.jid);
            if (id && (id.endsWith("@s.whatsapp.net") || id.endsWith("@g.us"))) jids.push(id);
          }
        }

        // Fallback: obtener grupos activos donde el bot participa
        if (jids.length === 0) {
          try {
            const grupos = await sock.groupFetchAllParticipating();
            jids = Object.keys(grupos);
          } catch {}
        }

        if (jids.length === 0) return reply("⚠️ No se encontraron chats para enviar el broadcast.\nEl bot necesita haber recibido mensajes primero.");

        let enviados = 0;
        for (const jid of jids) {
          try {
            await sock.sendMessage(jid, { text: `📢 *Mensaje del creador:*\n\n${text}` });
            enviados++;
            await new Promise((r) => setTimeout(r, 600));
          } catch {}
        }
        await reply(`✅ Broadcast enviado a *${enviados}* chats.`);
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
      if (!text) return reply("✏️ Escribe el nuevo estado.\nEj: *!estado PRAGMATA BOT activo 🤖*");
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
    freeAllowed: true,
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

  // ── !welcome on/off ───────────────────────────
  {
    name: "welcome",
    alias: ["bienvenida"],
    description: "Activa/desactiva mensaje de bienvenida en el grupo",
    category: "Grupos",
    adminOnly: true,
    execute: async ({ reply, from, args }) => {
      const sub = (args[0] || "").toLowerCase();
      if (!["on", "off"].includes(sub)) return reply("⚙️ Uso: *!welcome on* o *!welcome off*");
      const active = sub === "on";
      if (active) { welcomeGroups.add(from); } else { welcomeGroups.delete(from); }
      saveWelcomeGroups();
      await reply(active
        ? "✅ *Bienvenida activada*\nSaludaré a los nuevos miembros automáticamente 👋"
        : "❌ *Bienvenida desactivada*"
      );
    },
  },
];
export default groupCommands;
