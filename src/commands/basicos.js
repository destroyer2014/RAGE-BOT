// ═══════════════════════════════════════════
//     RAGE-BOT — src/commands/basicos.js
// ═══════════════════════════════════════════

import { formatUptime } from "../lib/utils.js";
import config from "../../config.js";
import { getStats, getUser, xpBar, xpForLevel } from "../lib/database.js";
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
    execute: async ({ sock, from, msg, reply, isOwner, isPremium, sender }) => {
      const { fecha, hora, saludo } = getDateTime();
      const upSec = Math.floor((Date.now() - startTime) / 1000);
      const stats = getStats();
      const modoBot = config.workInGroups && config.workInPrivate ? "🌐 Público"
        : config.workInGroups ? "👥 Solo grupos" : "🔒 Solo privado";
      const userTag = isOwner ? "👑 *CREADOR*" : isPremium ? "⭐ *PREMIUM*" : "👤 Usuario";

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
┃   ⚡ *R A G E - B O T* ⚡   ┃
┃   *v${config.botVersion}*  •  by *${config.ownerName}*        ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭─〔 🌐 *REDES & CONTACTO* 〕
│ 📢 *Canal WhatsApp:*
│ https://whatsapp.com/channel/0029VbADsUx6LwHo4wdirM0v
│
│ ▶️ *YouTube:*
│ https://youtube.com/@androidsmithmod
│
│ 👑 *Creadores:*
│ • Zemo → +51 917 611 323
│ • Smith → +51 921 909 260
╰──────────────────────⬣

╭─〔 📋 *ESTADO* 〕
│ • ${saludo}
│ • 📅 ${fecha}
│ • 🕐 ${hora} *(Perú)*
│ • 🟢 Activo  •  ⏱️ ${formatUptime(upSec)}
│ • ⚙️ Prefijo: \`${config.prefix}\`  •  📡 ${modoBot}
╰──────────────────────⬣

╭─〔 📊 *TU PERFIL* 〕
│ • ${userTag}  •  ${rango}
│ • ⚡ Nivel: *${userData.level}*  ✨ XP: *${userData.xp}*/${nextXP}
│   [${bar}]
│ • 👥 Usuarios: ${stats.totalUsers}  ⭐ Premium: ${stats.premiumUsers}
╰──────────────────────⬣

╭─〔 🔧 *GENERALES* 〕
│ • \`${config.prefix}menu\` → Este menú
│ • \`${config.prefix}ping\` → Latencia del bot
│ • \`${config.prefix}info\` → Info del bot
│ • \`${config.prefix}uptime\` → Tiempo activo
│ • \`${config.prefix}creador\` → Info del creador
│ • \`${config.prefix}reporte [error]\` → Reportar bug 🐛
│ • \`${config.prefix}ticket [asunto]\` → Abrir ticket 🎫
│ • \`${config.prefix}cerrarticket\` → Cerrar tu ticket 🔒
╰──────────────────────⬣

╭─〔 🎮 *GAMING* 〕
│ • \`${config.prefix}mlbb\` → Mobile Legends (beta)
│ • \`${config.prefix}freef\` → Free Fire (coming soon)
╰──────────────────────⬣

╭─〔 📊 *NIVELES & XP* 〕
│ • \`${config.prefix}perfil\` → Tu nivel y XP
│ • \`${config.prefix}misxp\` → Stats de bot (submenú)
│ • \`${config.prefix}top\` → Top 10 usuarios
╰──────────────────────⬣

╭─〔 🔍 *BÚSQUEDA* 〕
│ • \`${config.prefix}google [tema]\` → Buscar en Google
│ • \`${config.prefix}imagen [tema]\` → Buscar imágenes 🖼️
│ • \`${config.prefix}anime [nombre]\` → Info de anime 🎌
│ • \`${config.prefix}pelicula [nombre]\` → Buscar películas 🎬
│ • \`${config.prefix}pinterest [tema]\` → Buscar en Pinterest 📌
│ • \`${config.prefix}wiki [tema]\` → Wikipedia
│ • \`${config.prefix}yt [video]\` → Buscar en YouTube
│ • \`${config.prefix}acortador [url]\` → Acortar URL 🔗
╰──────────────────────⬣

╭─〔 🛠️ *UTILIDADES* 〕
│ • \`${config.prefix}clima [ciudad]\` → Clima actual 🌤️
│ • \`${config.prefix}calc [oper]\` → Calculadora 🔢
│ • \`${config.prefix}pokemon [nom]\` → Info Pokémon ⚡
│ • \`${config.prefix}horoscopo\` → Horóscopo del día ♈
╰──────────────────────⬣

╭─〔 🎨 *STICKERS* 〕
│ • \`${config.prefix}sticker\` → Imagen/video → sticker
│ • \`${config.prefix}toimg\` → Sticker → imagen
│ • \`${config.prefix}stickervid\` → Sticker → video
│ • \`${config.prefix}stext [txt]\` → Sticker de texto
│ • \`${config.prefix}sanim [txt]\` → Sticker animado
╰──────────────────────⬣

╭─〔 🎵 *MÚSICA* 〕
│ • \`${config.prefix}play [nombre]\` → Audio de YouTube
│ • \`${config.prefix}playurl [url]\` → Audio desde URL
╰──────────────────────⬣

╭─〔 ⚔️ *RPG* 〕
│ • \`${config.prefix}rpg\` → Menú RPG completo
│ • \`${config.prefix}rpgregistro [clase]\` → Crear personaje
│ • \`${config.prefix}rpgperfil\` → Ver stats
│ • \`${config.prefix}rpgexplorar [zona]\` → Explorar
│ • \`${config.prefix}rpgatascar @usuario\` → Batallar
│ • \`${config.prefix}rpgtienda\` → Tienda
│ • \`${config.prefix}rpgmision\` → Misión diaria
│ • \`${config.prefix}rpgclan\` → Clanes
│ • \`${config.prefix}rpgtop\` → Ranking
╰──────────────────────⬣

╭─〔 🎮 *JUEGOS* 〕
│ • \`${config.prefix}ahorcado\` → Ahorcado 🔤
│ • \`${config.prefix}adivina\` → Adivina el número 🔢
│ • \`${config.prefix}suitpvp @usuario\` → Batalla PvP ⚔️
╰──────────────────────⬣

╭─〔 🎵 *EFECTOS DE AUDIO* 〕
│ • \`${config.prefix}bass\` → Bajo potenciado 🔊
│ • \`${config.prefix}nightcore\` → Nightcore 🌙
│ • \`${config.prefix}reverse\` → Reversa ⏪
│ • \`${config.prefix}robot\` → Voz de robot 🤖
│ • \`${config.prefix}earrape\` → Earrape 💥
│ • \`${config.prefix}fast\` → Rápido ⚡
│ • \`${config.prefix}slow\` → Lento 🐌
│ • \`${config.prefix}deep\` → Profundo 🌊
│ • \`${config.prefix}fat\` → Gordo 😂
│ • \`${config.prefix}smooth\` → Suave 🎶
│ • \`${config.prefix}tupai\` → Ardilla 🐿️
│ • \`${config.prefix}blown\` → Distorsionado 📻
╰──────────────────────⬣

╭─〔 🎲 *DIVERSIÓN* 〕
│ • \`${config.prefix}dado [caras]\` → Tira un dado 🎲
│ • \`${config.prefix}moneda\` → Cara o sello 🪙
│ • \`${config.prefix}8ball [preg]\` → La bola mágica 🎱
│ • \`${config.prefix}ship [@] [@]\` → % de amor 💘
│ • \`${config.prefix}insulto\` → Destrucción verbal 💀
│ • \`${config.prefix}voa\` → Verdad o reto 🎮
╰──────────────────────⬣

╭─〔 🎭 *REACCIONES CON GIF* 〕
│ 💕 *Sociales:*
│ • \`${config.prefix}kiss\` • \`${config.prefix}hug\` • \`${config.prefix}pat\` • \`${config.prefix}cuddle\`
│ • \`${config.prefix}wink\` • \`${config.prefix}wave\` • \`${config.prefix}highfive\`
│ • \`${config.prefix}feed\` • \`${config.prefix}poke\` • \`${config.prefix}lick\`
│ • \`${config.prefix}handhold\` • \`${config.prefix}stare\` • \`${config.prefix}nom\`
│ ⚔️ *Agresivas:*
│ • \`${config.prefix}slap\` • \`${config.prefix}punch\` • \`${config.prefix}kick\`
│ • \`${config.prefix}bite\` • \`${config.prefix}shoot\` • \`${config.prefix}yeet\`
│ 😄 *Emociones:*
│ • \`${config.prefix}cry\` • \`${config.prefix}laugh\` • \`${config.prefix}dance\`
│ • \`${config.prefix}angry\` • \`${config.prefix}happy\` • \`${config.prefix}sad\`
│ • \`${config.prefix}blush\` • \`${config.prefix}think\` • \`${config.prefix}sleep\`
│ • \`${config.prefix}facepalm\` • \`${config.prefix}shrug\` • \`${config.prefix}bored\`
│ • \`${config.prefix}nod\` • \`${config.prefix}nope\` • \`${config.prefix}smug\`
│ • \`${config.prefix}thumbsup\`
│ • \`${config.prefix}reacciones\` → Ver lista completa 🎭

╭─〔 📱 *GRUPOS* 〕
│ • \`${config.prefix}everyone\` → Mencionar a todos
│ • \`${config.prefix}ginfo\` → Info del grupo
│ • \`${config.prefix}id\` → ID del chat
│ • \`${config.prefix}sorteo [@]\` → Elegir ganador 🏆
│ • \`${config.prefix}pareja\` → Pareja aleatoria 💕
╰──────────────────────⬣

╭─〔 ⚙️ *ADMIN GRUPO* 〕
│ • \`${config.prefix}ban [@u]\` → Expulsar usuario
│ • \`${config.prefix}add [núm]\` → Agregar al grupo
│ • \`${config.prefix}promote [@u]\` → Hacer admin ⬆️
│ • \`${config.prefix}demote [@u]\` → Quitar admin ⬇️
│ • \`${config.prefix}mute\` → Silenciar grupo
│ • \`${config.prefix}unmute\` → Abrir grupo
│ • \`${config.prefix}gtitle [nom]\` → Cambiar nombre
│ • \`${config.prefix}gdesc [txt]\` → Cambiar descripción
│ • \`${config.prefix}antilink\` → Activar/desactivar antilink 🔗
│ • \`${config.prefix}antiver\` → Revelar fotos/videos ocultos 👁️
│ • \`${config.prefix}warn [@u]\` → Advertir usuario
╰──────────────────────⬣

╭─〔 🔞 *NSFW — PREMIUM* 〕
${isPremium || isOwner
  ? `│ • \`${config.prefix}pack\` → Pack fotos 🥵⭐
│ • \`${config.prefix}pack2\` → Pack chicas 🥵⭐
│ • \`${config.prefix}pack3\` → Pack hombres 🥵⭐
│ • \`${config.prefix}videoxxx\` → Video XXX 🥵⭐
│ • \`${config.prefix}lesbi\` → Video lesbi 🥵⭐
│ • \`${config.prefix}pornovid\` → Video porno ⭐
│ • \`${config.prefix}pornovid2\` → Video porno 2 ⭐
│ • \`${config.prefix}vidgay\` → Video gay ⭐
│ • \`${config.prefix}vidbisexual\` → Video bisexual ⭐
│ • \`${config.prefix}vidrandom\` → Video random ⭐
│ • \`${config.prefix}bpremium\` → Ver beneficios premium ⭐
│ ─────────────────────
│ • \`${config.prefix}nwaifu\` → Waifu NSFW ⭐
│ • \`${config.prefix}nneko\` → Neko NSFW ⭐
│ • \`${config.prefix}nahegao\` → Ahegao NSFW ⭐
│ • \`${config.prefix}nrandom\` → NSFW aleatorio ⭐
│ ─────────────────────
│ • \`${config.prefix}hentai\` → Hentai 🔞⭐
│ • \`${config.prefix}hblowjob\` → Hentai BJ ⭐
│ • \`${config.prefix}hmilf\` → Hentai Milf ⭐
│ • \`${config.prefix}hrandom\` → Hentai aleatorio ⭐
│ ─────────────────────
│ • \`${config.prefix}pornofuck\` → Fuck GIF ⭐
│ • \`${config.prefix}pornomamada\` → Blowjob ⭐
│ • \`${config.prefix}pornopussy\` → Pussy ⭐
│ • \`${config.prefix}pornotetas2\` → Boobs ⭐
│ • \`${config.prefix}pornoanal\` → Anal ⭐
│ • \`${config.prefix}pornoass2\` → Ass ⭐
│ • \`${config.prefix}pornoneko\` → Neko lewd ⭐
│ • \`${config.prefix}porno4k\` → 4K ⭐
│ • \`${config.prefix}pornocum2\` → Cum GIF ⭐
│ • \`${config.prefix}pornosolo\` → Solo GIF ⭐
│ • \`${config.prefix}pornoass3\` → Ass 3 ⭐
│ • \`${config.prefix}pornotetas3\` → Boobs 3 ⭐
│ • \`${config.prefix}pornoanal2\` → Anal 2 ⭐
│ • \`${config.prefix}pornoanal3\` → Anal GIF ⭐
│ • \`${config.prefix}pornomamada2\` → Blowjob GIF ⭐
│ • \`${config.prefix}pornoneko2\` → Neko GIF ⭐
│ • \`${config.prefix}pornopussy2\` → Pussylick GIF ⭐
│ • \`${config.prefix}pornomuslo\` → Thighs ⭐
│ • \`${config.prefix}pornopies2\` → Feet ⭐
│ • \`${config.prefix}pornochica\` → Chica anime ⭐
│ • \`${config.prefix}pornopaizuri\` → Paizuri ⭐
│ • \`${config.prefix}pornoyaoi3\` → Yaoi ⭐`
  : `│ • 🔒 Exclusivo para usuarios *Premium*
│ • Contacta: wa.me/${config.ownerNumber}`
}
╰──────────────────────⬣
${isOwner
  ? `
╭─〔 👑 *OWNER / BOT* 〕
│ • \`${config.prefix}addpremium [@u]\` → Dar premium ⭐
│ • \`${config.prefix}removepremium\` → Quitar premium
│ • \`${config.prefix}listpremium\` → Lista premium
│ • \`${config.prefix}addxp [@u] [n]\` → Dar XP ✨
│ • \`${config.prefix}removexp [@u] [n]\` → Quitar XP 💔
│ • \`${config.prefix}resetxp\` → Reiniciar todo el XP 🔄
│ • \`${config.prefix}userinfo [@u]\` → Info usuario
│ • \`${config.prefix}reiniciar\` → Reiniciar bot ♻️
│ • \`${config.prefix}broadcast\` → Mensaje masivo 📢
│ • \`${config.prefix}botinfo\` → Info sistema
│ • \`${config.prefix}eval [code]\` → Ejecutar JS 💻
│ • \`${config.prefix}block [@u]\` → Bloquear 🚫
│ • \`${config.prefix}unblock [@u]\` → Desbloquear ✅
│ • \`${config.prefix}jid [@u]\` → Ver JID 🔍
│ • \`${config.prefix}rpgdarexp [@u] [cant]\` → Dar EXP ⭐
│ • \`${config.prefix}rpgdaroro [@u] [cant]\` → Dar oro 💰
│ • \`${config.prefix}rpgquitarexp [@u] [cant]\` → Quitar EXP ⬇️
│ • \`${config.prefix}rpgquitaroro [@u] [cant]\` → Quitar oro ⬇️
│ • \`${config.prefix}tickets\` → Ver tickets abiertos 📋
│ • \`${config.prefix}rticket [id] [resp]\` → Responder ticket 📨
│ • \`${config.prefix}cerrarticket [id]\` → Cerrar ticket 🔒
╰──────────────────────⬣`
  : ""
}

