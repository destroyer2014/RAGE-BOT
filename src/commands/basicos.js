// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/basicos.js
// ═══════════════════════════════════════════

import { formatUptime } from "../lib/utils.js";
import config from "../../config.js";
import { getStats, getUser, xpBar, xpForLevel, getPremiumPlan, isPremium, checkDailyLimit, PLANES, getDiosUsers } from "../lib/database.js";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const startTime = Date.now();
const COMMUNITY_LINK = "https://whatsapp.com/channel/0029VbADsUx6LwHo4wdirM0v";

function getDateTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const peru = new Date(utc + (-5 * 60) * 60000);
  const dias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const h = peru.getHours();
  return {
    fecha: `${dias[peru.getDay()]}, ${String(peru.getDate()).padStart(2,"0")} ${meses[peru.getMonth()]} ${peru.getFullYear()}`,
    hora: `${String(h).padStart(2,"0")}:${String(peru.getMinutes()).padStart(2,"0")}:${String(peru.getSeconds()).padStart(2,"0")}`,
    saludo: h >= 5 && h < 12 ? "🌅 Buenos días" : h >= 12 && h < 19 ? "☀️ Buenas tardes" : "🌙 Buenas noches",
  };
}

function uptimeBar(seconds) {
  const filled = Math.round(Math.min(seconds / 86400, 1) * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

const basicCommands = [
  {
    name: "menu",
    alias: ["help", "ayuda", "comandos"],
    description: "Menú principal de comandos",
    category: "General",
    freeAllowed: true,
    execute: async ({ sock, from, msg, reply, isOwner, isPremium, sender }) => {
      const { fecha, hora, saludo } = getDateTime();
      const upSec = Math.floor((Date.now() - startTime) / 1000);
      const stats = getStats();
      const modoBot = config.workInGroups && config.workInPrivate ? "🌐 Público"
        : config.workInGroups ? "👥 Solo grupos" : "🔒 Solo privado";
      const plan = getPremiumPlan(sender);
      const planesLabel = { plata:"🥈 Plata", dorado:"🥇 Dorado", king:"👑 King", dios:"🔱 Dios" };
      const planTag = plan ? ` — ${planesLabel[plan]}` : "";
      const userTag = isOwner ? "👑 *CREADOR*" : isPremium ? `⭐ *PREMIUM*${planTag}` : "👤 Usuario";

      // Premiums adquiridos este año
      const ahora = new Date();
      const inicioAnio = new Date(ahora.getFullYear(), 0, 1).getTime();
      const userData2 = getUser(sender);
      const premiumsAnio = (userData2?.premiumHistory || []).filter(h => h >= inicioAnio).length;
      const premiumContador = isPremium || isOwner
        ? `\n│ • 💎 Premiums este año: *${premiumsAnio}/12*`
        : "";

      // ── Datos de nivel del usuario ──────────
      const userData = getUser(sender) || { xp: 0, level: 1 };
      const nextXP = xpForLevel((userData.level || 1) + 1);
      const bar = xpBar(userData.xp, nextXP);
      let rango = "🥉 Novato";
      if (userData.level >= 5)  rango = "🥈 Aprendiz";
      if (userData.level >= 10) rango = "🥇 Veterano";
      if (userData.level >= 20) rango = "💎 Élite";
      if (userData.level >= 50) rango = "👑 Leyenda";

      const menu =
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   ⚡ *P R A G M A T A  B O T* ⚡   ┃
┃   *v${config.botVersion}*  •  by *${config.ownerName}*        ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭─〔 📋 *ESTADO* 〕
│ • ${saludo}
│ • 📅 ${fecha}  •  🕐 ${hora} *(Perú)*
│ • ⚙️ Prefijo: \`${config.prefix}\`  •  📡 ${modoBot}
│ • ⏱️ Uptime: ${formatUptime(upSec)}
╰──────────────────────⬣

╭─〔 📊 *TU PERFIL* 〕
│ • ${userTag}  •  ${rango}
│ • ⚡ Nivel: *${userData.level}*  ✨ XP: *${userData.xp}*/${nextXP}
│   [${bar}]${premiumContador}
│ • 👥 Usuarios: ${stats.totalUsers}  ⭐ Premium: ${stats.premiumUsers}
╰──────────────────────⬣

${(() => {
  const dios = getDiosUsers();
  if (!dios.length) return "";
  const lista = dios.map(n => "│ 🔱 " + n).join("\n");
  return "╭─〔 🔱 *DIOS RAGE* 〕\n" + lista + "\n╰──────────────────────⬣\n\n";
})()}╭─〔 🔧 *GENERALES* 〕
│ • \`${config.prefix}menu\` → Este menú
│ • \`${config.prefix}ping\` → Latencia del bot
│ • \`${config.prefix}info\` → Info del bot
│ • \`${config.prefix}uptime\` → Tiempo activo
│ • \`${config.prefix}creador\` → Info del creador
│ • \`${config.prefix}reporte [error]\` → Reportar bug 🐛
│ • \`${config.prefix}ticket [asunto]\` → Abrir ticket 🎫
│ • \`${config.prefix}cerrarticket\` → Cerrar tu ticket 🔒
╰──────────────────────⬣

╭─〔 🗂️ *SUBMENÚS* 〕
│ • \`${config.prefix}menubusqueda\` → Búsqueda & Utilidades 🔍
│ • \`${config.prefix}menustickers\` → Stickers 🎨
│ • \`${config.prefix}menumusica\` → Música & Efectos 🎵
│ • \`${config.prefix}menudiversion\` → Diversión & Reacciones 🎲
│ • \`${config.prefix}menunsfw\` → NSFW 🔞
│ • \`${config.prefix}menujuegos\` → Juegos 🎮
│ • \`${config.prefix}menugaming\` → Gaming (ML/FF/PUBG/más) 🕹️
│ • \`${config.prefix}menurpg\` → RPG ⚔️
│ • \`${config.prefix}menudescargas\` → Descargas 📥
│ • \`${config.prefix}menuadm\` → Admin de grupo ⚙️
${isOwner ? `│ • \`${config.prefix}menuowner\` → Owner 👑` : ""}
╰──────────────────────⬣

╭─〔 💎 *PREMIUM* 〕
│ • \`${config.prefix}menupremium\` → Comandos premium ⭐
│ • \`${config.prefix}adqpremium\` → Planes y precios 💰
│
│ 🤖 *SUB-BOTS*
│ • \`${config.prefix}subbot add [num]\` → Registrar sub-bot ➕
│ • \`${config.prefix}subbot list\` → Ver sub-bots activos 📋
│ • \`${config.prefix}subbot remove [num]\` → Eliminar sub-bot ❌
│ _(Requiere plan 👑 King o 🔱 Dios)_
╰──────────────────────⬣

╭─〔 🌐 *REDES & CONTACTO* 〕
│ 📢 *Canal WhatsApp:*
│ ${COMMUNITY_LINK}
│
│ ▶️ *YouTube:*
│ https://youtube.com/@androidsmithmod
│
│ 👑 *Creadores:*
│ • Zemo → wa.me/51917611323
│ • Smith → wa.me/51921909260
╰──────────────────────⬣

▸ © *PRAGMATA BOT v${config.botVersion}*
▸ ® *Zemo & Smith*
▸ _Todos los derechos reservados_`;

      // ── Sello PragmaBot (cita visual verificada) ────────
      const selloPragma = {
        key: { fromMe: false, participant: "0@s.whatsapp.net" },
        message: {
          extendedTextMessage: {
            text: `🌐🖤 𝑷𝑹𝑨𝑮𝑴𝑨𝑻𝑨 𝑩𝑶𝑻 — Sistema ArcadiaCorp\n> "${saludo}… el sistema registró tu presencia."`,
            title: null,
            thumbnailUrl: null,
          },
        },
      };

      // ── Enviar imagen con caption corto ──────────────────
      try {
        const bannerPath = join(__dirname, "../../assets/menu-banner.png");
        const bannerBuffer = await readFile(bannerPath);
        await sock.sendMessage(from, {
          image: bannerBuffer,
          caption:
            `⚡ *PRAGMATA BOT v${config.botVersion}* ⚡\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `${saludo}, *@${sender.split("@")[0]}*\n` +
            `📅 ${fecha}  🕐 ${hora}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `${userTag}  |  ${rango}\n` +
            `⚡ Nivel: *${userData.level}*  ✨ XP: *${userData.xp}*/${nextXP}\n` +
            `[${bar}]` +
            (isPremium || isOwner ? `\n💎 Premiums año: *${premiumsAnio}/12*` : ""),
          mentions: [sender],
        }, { quoted: selloPragma });
      } catch (e) {
        console.error("[MENU] Error enviando banner:", e.message);
      }

      // ── Enviar menú completo con sello ────────────────────
      await sock.sendMessage(from, { text: menu.trim() }, { quoted: selloPragma });
    },
  },

  {
    name: "ping",
    alias: ["speed", "velocidad"],
    description: "Latencia del bot",
    category: "General",
    freeAllowed: true,
    execute: async ({ reply, react }) => {
      const start = Date.now();
      await react("🏓");
      const ms = Date.now() - start;
      const estado = ms < 100 ? "🟢 Excelente" : ms < 300 ? "🟡 Normal" : "🔴 Lento";
      await reply(`🏓 *Pong!*\n━━━━━━━━━━━━━━\n📡 Latencia: *${ms}ms*\n📶 Estado: ${estado}`);
    },
  },

  {
    name: "info",
    alias: ["about", "bot"],
    description: "Información del bot",
    category: "General",
    freeAllowed: true,
    execute: async ({ reply }) => {
      const { fecha, hora } = getDateTime();
      const stats = getStats();
      await reply(
        `🤖 *${config.botName}*\n━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 Versión: ${config.botVersion}\n` +
        `⚙️  Prefijo: \`${config.prefix}\`\n` +
        `📚 Motor: Baileys + Node.js\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👑 Creador: ${config.ownerName}\n` +
        `📞 Contacto: +${config.ownerNumber}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👥 Usuarios: ${stats.totalUsers}\n` +
        `⭐ Premium: ${stats.premiumUsers}\n` +
        `📅 Fecha: ${fecha}\n` +
        `🕐 Hora: ${hora}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🌐 Comunidad:\n${COMMUNITY_LINK}`
      );
    },
  },

  {
    name: "uptime",
    alias: ["tiempo", "runtime"],
    description: "Tiempo activo del bot",
    category: "General",
    freeAllowed: true,
    execute: async ({ reply }) => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      await reply(`⏱️ *PRAGMATA BOT activo hace:*\n━━━━━━━━━━━━━━\n${formatUptime(seconds)}\n[${uptimeBar(seconds)}]`);
    },
  },

  {
    name: "creador",
    alias: ["owner", "dueño", "dev"],
    description: "Info del creador",
    category: "General",
    freeAllowed: true,
    execute: async ({ reply, isOwner }) => {
      if (isOwner) {
        await reply(`👑 *¡Bienvenido de vuelta, jefe!* 🔥\n\nTienes acceso completo a PRAGMATA BOT.\nTodos los comandos están a tu disposición.`);
      } else {
        await reply(
          `👑 *Creador de PRAGMATA BOT*\n━━━━━━━━━━━━━━\n📞 +${config.ownerNumber}\n\n` +
          `⭐ ¿Quieres *Premium*? Contáctalo.\n\n🌐 Comunidad:\n${COMMUNITY_LINK}`
        );
      }
    },
  },

  {
    name: "bpremium",
    alias: ["premium", "vippremium", "beneficios"],
    description: "Ver beneficios del Premium",
    category: "General",
    freeAllowed: true,
    execute: async ({ reply, react }) => {
      await react("⭐");
      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃   ⭐ *PRAGMATA BOT PREMIUM* ⭐   ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        "╭─〔 📊 *VENTAJAS RPG & XP* 〕\n" +
        "│ • +15 XP por comando (vs 10 normal)\n" +
        "│ • Más monedas en juegos RPG\n" +
        "│ • Subida de nivel más rápida\n" +
        "╰──────────────────────⬣\n\n" +
        "╭─〔 🛠️ *COMANDOS EXCLUSIVOS* 〕\n" +
        "│ • Acceso anticipado a nuevos comandos\n" +
        "│ • Soporte prioritario del creador\n" +
        "╰──────────────────────⬣\n\n" +
        "╭─〔 💳 *ADQUIRIR PREMIUM* 〕\n" +
        "│ • Zemo: wa.me/51917611323\n" +
        "│ • Smith: wa.me/51921909260\n" +
        "╰──────────────────────⬣"
      );
    },
  },

  // ── Reporte de errores ─────────────────────
  {
    name: "reporte",
    alias: ["bug", "error", "reportar"],
    description: "Reporta un error o fallo de un comando",
    category: "General",
    freeAllowed: true,
    execute: async ({ sock, reply, react, sender, text, msg }) => {
      if (!text) {
        return reply(
          "🐛 *REPORTAR ERROR*\n━━━━━━━━━━━━━━\n" +
          "Describe el error que encontraste.\n\n" +
          "Uso: `!reporte [descripción]`\n" +
          "Ejemplo: `!reporte el comando !clima no responde`"
        );
      }
      await react("📨");
      const numero = sender.split("@")[0];
      const fecha = new Date().toLocaleString("es-PE", { timeZone: "America/Lima" });
      const reporte =
        "🐛 *NUEVO REPORTE DE ERROR*\n" +
        "━━━━━━━━━━━━━━\n" +
        "👤 Usuario: @" + numero + "\n" +
        "📱 JID: `" + sender + "`\n" +
        "📅 Fecha: " + fecha + "\n" +
        "━━━━━━━━━━━━━━\n" +
        "📝 *Descripción:*\n" + text;

      const destinatarios = [
        config.ownerNumber + "@s.whatsapp.net",
        ...(config.subCreators || []).map((n) => n.replace(/[^0-9]/g, "") + "@s.whatsapp.net"),
      ];

      let enviado = false;
      for (const jid of destinatarios) {
        try {
          await sock.sendMessage(jid, { text: reporte, mentions: [sender] });
          enviado = true;
        } catch (e) {
          console.error("[REPORTE] No se pudo enviar a " + jid + ":", e.message);
        }
      }

      if (enviado) {
        await reply(
          "✅ *¡Reporte enviado!*\n━━━━━━━━━━━━━━\n" +
          "📨 Tu reporte fue enviado al creador.\n" +
          "🔧 Será revisado lo antes posible.\n\n" +
          "📝 *Tu reporte:*\n" + text
        );
      } else {
        await reply("❌ No se pudo enviar el reporte. Contacta al creador manualmente:\n📞 wa.me/" + config.ownerNumber);
      }
    },
  },

  // ── Sub-menú ADMIN ──────────────────────────
  {
    name: "menuadm", alias: ["menuadmin","madm"],
    description: "Ver todos los comandos de administración de grupos",
    category: "Grupos",
    freeAllowed: true,
    execute: async ({ sock, from, msg }) => {
      const p = config.prefix;
      const menu =
`╭─〔 ⚙️ *MENÚ ADMINISTRACIÓN* 〕
├──────────────────────
│ 👥 *GRUPOS*
│ • \`${p}everyone\` → Mencionar a todos
│ • \`${p}ginfo\` → Info del grupo
│ • \`${p}id\` → ID del chat
│ • \`${p}sorteo [@]\` → Elegir ganador 🏆
│ • \`${p}pareja\` → Pareja aleatoria 💕
├──────────────────────
│ 🛡️ *MODERACIÓN*
│ • \`${p}ban [@u]\` → Expulsar usuario
│ • \`${p}add [núm]\` → Agregar al grupo
│ • \`${p}promote [@u]\` → Hacer admin ⬆️
│ • \`${p}demote [@u]\` → Quitar admin ⬇️
│ • \`${p}warn [@u]\` → Advertir usuario
├──────────────────────
│ 🔧 *CONFIGURACIÓN*
│ • \`${p}mute\` → Silenciar grupo
│ • \`${p}unmute\` → Abrir grupo
│ • \`${p}gtitle [nom]\` → Cambiar nombre
│ • \`${p}gdesc [txt]\` → Cambiar descripción
│ • \`${p}antilink on/off\` → Antilink grupos WhatsApp 🔗
│ • \`${p}antired [red] on/off\` → Antilink por red social 📵
│ • \`${p}antired estado\` → Ver redes bloqueadas 📋
│ • \`${p}welcome on/off\` → Bienvenida automática 👋
│ • \`${p}antiver\` → Revelar fotos/videos ocultos 👁️
╰──────────────────────⬣`;
      await sock.sendMessage(from, { text: menu }, { quoted: msg });
    },
  },

  // ── Sub-menú DESCARGAS ───────────────────────
  {
    name: "menudescargas", alias: ["menudl","mdl"],
    description: "Ver todos los comandos de descarga",
    category: "Descargas",
    freeAllowed: true,
    execute: async ({ sock, from, msg }) => {
      const p = config.prefix;
      const menu =
`╭─〔 📥 *MENÚ DESCARGAS* 〕
├──────────────────────
│ 🎬 *VIDEO*
│ • \`${p}ytvideo [url/nombre]\` → YouTube 🎬
│ • \`${p}tiktok [url]\` → TikTok 🎵
│ • \`${p}fbvideo [url]\` → Facebook 📘
│ • \`${p}ig [url]\` → Instagram 📸
├──────────────────────
│ 🖼️ *FOTO*
│ • \`${p}ttfoto [url]\` → Foto de TikTok
│ • \`${p}igstory [usuario]\` → Historias de Instagram
├──────────────────────
│ 📦 *ARCHIVOS*
│ • \`${p}mediafire [url]\` → Archivo de Mediafire
│ • \`${p}play [nombre]\` → Audio de YouTube 🎵
│ • \`${p}playurl [url]\` → Audio desde URL
╰──────────────────────⬣`;
      await sock.sendMessage(from, { text: menu }, { quoted: msg });
    },
  },

  // ── Sub-menú JUEGOS ──────────────────────────
  {
    name: "menujuegos", alias: ["mjuegos","mgames"],
    description: "Ver todos los comandos de juegos",
    category: "Juegos",
    execute: async ({ sock, from, msg }) => {
      const p = config.prefix;
      const menu =
`╭─〔 🎮 *MENÚ JUEGOS* 〕
├──────────────────────
│ 🕹️ *MINIJUEGOS*
│ • \`${p}ahorcado\` → Ahorcado 🔤
│ • \`${p}adivina\` → Adivina el número 🔢
│ • \`${p}suitpvp @usuario\` → Batalla PvP ⚔️
│ • \`${p}voa\` → Verdad o reto 🎮
│ • \`${p}dado [caras]\` → Tira un dado 🎲
│ • \`${p}moneda\` → Cara o sello 🪙
│ • \`${p}8ball [preg]\` → La bola mágica 🎱
│ • \`${p}ship [@] [@]\` → % de amor 💘
├──────────────────────
│ 🎮 *GAMING INFO*
│ • \`${p}mlbb\` → Mobile Legends (beta)
│ • \`${p}freef\` → Free Fire (coming soon)
├──────────────────────
│ ⚔️ *RPG*
│ • \`${p}menurpg\` → Ver todos los comandos RPG
╰──────────────────────⬣`;
      await sock.sendMessage(from, { text: menu }, { quoted: msg });
    },
  },

  // ── Sub-menú RPG ─────────────────────────────
  {
    name: "menurpg", alias: ["mrpg"],
    description: "Ver todos los comandos RPG",
    category: "RPG",
    freeAllowed: true,
    execute: async ({ sock, from, msg }) => {
      const p = config.prefix;
      const menu =
`╭─〔 ⚔️ *MENÚ RPG* 〕
├──────────────────────
│ 🧙 *PERSONAJE*
│ • \`${p}rpgregistro [clase]\` → Crear personaje
│ • \`${p}rpgperfil\` → Ver stats
│ • \`${p}rpgtop\` → Ranking de jugadores
├──────────────────────
│ 🎭 *CLASES — Ver detalles*
│ • \`${p}rpgguerrero\` → ⚔️ Caballero
│ • \`${p}rpgmago\` → 🧙 Mago
│ • \`${p}rpgarquero\` → 🏹 Arquero
│ • \`${p}rpgasesino\` → 🗡️ Asesino
│ • \`${p}rpgsacerdote\` → ✨ Sacerdote
│ • \`${p}rpgpaladin\` → 🛡️ Paladín
│ • \`${p}rpgnigromante\` → 💀 Nigromante
├──────────────────────
│ ⚔️ *COMBATE*
│ • \`${p}rpgatascar @usuario\` → Batallar
│ • \`${p}rpgduelo @u [oro]\` → Duelo con apuesta
│ • \`${p}rpgexplorar [zona]\` → Explorar zona
│ • \`${p}rpghabilidad\` → Ver tus 3 habilidades
│ • \`${p}rpghabilidad [1/2/3]\` → Usar habilidad
│ • \`${p}rpgmision\` → Ver misiones del día
│ • \`${p}rpgmision reclamar\` → Cobrar recompensas
├──────────────────────
│ 🐾 *MASCOTAS*
│ • \`${p}rpgmascota tienda\` → Ver mascotas disponibles
│ • \`${p}rpgmascota comprar [nombre]\` → Comprar mascota
│ • \`${p}rpgmascota equipar [nombre]\` → Equipar mascota
├──────────────────────
│ 🐉 *JEFE ACTIVO*
│ • \`${p}rpgboss status\` → Ver estado del jefe
│ • \`${p}rpgboss atacar\` → Atacar al jefe
│ • \`${p}eventostatus\` → Ver eventos activos
├──────────────────────
│ 🏰 *DUNGEON*
│ • \`${p}rpgdungeon\` → Ver estado / info
│ • \`${p}rpgdungeon entrar\` → Iniciar dungeon (1/día)
│ • \`${p}rpgdungeon atacar\` → Atacar enemigo del piso
│ • \`${p}rpgdungeon revivir\` → Revivir (100💎)
│ • \`${p}rpgdungeon huir\` → Abandonar
├──────────────────────
│ 🏪 *ECONOMÍA*
│ • \`${p}rpgtienda\` → Tienda del RPG
│ • \`${p}rpgcomprar [item]\` → Comprar item
│ • \`${p}rpginventario\` → Ver inventario
│ • \`${p}rpgequipar [item]\` → Equipar item
│ • \`${p}rpgusar [pocion]\` → Usar poción
├──────────────────────
│ 🏰 *CLANES*
│ • \`${p}rpgclan\` → Panel del clan
│ • \`${p}rpgclan crear [nombre]\` → Crear clan
│ • \`${p}rpgclan guerra [clan]\` → Declarar guerra
│ • \`${p}rpgclan top\` → Ranking de clanes
├──────────────────────
│ 🏦 *BANCO DEL CLAN*
│ • \`${p}donarclanoro [cantidad]\` → Donar oro al clan
│ • \`${p}donarclanxp [cantidad]\` → Donar XP al clan
│ • \`${p}retiraroro [cantidad]\` → Retirar oro (líder)
│ • \`${p}retirarxp [cantidad]\` → Retirar XP (líder)
├──────────────────────
│ 🎁 *INTERCAMBIO & MERCADO*
│ • \`${p}daritem @u [item]\` → Regalar ítem
│ • \`${p}rpgmercado ver\` → Ver mercado
│ • \`${p}rpgmercado vender [item] [precio]\` → Vender
│ • \`${p}rpgmercado comprar [ID]\` → Comprar
│ • \`${p}rpgmercado mis\` → Tus publicaciones
├──────────────────────
│ 🎮 *SOCIAL*
│ • \`${p}robar @u\` → Robar XP 🦹
│ • \`${p}trabajar\` → Ganar XP (2h) 💼
│ • \`${p}diario\` → Recompensa diaria 🎁
├──────────────────────
│ 🌿 *ACTIVIDADES* (cooldown 2h)
│ • \`${p}rpgpesca\` → 🎣 Pescar
│ • \`${p}rpgcaza\` → 🏹 Cazar
│ • \`${p}rpgminar\` → ⛏️ Minar
│ • \`${p}rpgtalar\` → 🪓 Talar
├──────────────────────
│ ⚔️ *ARENA PvP*
│ • \`${p}rpgarena\` → Ver tus stats
│ • \`${p}rpgarena @u\` → Retar jugador
│ • \`${p}rpgarena top\` → Ranking arena
├──────────────────────
│ 💎 *GACHA*
│ • \`${p}rpggemas [cant]\` → Comprar gemas (80💰=5💎)
│ • \`${p}gachamascota\` → 🐲 Banner Dragón Ancestral
│ • \`${p}gachamascota x1\` → Tirada x1 (10💎)
│ • \`${p}gachamascota x10\` → Tirada x10 (500💎)
│ • \`${p}gachaarmadura\` → 🖤 Banner Caballero Oscuro
│ • \`${p}gachaarmadura x1\` → Tirada x1 (10💎)
│ • \`${p}gachaarmadura x10\` → Tirada x10 (500💎)
╰──────────────────────⬣`;
      await sock.sendMessage(from, { text: menu }, { quoted: msg });
    },
  },

  // ── Sub-menú OWNER ───────────────────────────
  {
    name: "menuowner", alias: ["mowner","mown"],
    description: "Ver todos los comandos de owner",
    category: "Owner",
    ownerOnly: true,
    execute: async ({ sock, from, msg }) => {
      const p = config.prefix;
      const menu =
`╭─〔 👑 *MENÚ OWNER* 〕
├──────────────────────
│ ⭐ *PREMIUM*
│ • \`${p}addpremium [@u]\` → Dar premium
│ • \`${p}removepremium [@u]\` → Quitar premium
│ • \`${p}listpremium\` → Lista premium
│ • \`${p}setplan [@u] [plan]\` → Asignar plan 💎
│   _plata | dorado | king | dios_
├──────────────────────
│ ✨ *XP & NIVELES*
│ • \`${p}addxp [@u] [n]\` → Dar XP
│ • \`${p}removexp [@u] [n]\` → Quitar XP
│ • \`${p}resetxp\` → Reiniciar todo el XP
├──────────────────────
│ ⚔️ *RPG ADMIN*
│ • \`${p}rpgdarexp [@u] [n]\` → Dar EXP
│ • \`${p}rpgdaroro [@u] [n]\` → Dar oro
│ • \`${p}rpgquitarexp [@u] [n]\` → Quitar EXP
│ • \`${p}rpgquitaroro [@u] [n]\` → Quitar oro
├──────────────────────
│ 🌟 *EVENTOS RPG*
│ • \`${p}eventoxp [horas] [mult]\` → XP doble
│ • \`${p}eventooro [horas] [mult]\` → Oro doble
│ • \`${p}eventodrop [horas]\` → Drop x2
│ • \`${p}eventoinvasion [horas]\` → Invasión oscura
│ • \`${p}eventoapagar\` → Desactivar eventos
│ • \`${p}eventostatus\` → Ver activos
├──────────────────────
│ 🐉 *JEFES RPG*
│ • \`${p}rpgbossactivar [1-5]\` → Invocar jefe
│ • \`${p}rpgboss status\` → Estado del jefe
│ • \`${p}rpgbossapagar\` → Eliminar jefe
├──────────────────────
│ 🤖 *BOT*
│ • \`${p}reiniciar\` → Reiniciar bot ♻️
│ • \`${p}broadcast <msg>\` → Grupos 📢\n│ • \`${p}broadcast todos <msg>\` → Grupos+Chats 📢\n│ • \`${p}broadcast chats <msg>\` → Solo chats 📢
│ • \`${p}botinfo\` → Info sistema
│ • \`${p}eval [code]\` → Ejecutar JS 💻
│ • \`${p}block [@u]\` → Bloquear
│ • \`${p}unblock [@u]\` → Desbloquear
│ • \`${p}jid [@u]\` → Ver JID
│ • \`${p}userinfo [@u]\` → Info usuario
│ • \`${p}leave\` → Salir del grupo 🚪
│ • \`${p}join [enlace]\` → Unirse a grupo 🔗
├──────────────────────
│ 🎰 *LOTERÍA & RANKING*
│ • \`${p}loteria\` → Sortear premium 1 semana 🎰
│ • \`${p}rankingsemanal\` → Enviar ranking top10 🏆
├──────────────────────
│ 🎫 *TICKETS*
│ • \`${p}tickets\` → Ver tickets abiertos
│ • \`${p}rticket [id] [resp]\` → Responder ticket
│ • \`${p}cerrarticket [id]\` → Cerrar ticket
╰──────────────────────⬣`;
      await sock.sendMessage(from, { text: menu }, { quoted: msg });
    },
  },


  // ── Sub-menú BÚSQUEDA & UTILIDADES ─────────
  {
    name: "menubusqueda", alias: ["mbusqueda","mbuscar"],
    description: "Búsqueda y utilidades",
    category: "Búsqueda",
    execute: async ({ sock, from, msg }) => {
      const p = config.prefix;
      const menu =
`╭─〔 🔍 *BÚSQUEDA & UTILIDADES* 〕
├──────────────────────
│ 🔍 *BÚSQUEDA*
│ • \`${p}google [tema]\` → Google
│ • \`${p}imagen [tema]\` → Imágenes 🖼️
│ • \`${p}anime [nombre]\` → Info anime 🎌
│ • \`${p}pelicula [nombre]\` → Películas 🎬
│ • \`${p}pinterest [tema]\` → Pinterest 📌
│ • \`${p}wiki [tema]\` → Wikipedia
│ • \`${p}yt [video]\` → YouTube
│ • \`${p}acortador [url]\` → Acortar URL 🔗
├──────────────────────
│ 🛠️ *UTILIDADES*
│ • \`${p}clima [ciudad]\` → Clima 🌤️
│ • \`${p}calc [oper]\` → Calculadora 🔢
│ • \`${p}horoscopo\` → Horóscopo ♈
├──────────────────────
│ 📊 *NIVELES & XP*
│ • \`${p}perfil\` → Tu nivel y XP
│ • \`${p}top\` → Top 10 usuarios
│ • \`${p}misxp\` → Stats del bot
│ • \`${p}mlbb\` → Mobile Legends
╰──────────────────────⬣`;
      await sock.sendMessage(from, { text: menu }, { quoted: msg });
    },
  },

  // ── Sub-menú STICKERS ────────────────────────
  {
    name: "menustickers", alias: ["mstickers","mstick"],
    description: "Ver todos los comandos de stickers",
    category: "Stickers",
    freeAllowed: true,
    execute: async ({ sock, from, msg }) => {
      const p = config.prefix;
      const menu =
`╭─〔 🎨 *MENÚ STICKERS* 〕
├──────────────────────
│ 🖼️ *CREAR*
│ • \`${p}sticker\` → Imagen/video → sticker
│ • \`${p}stext [txt]\` → Sticker de texto
│ • \`${p}sanim [txt]\` → Sticker animado
├──────────────────────
│ 🔄 *CONVERTIR*
│ • \`${p}toimg\` → Sticker → imagen
│ • \`${p}stickervid\` → Sticker → video
╰──────────────────────⬣`;
      await sock.sendMessage(from, { text: menu }, { quoted: msg });
    },
  },

  // ── Sub-menú MÚSICA & EFECTOS ────────────────
  {
    name: "menumusica", alias: ["mmusica","mmusic"],
    description: "Música y efectos de audio",
    category: "Música",
    execute: async ({ sock, from, msg }) => {
      const p = config.prefix;
      const menu =
`╭─〔 🎵 *MENÚ MÚSICA & EFECTOS* 〕
├──────────────────────
│ 🎵 *MÚSICA*
│ • \`${p}play [nombre]\` → Audio de YouTube
│ • \`${p}playurl [url]\` → Audio desde URL
├──────────────────────
│ 🎛️ *EFECTOS DE AUDIO*
│ • \`${p}bass\` → Bajo potenciado 🔊
│ • \`${p}nightcore\` → Nightcore 🌙
│ • \`${p}reverse\` → Reversa ⏪
│ • \`${p}robot\` → Voz de robot 🤖
│ • \`${p}earrape\` → Earrape 💥
│ • \`${p}fast\` → Rápido ⚡
│ • \`${p}slow\` → Lento 🐌
│ • \`${p}deep\` → Profundo 🌊
│ • \`${p}fat\` → Gordo 😂
│ • \`${p}smooth\` → Suave 🎶
│ • \`${p}tupai\` → Ardilla 🐿️
│ • \`${p}blown\` → Distorsionado 📻
╰──────────────────────⬣`;
      await sock.sendMessage(from, { text: menu }, { quoted: msg });
    },
  },

  // ── Sub-menú PREMIUM ─────────────────────────
  {
    name: "menupremium", alias: ["mpremium","vip"],
    description: "Ver todos los comandos premium",
    category: "Premium",
    freeAllowed: true,
    execute: async ({ sock, from, msg, isPremium, isOwner, sender }) => {
      console.log("MENUPREMIUM EJECUTADO", { isOwner, isPremium, sender });
      const p = config.prefix;
      const planesInfo = { plata:"🥈 Rage-Plata", dorado:"🥇 Rage-Dorado", king:"👑 King-Rage", dios:"🔱 Dios-Rage", creador:"🤖 Rage-Creador" };
      const plan = getPremiumPlan(sender);
      const planNombre = plan ? planesInfo[plan] : null;
      const user = getUser(sender);
      const expiry = user?.premiumExpiry ? new Date(user.premiumExpiry).toLocaleDateString("es-PE") : null;
      const tag = isOwner
        ? "👑 *CREADOR*"
        : isPremium
          ? `⭐ *PREMIUM* — ${planNombre || "Plan activo"}${expiry ? " · vence " + expiry : ""}`
          : "👤 Sin premium";
      const menu =
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  💎 *P R A G M A T A  P R E M I U M*  ┃
┃     *Comandos Exclusivos*     ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

┌─〔 📋 *TU ESTADO* 〕
│ • ${tag}
│ • ${isPremium || isOwner ? "✅ Tienes acceso a todos los comandos" : "❌ Adquiere premium con !adqpremium"}
└──────────────────────⬣

╭─〔 🤖 *IA & UTILIDADES* 〕
│ • \`${p}ocr\` → Extraer texto de imágenes 📷
│ • \`${p}qr [texto]\` → Generar código QR 🔲
│ • \`${p}pdf [url]\` → Convertir web a PDF 📄
│ • \`${p}moneda [cant] [de] [a]\` → Conversor divisas 💱
│ • \`${p}traducir [idioma] [texto]\` → Traductor IA 🌐
│ • \`${p}resumir\` → Resumir textos con IA 📋
│ • \`${p}imagen [desc]\` → Generar imagen IA 🎨
│ • \`${p}totext\` → Audio a texto 🎙️
╰──────────────────────⬣

╭─〔 🎨 *IMAGEN & STICKERS* 〕
│ • \`${p}meme [texto | texto]\` → Generar meme 😂
│ • \`${p}filtro [tipo]\` → Filtros a fotos 🖼️
│ • \`${p}fondo [color]\` → Cambiar fondo de imagen 🎨
│ • \`${p}collage\` → Unir varias fotos 🗂️
╰──────────────────────⬣

╭─〔 🎵 *MÚSICA* 〕
│ • \`${p}letra [canción]\` → Buscar letras 🎶
│ • \`${p}spotify [canción]\` → Info en Spotify 🎵
│ • \`${p}shazam\` → Identificar canción 🔍
╰──────────────────────⬣

╭─〔 🌐 *REDES & CLIMA* 〕
│ • \`${p}twitter [@usuario]\` → Ver perfil 🐦
│ • \`${p}clima [ciudad]\` → Clima detallado 🌤️
╰──────────────────────⬣

╭─〔 🎮 *JUEGOS PREMIUM* 〕
│ • \`${p}trivia\` → Preguntas y respuestas 🧠
│ • \`${p}wordle\` → Adivina la palabra 🟩
│ • \`${p}ruleta\` → Ruleta rusa 🔫
│ • \`${p}casino\` → Dados con monedas RPG 🎲
╰──────────────────────⬣

╭─〔 🎬 *MULTIMEDIA* 〕
│ • \`${p}voz [texto]\` → Texto a nota de voz 🎙️
│ • \`${p}deepfry\` → Efecto deep fry 🔥
│ • \`${p}blur\` → Desenfoque de imagen 🌫️
│ • \`${p}velocidad [x]\` → Cambiar velocidad audio ⚡
╰──────────────────────⬣

╭─〔 📊 *GRUPO* 〕
│ • \`${p}encuesta [preg | op1 | op2]\` → Poll 📊
│ • \`${p}stats\` → Estadísticas del grupo 📈
│ • \`${p}cumpleaños [@] [DD/MM]\` → Cumple 🎂
│ • \`${p}recordatorio [tiempo] [msg]\` → Aviso ⏰
╰──────────────────────⬣

╭─〔 🤖 *BOT CREADOR* 〕
│ • \`${p}creador\` → Solicitar bot personalizado 🤖
│ • \`${p}micreador\` → Ver detalles de tu bot 📋
╰──────────────────────⬣

▸ 💎 Planes: \`${p}adqpremium\`
▸ © *PRAGMATA BOT v${config.botVersion}* — by *Zemo & Smith*`;
      const { join } = await import("path");
      const { readFile } = await import("fs/promises");
      const { fileURLToPath } = await import("url");
      const __dirname2 = fileURLToPath(new URL(".", import.meta.url));
      const bannerPath = join(__dirname2, "../../assets/banner-menupremium.png");
      try {
        const img = await readFile(bannerPath);
        await sock.sendMessage(from, { image: img, mimetype: "image/png" }, { quoted: msg });
        await sock.sendMessage(from, { text: menu });
      } catch (e) {
        await sock.sendMessage(from, { text: menu }, { quoted: msg });
      }
    },
  },

  // ── Sub-menú ADQ-PREMIUM ──────────────────
  {
    name: "adqpremium", alias: ["adquirir","comprar","planes","adqprem"],
    description: "Información para adquirir premium",
    category: "Premium",
    freeAllowed: true,
    execute: async ({ sock, from, msg }) => {
      const PEN_USD = 0.27;
      const menu =
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 *ADQUIERE TU PREMIUM*  👑  ┃
┃       *PRAGMATA BOT v${config.botVersion}*        ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭─〔 🎟️ *RAGE-SEMANAL* 〕
│ • ⏳ Duración: *7 días*
│ • 💰 Precio: *S/. 1.50* (~$${(1.5 * PEN_USD).toFixed(2)} USD)
│ • ✅ Acceso básico a comandos premium
│ • 📊 *10 usos premium por día*
│ • ✅ XP bonus leve
╰──────────────────────⬣

╭─〔 🥈 *RAGE-PLATA* 〕
│ • ⏳ Duración: *15 días*
│ • 💰 Precio: *S/. 3.00* (~$${(3 * PEN_USD).toFixed(2)} USD)
│ • ✅ Acceso a comandos premium
│ • 📊 *15 usos premium por día*
│ • ✅ XP bonus en cada comando
╰──────────────────────⬣

╭─〔 🥇 *RAGE-DORADO* 〕
│ • ⏳ Duración: *1 mes*
│ • 💰 Precio: *S/. 6.00* (~$${(6 * PEN_USD).toFixed(2)} USD)
│ • ✅ Todo el plan Rage-Plata
│ • 📊 *30 usos premium por día*
│ • ⚔️ +50% XP en RPG
│ • 💰 +30% Oro en RPG
│ • ⭐ Bonus en todas las batallas
╰──────────────────────⬣

╭─〔 👑 *KING-RAGE* 〕
│ • ⏳ Duración: *1 mes*
│ • 💰 Precio: *S/. 10.00* (~$${(10 * PEN_USD).toFixed(2)} USD)
│ • ✅ Todo el plan Rage-Dorado
│ • 📊 *60 usos premium por día*
│ • 🤖 *!subbot* — agrega 1 sub-bot
│ • 🔓 Acceso a *todos los comandos* (menos Owner)
│ • 🌟 Tu *nombre y redes* en el menú principal
│ • 🎖️ Badge exclusivo KING en tu perfil
╰──────────────────────⬣

╭─〔 🔱 *DIOS-RAGE* 〕
│ • ⏳ Duración: *1 mes*
│ • 💰 Precio: *S/. 15.00* (~$${(15 * PEN_USD).toFixed(2)} USD)
│ • ✅ Todo el plan King-Rage
│ • ♾️ *USOS ILIMITADOS*
│ • 🤖 *!subbot* — agrega hasta 3 sub-bots
│ • 👑 Acceso a *TODOS los comandos* (incluye Owner)
│ • 🛠️ *Elige el comando que quieras*
│ • 📛 *Tus créditos* en ese comando
│ • 👾 Diseño personalizado en tu perfil
╰──────────────────────⬣

╭─〔 🤖 *RAGE-CREADOR* 〕
│ • ⏳ Duración: *1 mes*
│ • 💰 Precio: *S/. 25.00* (~$${(25 * PEN_USD).toFixed(2)} USD)
│ • ✅ Todo el plan Dios-Rage
│ • 🤖 *BOT PERSONALIZADO* a tu gusto
│ • 🎨 Nombre, prefijo y apariencia única
│ • ⚙️ Comandos configurados según tus gustos
│ • 🌟 Soporte directo del creador
│ • ♾️ *USOS ILIMITADOS* en todo
╰──────────────────────⬣

╭─〔 📲 *CONTACTO / COMPRA* 〕
│ 👑 *Zemo (Owner)*
│ • 📞 wa.me/51917611323
│
│ 🛠️ *Smith (Sub-creador)*
│ • 📞 wa.me/51921909260
╰──────────────────────⬣

╭─〔 📋 *¿CÓMO COMPRAR?* 〕
│ 1️⃣ Escríbenos al contacto de arriba
│ 2️⃣ Indica tu número y el plan
│ 3️⃣ Realiza el pago y envía captura
│ 4️⃣ ¡Tu premium se activa al instante! ✅
╰──────────────────────⬣

▸ 💎 Ver tu plan: \`!mipremium\`
▸ © *PRAGMATA BOT v${config.botVersion}* — *Zemo & Smith*`;
      // Imagen fija para todos
      const bannerPath = join(__dirname, "../../assets/banner-sinpremium.png");
      try {
        const img = await readFile(bannerPath);
        await sock.sendMessage(from, { image: img, mimetype: "image/png" }, { quoted: msg });
        await sock.sendMessage(from, { text: menu });
      } catch {
        await sock.sendMessage(from, { text: menu }, { quoted: msg });
      }
    },
  },

  // ── Sub-menú DIVERSIÓN & REACCIONES ─────────
  {
    name: "menudiversion", alias: ["mdiversion","mdiv"],
    description: "Diversión y reacciones",
    category: "Diversión",
    execute: async ({ sock, from, msg }) => {
      const p = config.prefix;
      const menu =
`╭─〔 🎲 *DIVERSIÓN & REACCIONES* 〕
├──────────────────────
│ 🎲 *DIVERSIÓN*
│ • \`${p}dado [caras]\` → Dado 🎲
│ • \`${p}moneda\` → Cara o sello 🪙
│ • \`${p}8ball [preg]\` → Bola mágica 🎱
│ • \`${p}ship [@] [@]\` → % de amor 💘
│ • \`${p}insulto\` → Destrucción verbal 💀
│ • \`${p}voa\` → Verdad o reto 🎮
│ • \`${p}ia [mensaje]\` → Chatear con IA 💬
│ • \`${p}iavoz [mensaje]\` → Respuesta en audio 🎙️
├──────────────────────
│ 💕 *SOCIALES*
│ • \`${p}kiss\` • \`${p}kisscheek\` • \`${p}hug\` • \`${p}pat\`
│ • \`${p}cuddle\` • \`${p}wink\` • \`${p}wave\` • \`${p}highfive\`
│ • \`${p}feed\` • \`${p}poke\` • \`${p}lick\` • \`${p}handhold\`
│ • \`${p}stare\` • \`${p}nom\` • \`${p}tickle\` • \`${p}greet\`
│ • \`${p}call\` • \`${p}clap\` • \`${p}love\` • \`${p}seduce\`
├──────────────────────
│ ⚔️ *ACCIÓN*
│ • \`${p}slap\` • \`${p}punch\` • \`${p}kick\` • \`${p}bite\`
│ • \`${p}shoot\` • \`${p}yeet\` • \`${p}kill\` • \`${p}push\`
│ • \`${p}step\` • \`${p}spit\` • \`${p}impregnate\` • \`${p}psycho\`
│ • \`${p}scream\`
├──────────────────────
│ 😄 *EMOCIONES*
│ • \`${p}cry\` • \`${p}laugh\` • \`${p}dance\` • \`${p}angry\`
│ • \`${p}happy\` • \`${p}sad\` • \`${p}blush\` • \`${p}think\`
│ • \`${p}sleep\` • \`${p}facepalm\` • \`${p}shrug\` • \`${p}bored\`
│ • \`${p}nod\` • \`${p}nope\` • \`${p}smug\` • \`${p}thumbsup\`
│ • \`${p}nervous\` • \`${p}panic\` • \`${p}pout\` • \`${p}woah\`
│ • \`${p}yawn\` • \`${p}confused\` • \`${p}scared\` • \`${p}shy\`
│ • \`${p}dramatic\` • \`${p}lewd\` • \`${p}bleh\`
├──────────────────────
│ 🎮 *ACTIVIDADES*
│ • \`${p}gaming\` • \`${p}draw\` • \`${p}sing\` • \`${p}smoke\`
│ • \`${p}drunk\` • \`${p}walk\` • \`${p}run\` • \`${p}jump\`
│ • \`${p}cold\` • \`${p}heat\` • \`${p}coffee\` • \`${p}cook\`
│ • \`${p}eat\` • \`${p}bath\`
╰──────────────────────⬣`;
      await sock.sendMessage(from, { text: menu }, { quoted: msg });
    },
  },

  // ── !mipremium — Ver estado de mi plan ────
  {
    name: "mipremium",
    alias: ["miplán", "miplan", "premium", "miprem"],
    description: "Ver tu plan premium actual y usos del día",
    category: "Premium",
    freeAllowed: true,
    execute: async ({ reply, react, sender }) => {
      await react("💎");
      const esPremium = isPremium(sender);
      if (!esPremium) {
        return reply(
          `╭─〔 💎 *MI PREMIUM* 〕
│ Estado: ❌ *Sin premium*
├──────────────────────
│ No tienes ningún plan activo.
│
│ 🎟️ Semanal  → S/. 1.50 (7 días)
│ 🥈 Plata    → S/. 3.00 (15 días)
│ 🥇 Dorado   → S/. 6.00 (1 mes)
│ 👑 King     → S/. 10.00 (1 mes)
│ 🔱 Dios     → S/. 15.00 (1 mes) ♾️
│ 🤖 Creador  → S/. 25.00 (1 mes) 🤖
├──────────────────────
│ 📞 Adquiere: +${config.ownerNumber}
│ 📋 Info: \`!adqpremium\`
╰──────────────────────⬣`
        );
      }

      const plan = getPremiumPlan(sender) || "plata";
      const planInfo = PLANES[plan];
      const lim = checkDailyLimit(sender);
      // No consumir el uso al consultar
      if (!lim.unlimited && lim.used > 0) {
        const { loadDB } = await import("../lib/database.js").then(m => m);
      }

      const planEmoji = {
        semanal: "🎟️", plata: "🥈", dorado: "🥇", king: "👑", dios: "🔱", creador: "🤖"
      }[plan] || "💎";

      const usosTexto = lim.unlimited
        ? "♾️ *Ilimitados*"
        : `*${(lim.used || 1) - 1}/${lim.limit}* usados hoy`;

      // Calcular días restantes
      const { loadDB: _load } = { loadDB: null };
      let diasRestantes = "?";
      try {
        const { readFileSync } = await import("fs");
        const { join: _join } = await import("path");
        // Intentar leer expiry desde la función que ya existe
        const modDb = await import("../lib/database.js");
        const user = modDb.getUser ? modDb.getUser(sender) : null;
        if (user?.premiumExpiry) {
          const diff = user.premiumExpiry - Date.now();
          diasRestantes = diff > 0 ? Math.ceil(diff / 86400000) : 0;
        }
      } catch {}

      await reply(
        `╭─〔 💎 *MI PREMIUM* 〕
│ Estado: ✅ *Activo*
│ ${planEmoji} Plan: *${planInfo?.nombre || plan.toUpperCase()}*
│ ⏳ Días restantes: *${diasRestantes}*
├──────────────────────
│ 📊 Usos hoy: ${usosTexto}
│ ⭐ XP Bonus: *x${planInfo?.xpBonus || 1}*
│ 💰 Oro Bonus: *x${planInfo?.oroBonus || 1}*
├──────────────────────
│ 🔄 Renovar: \`!adqpremium\`
│ 📞 Contacto: +${config.ownerNumber}
╰──────────────────────⬣`
      );
    },
  },

];
export default basicCommands;