╭─〔 📥 *DESCARGAS* 〕
│ • \`${config.prefix}ytvideo [url/nombre]\` → Video de YouTube 🎬
│ • \`${config.prefix}tiktok [url]\` → Video de TikTok 🎵
│ • \`${config.prefix}ttfoto [url]\` → Foto de TikTok 🖼️
│ • \`${config.prefix}fbvideo [url]\` → Video de Facebook 📘
│ • \`${config.prefix}ig [url]\` → Post de Instagram 📸
│ • \`${config.prefix}igstory [usuario]\` → Historias de Instagram 📖
│ • \`${config.prefix}mediafire [url]\` → Archivo de Mediafire 📦
╰──────────────────────⬣

╭─〔 🤖 *INTELIGENCIA ARTIFICIAL* 〕
│ • \`${config.prefix}ia [mensaje]\` → Chatear con IA 💬
│ • \`${config.prefix}iavoz [mensaje]\` → Respuesta en audio 🎙️
╰──────────────────────⬣

╭─〔 🌐 *COMUNIDAD* 〕
│ • ${COMMUNITY_LINK}
╰──────────────────────⬣

▸ © *RAGE-BOT v${config.botVersion}*
▸ ® *Zemo & Smith*
▸ _Todos los derechos reservados_`;

      // ── Enviar imagen con caption corto ──────────────────
      try {
        const bannerPath = join(__dirname, "../../assets/menu-banner.png");
        const bannerBuffer = await readFile(bannerPath);
        await sock.sendMessage(from, {
          image: bannerBuffer,
          caption:
            `⚡ *RAGE-BOT v${config.botVersion}* ⚡\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `${saludo}, *@${sender.split("@")[0]}*\n` +
            `📅 ${fecha}  🕐 ${hora}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `${userTag}  |  ${rango}\n` +
            `⚡ Nivel: *${userData.level}*  ✨ XP: *${userData.xp}*/${nextXP}\n` +
            `[${bar}]`,
          mentions: [sender],
        }, { quoted: msg });
      } catch (e) {
        console.error("[MENU] Error enviando banner:", e.message);
      }

      // ── Enviar menú completo en texto ─────────────────────
      await reply(menu.trim());
    },
  },

  {
    name: "ping",
    alias: ["speed", "velocidad"],
    description: "Latencia del bot",
    category: "General",
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
    execute: async ({ reply }) => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      await reply(`⏱️ *RAGE-BOT activo hace:*\n━━━━━━━━━━━━━━\n${formatUptime(seconds)}\n[${uptimeBar(seconds)}]`);
    },
  },

  {
    name: "creador",
    alias: ["owner", "dueño", "dev"],
    description: "Info del creador",
    category: "General",
    execute: async ({ reply, isOwner }) => {
      if (isOwner) {
        await reply(`👑 *¡Bienvenido de vuelta, jefe!* 🔥\n\nTienes acceso completo a RAGE-BOT.\nTodos los comandos están a tu disposición.`);
      } else {
        await reply(
          `👑 *Creador de RAGE-BOT*\n━━━━━━━━━━━━━━\n📞 +${config.ownerNumber}\n\n` +
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
    execute: async ({ reply, react }) => {
      await react("⭐");
      await reply(
        "╭━━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃   ⭐ *RAGE-BOT PREMIUM* ⭐   ┃\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        "╭─〔 🔞 *CONTENIDO EXCLUSIVO* 〕\n" +
        "│ • !pack → Pack de fotos 🥵\n" +
        "│ • !pack2 → Pack chicas 🥵\n" +
        "│ • !pack3 → Pack hombres 🥵\n" +
        "│ • !videoxxx → Video XXX\n" +
        "│ • !lesbi → Video lesbi\n" +
        "│ • !pornovid → Video porno\n" +
        "│ • !pornovid2 → Video porno 2\n" +
        "│ • !vidgay → Video gay\n" +
        "│ • !vidbisexual → Video bisexual\n" +
        "│ • !vidrandom → Video random\n" +
        "│ • !nwaifu !nneko !nahegao → Anime NSFW\n" +
        "│ • !hentai !hblowjob !hmilf → Hentai\n" +
        "│ • !hrandom !nrandom → Aleatorios\n" +
        "╰──────────────────────⬣\n\n" +
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

];
export default basicCommands;