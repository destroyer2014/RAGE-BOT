// ═══════════════════════════════════════════
//       PRAGMATA BOT — src/commands/gacha.js
//    Sistema Gacha de personajes de anime
// ═══════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, "../../data");
const GACHA_FILE = join(DB_PATH, "gacha.json");

if (!existsSync(DB_PATH)) mkdirSync(DB_PATH, { recursive: true });

// ── Base de datos gacha ──────────────────────
function loadGacha() {
  if (!existsSync(GACHA_FILE)) return { users: {}, shop: [], series: [] };
  try { return JSON.parse(readFileSync(GACHA_FILE, "utf-8")); }
  catch { return { users: {}, shop: [], series: [] }; }
}

function saveGacha(db) {
  writeFileSync(GACHA_FILE, JSON.stringify(db, null, 2));
}

// ── Obtener o crear usuario gacha ────────────
function getGachaUser(jid) {
  const db = loadGacha();
  const id = jid.split("@")[0];
  if (!db.users[id]) {
    db.users[id] = {
      jid,
      yenes: 500,          // yenes de inicio
      harem: [],           // personajes reclamados
      favorites: [],
      claimMsg: null,      // mensaje personalizado al reclamar
      totalClaims: 0,
      totalVotes: 0,
    };
    saveGacha(db);
  }
  return { db, id, user: db.users[id] };
}

function saveUser(db, id, user) {
  db.users[id] = user;
  saveGacha(db);
}

// ── Personaje activo esperando ser reclamado ─
// { character, groupJid, msgKey, expiresAt }
export const pendingRolls = new Map();

// ── Rareza ───────────────────────────────────
const RARITIES = [
  { name: "⭐",    weight: 50, yenes: 50  },
  { name: "⭐⭐",  weight: 30, yenes: 100 },
  { name: "⭐⭐⭐",weight: 15, yenes: 250 },
  { name: "✨",   weight: 5,  yenes: 500 },
];

function getRarity() {
  const r = Math.random() * 100;
  let acc = 0;
  for (const rar of RARITIES) {
    acc += rar.weight;
    if (r < acc) return rar;
  }
  return RARITIES[0];
}

// ── Fetch personaje aleatorio de AniList ─────
async function fetchRandomCharacter() {
  // Página aleatoria entre 1-50 para variedad
  const page = Math.floor(Math.random() * 50) + 1;
  const query = `
    query ($page: Int) {
      Page(page: $page, perPage: 1) {
        characters {
          id
          name { full native }
          image { large }
          description(asHtml: false)
          gender
          age
          favourites
          media(sort: POPULARITY_DESC, perPage: 1) {
            nodes { title { romaji } type }
          }
        }
      }
    }
  `;
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { page } }),
  });
  const data = await res.json();
  const chars = data?.data?.Page?.characters;
  if (!chars?.length) throw new Error("Sin resultados");
  const c = chars[0];
  const media = c.media?.nodes?.[0];
  return {
    id: c.id,
    name: c.name?.full || "Desconocido",
    native: c.name?.native || "",
    image: c.image?.large || null,
    description: (c.description || "Sin descripción.").slice(0, 300),
    gender: c.gender || "?",
    age: c.age || "?",
    favourites: c.favourites || 0,
    serie: media?.title?.romaji || "Desconocida",
    type: media?.type || "ANIME",
  };
}

// ── Buscar personaje por nombre ──────────────
async function searchCharacter(name) {
  const query = `
    query ($search: String) {
      Character(search: $search) {
        id
        name { full native }
        image { large }
        description(asHtml: false)
        gender
        age
        favourites
        media(sort: POPULARITY_DESC, perPage: 1) {
          nodes { title { romaji } type }
        }
      }
    }
  `;
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { search: name } }),
  });
  const data = await res.json();
  const c = data?.data?.Character;
  if (!c) return null;
  const media = c.media?.nodes?.[0];
  return {
    id: c.id,
    name: c.name?.full || "Desconocido",
    native: c.name?.native || "",
    image: c.image?.large || null,
    description: (c.description || "Sin descripción.").slice(0, 300),
    gender: c.gender || "?",
    age: c.age || "?",
    favourites: c.favourites || 0,
    serie: media?.title?.romaji || "Desconocida",
    type: media?.type || "ANIME",
  };
}

// ── Buscar anime/serie ───────────────────────
async function searchAnime(name) {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        title { romaji english native }
        description(asHtml: false)
        episodes
        status
        averageScore
        genres
        coverImage { large }
        startDate { year }
      }
    }
  `;
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { search: name } }),
  });
  const data = await res.json();
  return data?.data?.Media || null;
}

// ── Descargar imagen como buffer ─────────────
async function fetchImageBuffer(url) {
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

// ════════════════════════════════════════════
//                  COMANDOS
// ════════════════════════════════════════════

const gachaCommands = [

  // ── ROLL (manual, usuario lo invoca) ────────
  {
    name: "rollwaifu", alias: ["rw", "roll"],
    description: "Waifu/husbando aleatorio",
    category: "Gacha",
    execute: async ({ sock, from, msg, sender, reply, pushName}) => {
      // Si ya hay un roll activo en este grupo, informar
      if (pendingRolls.has(from)) {
        const p = pendingRolls.get(from);
        return reply(`⚠️ Ya hay un personaje esperando ser reclamado: *${p.character.name}*\nResponde con *!claim* citando ese mensaje.`);
      }
      await reply("🎲 Buscando personaje...");
      try {
        const character = await fetchRandomCharacter();
        const rarity    = getRarity();
        character.rarity  = rarity.name;
        character.value   = rarity.yenes;

        const expires = Date.now() + 5 * 60 * 1000; // 5 min para reclamar
        const sentMsg = await sock.sendMessage(from, {
          image: character.image ? await fetchImageBuffer(character.image) : undefined,
          caption:
            `✨ *¡Apareció un personaje!*\n` +
            `━━━━━━━━━━━━━━\n` +
            `👤 *${character.name}*${character.native ? ` (${character.native})` : ""}\n` +
            `📺 *Serie:* ${character.serie}\n` +
            `⭐ *Rareza:* ${rarity.name}\n` +
            `💴 *Valor:* ¥${rarity.yenes}\n` +
            `━━━━━━━━━━━━━━\n` +
            `💬 Responde con *!claim* citando este mensaje para reclamarlo.\n` +
            `⏳ Expira en 5 minutos.`,
        }, { quoted: msg });

        pendingRolls.set(from, {
          character,
          groupJid: from,
          msgKey: sentMsg.key,
          expiresAt: expires,
        });

        // Auto-eliminar después de 5 min
        setTimeout(() => {
          if (pendingRolls.has(from)) {
            const cur = pendingRolls.get(from);
            if (cur.character.id === character.id) {
              pendingRolls.delete(from);
              sock.sendMessage(from, {
                text: `⏰ *${character.name}* no fue reclamado/a y se fue...`,
              }).catch(() => {});
            }
          }
        }, 5 * 60 * 1000);

      } catch (e) {
        console.error("[GACHA] roll error:", e.message);
        reply("❌ Error al obtener personaje. Intenta de nuevo.");
      }
    },
  },

  // ── CLAIM ────────────────────────────────────
  {
    name: "claim", alias: ["c", "reclamar"],
    description: "Reclamar un personaje citando el mensaje del roll",
    category: "Gacha",
    execute: async ({ sock, from, msg, sender, pushName, reply }) => {
      const pending = pendingRolls.get(from);
      if (!pending) return reply("❌ No hay ningún personaje disponible para reclamar ahora.");
      if (Date.now() > pending.expiresAt) {
        pendingRolls.delete(from);
        return reply("⏰ El personaje ya expiró.");
      }

      // Verificar que está citando el mensaje correcto
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.stanzaId ||
                     msg.message?.imageMessage?.contextInfo?.stanzaId;
      if (pending.msgKey && quoted && quoted !== pending.msgKey.id) {
        return reply("⚠️ Cita el mensaje del personaje para reclamarlo.");
      }

      const { character } = pending;
      pendingRolls.delete(from);

      const { db, id, user } = getGachaUser(sender);

      // Verificar que no ya lo tiene
      const yaLo = user.harem.find(h => h.id === character.id);
      if (yaLo) return reply(`⚠️ Ya tienes a *${character.name}* en tu harem.`);

      user.harem.push({
        id: character.id,
        name: character.name,
        serie: character.serie,
        rarity: character.rarity,
        value: character.value,
        image: character.image,
        claimedAt: Date.now(),
        votes: 0,
        forSale: false,
        salePrice: 0,
      });
      user.totalClaims = (user.totalClaims || 0) + 1;
      saveUser(db, id, user);

      const claimMsg = user.claimMsg ||
        `💖 *¡${pushName || "Usuario"} reclamó a ${character.name}!*\n` +
        `📺 ${character.serie} | ${character.rarity}\n` +
        `💴 Valor: ¥${character.value}`;

      await reply(claimMsg);
    },
  },

  // ── GACHAINFO ────────────────────────────────
  {
    name: "gachainfo", alias: ["ginfo", "infogacha"],
    description: "Ver tu información de gacha",
    category: "Gacha",
    execute: async ({ sender, pushName, reply }) => {
      const { user } = getGachaUser(sender);
      const total = user.harem.length;
      const rarezas = {};
      for (const h of user.harem) rarezas[h.rarity] = (rarezas[h.rarity] || 0) + 1;
      const rarStr = Object.entries(rarezas).map(([r, n]) => `${r} ×${n}`).join("  ");
      await reply(
        `╭─〔 ✧ *GACHA INFO* 〕\n` +
        `│ 👤 *${pushName || "Usuario"}*\n` +
        `│ 💴 Yenes: ¥${user.yenes}\n` +
        `│ 💖 Harem: ${total} personaje(s)\n` +
        `│ ${rarStr || "Sin personajes aún"}\n` +
        `│ 🏆 Total reclamados: ${user.totalClaims || 0}\n` +
        `│ ⭐ Votos dados: ${user.totalVotes || 0}\n` +
        `╰──────────────────────⬣`
      );
    },
  },

  // ── HAREM ────────────────────────────────────
  {
    name: "harem", alias: ["waifus", "claims"],
    description: "Ver tus personajes reclamados",
    category: "Gacha",
    execute: async ({ sock, from, msg, sender, args, reply, pushName}) => {
      // Si mencionan a alguien ver el harem de ese usuario
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
      const target = mentioned || sender;
      const { user } = getGachaUser(target);
      const nombre = mentioned ? `@${mentioned.split("@")[0]}` : "Tu";
      if (!user.harem.length) return reply(`${nombre} harem está vacío.`);

      const lista = user.harem
        .map((h, i) => `│ ${i + 1}. *${h.name}* — ${h.serie} ${h.rarity}`)
        .join("\n");

      await reply(
        `╭─〔 💖 *HAREM DE ${nombre.toUpperCase()}* 〕\n` +
        `│ 💴 Yenes: ¥${user.yenes}\n` +
        `├──────────────────────\n` +
        lista + "\n" +
        `╰──────────────────────⬣\n` +
        `_Total: ${user.harem.length} personaje(s)_`
      );
    },
  },

  // ── CHARINFO ─────────────────────────────────
  {
    name: "charinfo", alias: ["winfo", "waifuinfo"],
    description: "Ver información de un personaje",
    category: "Gacha",
    execute: async ({ args, text, sock, from, msg, reply, pushName}) => {
      const name = text.trim();
      if (!name) return reply("❌ Escribe el nombre del personaje. Ej: *!charinfo Rem*");
      await reply("🔍 Buscando...");
      try {
        const c = await searchCharacter(name);
        if (!c) return reply(`❌ No encontré a *${name}* en AniList.`);
        const txt =
          `╭─〔 👤 *${c.name}* 〕\n` +
          `│ ${c.native ? `*Nombre nativo:* ${c.native}\n│ ` : ""}` +
          `*Serie:* ${c.serie}\n` +
          `│ *Género:* ${c.gender}  *Edad:* ${c.age}\n` +
          `│ ❤️ Favoritos en AniList: ${c.favourites.toLocaleString()}\n` +
          `├──────────────────────\n` +
          `│ ${c.description}\n` +
          `╰──────────────────────⬣`;
        if (c.image) {
          const buf = await fetchImageBuffer(c.image);
          await sock.sendMessage(from, { image: buf, caption: txt }, { quoted: msg });
        } else {
          await reply(txt);
        }
      } catch {
        reply("❌ Error al buscar el personaje.");
      }
    },
  },

  // ── CHARIMAGE ────────────────────────────────
  {
    name: "charimage", alias: ["waifuimage", "cimage", "wimage"],
    description: "Ver una imagen de un personaje",
    category: "Gacha",
    execute: async ({ args, text, sock, from, msg, reply, pushName}) => {
      const name = text.trim();
      if (!name) return reply("❌ Escribe el nombre. Ej: *!charimage Asuna*");
      await reply("🖼️ Buscando imagen...");
      try {
        const c = await searchCharacter(name);
        if (!c || !c.image) return reply(`❌ No encontré imagen de *${name}*.`);
        const buf = await fetchImageBuffer(c.image);
        await sock.sendMessage(from, {
          image: buf,
          caption: `🖼️ *${c.name}* — ${c.serie}`,
        }, { quoted: msg });
      } catch {
        reply("❌ Error al buscar la imagen.");
      }
    },
  },

  // ── CHARVIDEO ────────────────────────────────
  {
    name: "charvideo", alias: ["waifuvideo", "cvideo", "wvideo"],
    description: "Ver un video de un personaje (busca en YouTube)",
    category: "Gacha",
    execute: async ({ text, reply, msg, pushName}) => {
      const name = text.trim();
      if (!name) return reply("❌ Escribe el nombre. Ej: *!charvideo Zero Two*");
      const query = encodeURIComponent(`${name} anime edit amv`);
      await reply(
        `🎬 *${name}*\n` +
        `━━━━━━━━━━━━━━\n` +
        `Busca videos aquí:\n` +
        `🔗 https://www.youtube.com/results?search_query=${query}`
      );
    },
  },

  // ── DELETEWAIFU ──────────────────────────────
  {
    name: "deletewaifu", alias: ["delwaifu", "delchar"],
    description: "Eliminar un personaje de tu harem",
    category: "Gacha",
    execute: async ({ sender, text, reply, msg, pushName}) => {
      const name = text.trim().toLowerCase();
      if (!name) return reply("❌ Indica el nombre. Ej: *!delwaifu Rem*");
      const { db, id, user } = getGachaUser(sender);
      const idx = user.harem.findIndex(h => h.name.toLowerCase().includes(name));
      if (idx === -1) return reply(`❌ No tienes a *${text.trim()}* en tu harem.`);
      const [removed] = user.harem.splice(idx, 1);
      saveUser(db, id, user);
      await reply(`🗑️ *${removed.name}* eliminado de tu harem.`);
    },
  },

  // ── SELL ─────────────────────────────────────
  {
    name: "sell", alias: ["vender"],
    description: "Poner un personaje a la venta",
    category: "Gacha",
    execute: async ({ sender, text, reply, msg, pushName}) => {
      // formato: [precio] [nombre]
      const parts = text.trim().split(" ");
      const price = parseInt(parts[0]);
      const name  = parts.slice(1).join(" ").toLowerCase();
      if (!price || isNaN(price) || price <= 0) return reply("❌ Formato: *!sell [precio] [nombre]*\nEj: *!sell 300 Rem*");
      if (!name) return reply("❌ Indica el nombre del personaje.");
      const { db, id, user } = getGachaUser(sender);
      const char = user.harem.find(h => h.name.toLowerCase().includes(name));
      if (!char) return reply(`❌ No tienes a *${parts.slice(1).join(" ")}* en tu harem.`);
      if (char.forSale) return reply(`⚠️ *${char.name}* ya está en venta.`);
      char.forSale   = true;
      char.salePrice = price;
      char.sellerJid = sender;
      // Agregar a tienda global
      const gdb = loadGacha();
      if (!gdb.shop) gdb.shop = [];
      gdb.shop.push({ ...char, sellerJid: sender, sellerPhone: sender.split("@")[0] });
      gdb.users[id] = user;
      saveGacha(gdb);
      await reply(`✅ *${char.name}* puesto en venta por *¥${price}*.`);
    },
  },

  // ── REMOVESALE ───────────────────────────────
  {
    name: "removesale", alias: ["removerventa"],
    description: "Quitar personaje de la venta",
    category: "Gacha",
    execute: async ({ sender, text, reply, msg, pushName}) => {
      const parts = text.trim().split(" ");
      const price = parseInt(parts[0]);
      const name  = parts.slice(1).join(" ").toLowerCase();
      if (!name) return reply("❌ Formato: *!removesale [precio] [nombre]*");
      const { db, id, user } = getGachaUser(sender);
      const char = user.harem.find(h => h.name.toLowerCase().includes(name) && h.forSale);
      if (!char) return reply(`❌ No tienes a *${parts.slice(1).join(" ")}* en venta.`);
      char.forSale   = false;
      char.salePrice = 0;
      // Eliminar de tienda global
      const gdb = loadGacha();
      if (gdb.shop) {
        gdb.shop = gdb.shop.filter(s => !(s.sellerJid === sender && s.name.toLowerCase().includes(name)));
      }
      gdb.users[id] = user;
      saveGacha(gdb);
      await reply(`✅ *${char.name}* retirado de la venta.`);
    },
  },

  // ── HAREMSHOP ────────────────────────────────
  {
    name: "haremshop", alias: ["tiendawaifus", "wshop"],
    description: "Ver personajes en venta",
    category: "Gacha",
    execute: async ({ args, reply, msg, pushName}) => {
      const db = loadGacha();
      const shop = db.shop || [];
      if (!shop.length) return reply("🏪 La tienda está vacía por ahora.");
      const page = Math.max(1, parseInt(args[0]) || 1);
      const perPage = 10;
      const total   = shop.length;
      const pages   = Math.ceil(total / perPage);
      const slice   = shop.slice((page - 1) * perPage, page * perPage);
      const lista   = slice.map((s, i) =>
        `│ ${(page - 1) * perPage + i + 1}. *${s.name}* — ${s.serie} ${s.rarity}\n` +
        `│    💴 ¥${s.salePrice} | Vendedor: @${s.sellerPhone}`
      ).join("\n");
      await reply(
        `╭─〔 🏪 *TIENDA DE PERSONAJES* 〕\n` +
        `│ Página ${page}/${pages} — Total: ${total}\n` +
        `├──────────────────────\n` +
        lista + "\n" +
        `╰──────────────────────⬣\n` +
        `_!buychar [nombre] para comprar_`
      );
    },
  },

  // ── BUYCHARACTER ─────────────────────────────
  {
    name: "buycharacter", alias: ["buychar", "buyc"],
    description: "Comprar un personaje en venta",
    category: "Gacha",
    execute: async ({ sender, text, reply, sock, msg, pushName}) => {
      const name = text.trim().toLowerCase();
      if (!name) return reply("❌ Indica el nombre. Ej: *!buychar Rem*");
      const { db: buyerDb, id: buyerId, user: buyer } = getGachaUser(sender);
      const gdb = loadGacha();
      const shop = gdb.shop || [];
      const idx  = shop.findIndex(s => s.name.toLowerCase().includes(name) && s.sellerJid !== sender);
      if (idx === -1) return reply(`❌ No encontré *${text.trim()}* en la tienda.`);
      const item = shop[idx];
      if (buyer.yenes < item.salePrice)
        return reply(`❌ No tienes suficientes yenes. Necesitas ¥${item.salePrice}, tienes ¥${buyer.yenes}.`);
      // Transferir
      buyer.yenes -= item.salePrice;
      buyer.harem.push({ ...item, forSale: false, salePrice: 0, claimedAt: Date.now() });
      // Pagar al vendedor
      const sellerId = item.sellerJid?.split("@")[0];
      if (sellerId && gdb.users[sellerId]) {
        gdb.users[sellerId].yenes = (gdb.users[sellerId].yenes || 0) + item.salePrice;
        // Quitar del harem del vendedor
        gdb.users[sellerId].harem = (gdb.users[sellerId].harem || []).filter(h => h.name !== item.name);
      }
      // Quitar de la tienda
      gdb.shop.splice(idx, 1);
      gdb.users[buyerId] = buyer;
      saveGacha(gdb);
      await reply(
        `✅ *¡Compraste a ${item.name}!*\n` +
        `📺 ${item.serie} ${item.rarity}\n` +
        `💴 Pagaste: ¥${item.salePrice} | Saldo: ¥${buyer.yenes}`
      );
    },
  },

  // ── GIVECHAR ─────────────────────────────────
  {
    name: "givechar", alias: ["givewaifu", "regalar"],
    description: "Regalar un personaje a otro usuario",
    category: "Gacha",
    execute: async ({ sender, text, msg, reply, pushName}) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      if (!mentioned) return reply("❌ Menciona al usuario. Ej: *!givechar @usuario Rem*");
      if (mentioned === sender) return reply("❌ No puedes regalarte a ti mismo.");
      const name = text.replace(/@\d+/g, "").trim().toLowerCase();
      if (!name) return reply("❌ Indica el nombre del personaje.");
      const { db, id: gId, user: giver } = getGachaUser(sender);
      const idx = giver.harem.findIndex(h => h.name.toLowerCase().includes(name));
      if (idx === -1) return reply(`❌ No tienes a *${text.replace(/@\d+/g,"").trim()}* en tu harem.`);
      const [char] = giver.harem.splice(idx, 1);
      const recvId = mentioned.split("@")[0];
      if (!db.users[recvId]) db.users[recvId] = { jid: mentioned, yenes: 500, harem: [], favorites: [], claimMsg: null, totalClaims: 0, totalVotes: 0 };
      db.users[recvId].harem.push({ ...char, claimedAt: Date.now() });
      db.users[gId] = giver;
      saveGacha(db);
      await reply(`🎁 Le regalaste *${char.name}* a @${recvId}.`);
    },
  },

  // ── GIVEALLHAREM ─────────────────────────────
  {
    name: "giveallharem",
    description: "Regalar todos tus personajes a otro usuario",
    category: "Gacha",
    execute: async ({ sender, msg, reply, pushName}) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      if (!mentioned) return reply("❌ Menciona al usuario. Ej: *!giveallharem @usuario*");
      if (mentioned === sender) return reply("❌ No puedes regalarte a ti mismo.");
      const { db, id: gId, user: giver } = getGachaUser(sender);
      if (!giver.harem.length) return reply("❌ Tu harem está vacío.");
      const recvId = mentioned.split("@")[0];
      if (!db.users[recvId]) db.users[recvId] = { jid: mentioned, yenes: 500, harem: [], favorites: [], claimMsg: null, totalClaims: 0, totalVotes: 0 };
      const total = giver.harem.length;
      db.users[recvId].harem.push(...giver.harem.map(h => ({ ...h, claimedAt: Date.now() })));
      giver.harem = [];
      db.users[gId] = giver;
      saveGacha(db);
      await reply(`🎁 Regalaste *${total}* personaje(s) a @${recvId}.`);
    },
  },

  // ── TRADE ────────────────────────────────────
  {
    name: "trade", alias: ["intercambiar"],
    description: "Intercambiar un personaje con otro usuario",
    category: "Gacha",
    execute: async ({ sender, text, msg, reply, pushName}) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const parts = text.replace(/@\d+/g, "").split("/");
      if (!mentioned || parts.length < 2) return reply("❌ Formato: *!trade @usuario [mi personaje] / [su personaje]*");
      const myName   = parts[0].trim().toLowerCase();
      const theirName = parts[1].trim().toLowerCase();
      const { db, id: myId, user: me } = getGachaUser(sender);
      const theirId = mentioned.split("@")[0];
      if (!db.users[theirId]) return reply("❌ Ese usuario no tiene cuenta gacha.");
      const them = db.users[theirId];
      const myIdx    = me.harem.findIndex(h => h.name.toLowerCase().includes(myName));
      const theirIdx = them.harem.findIndex(h => h.name.toLowerCase().includes(theirName));
      if (myIdx === -1)    return reply(`❌ No tienes a *${parts[0].trim()}* en tu harem.`);
      if (theirIdx === -1) return reply(`❌ @${theirId} no tiene a *${parts[1].trim()}*.`);
      const [myChar]    = me.harem.splice(myIdx, 1);
      const [theirChar] = them.harem.splice(theirIdx, 1);
      me.harem.push({ ...theirChar, claimedAt: Date.now() });
      them.harem.push({ ...myChar, claimedAt: Date.now() });
      db.users[myId]    = me;
      db.users[theirId] = them;
      saveGacha(db);
      await reply(
        `🔄 *¡Intercambio exitoso!*\n` +
        `━━━━━━━━━━━━━━\n` +
        `📤 Tú diste: *${myChar.name}*\n` +
        `📥 Recibiste: *${theirChar.name}*`
      );
    },
  },

  // ── VOTE ─────────────────────────────────────
  {
    name: "vote", alias: ["votar"],
    description: "Votar por un personaje para subir su valor",
    category: "Gacha",
    execute: async ({ sender, text, reply, msg, pushName}) => {
      const name = text.trim().toLowerCase();
      if (!name) return reply("❌ Indica el nombre. Ej: *!vote Rem*");
      const gdb = loadGacha();
      // Buscar en todos los harems
      let found = false;
      for (const uid of Object.keys(gdb.users)) {
        const h = gdb.users[uid].harem.find(c => c.name.toLowerCase().includes(name));
        if (h) {
          h.votes = (h.votes || 0) + 1;
          h.value = Math.round(h.value * 1.05); // +5% valor
          found = true;
          // Dar yenes al voter
          const { id: vid, user: voter } = getGachaUser(sender);
          voter.yenes = (voter.yenes || 0) + 10;
          voter.totalVotes = (voter.totalVotes || 0) + 1;
          gdb.users[vid] = voter;
          saveGacha(gdb);
          return reply(`⭐ Votaste por *${h.name}*. Su valor subió a ¥${h.value}.\n💴 +¥10 para ti.`);
        }
      }
      if (!found) reply(`❌ No encontré a *${text.trim()}* en ningún harem.`);
    },
  },

  // ── WAIFUSBOARD ──────────────────────────────
  {
    name: "waifusboard", alias: ["waifustop", "topwaifus", "wtop"],
    description: "Top de personajes con mayor valor",
    category: "Gacha",
    execute: async ({ args, reply, msg, pushName}) => {
      const limit = Math.min(parseInt(args[0]) || 10, 20);
      const gdb   = loadGacha();
      const all   = [];
      for (const [uid, u] of Object.entries(gdb.users)) {
        for (const h of (u.harem || [])) all.push({ ...h, ownerPhone: uid });
      }
      all.sort((a, b) => (b.value || 0) - (a.value || 0));
      const top = all.slice(0, limit);
      if (!top.length) return reply("📊 No hay personajes registrados aún.");
      const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
      const lista = top.map((h, i) =>
        `│ ${medals[i] || `${i+1}.`} *${h.name}* — ¥${h.value} ${h.rarity}\n│    📺 ${h.serie} | 👤 @${h.ownerPhone}`
      ).join("\n");
      await reply(`╭─〔 🏆 *TOP PERSONAJES* 〕\n${lista}\n╰──────────────────────⬣`);
    },
  },

  // ── FAVORITETOP ──────────────────────────────
  {
    name: "favoritetop", alias: ["favtop"],
    description: "Top de personajes más votados",
    category: "Gacha",
    execute: async ({ reply, msg, pushName}) => {
      const gdb = loadGacha();
      const all = [];
      for (const [uid, u] of Object.entries(gdb.users)) {
        for (const h of (u.harem || [])) if (h.votes > 0) all.push({ ...h, ownerPhone: uid });
      }
      all.sort((a, b) => (b.votes || 0) - (a.votes || 0));
      const top = all.slice(0, 10);
      if (!top.length) return reply("📊 Nadie ha votado por personajes aún.");
      const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
      const lista = top.map((h, i) =>
        `│ ${medals[i]} *${h.name}* — ⭐ ${h.votes} votos\n│    📺 ${h.serie} | 👤 @${h.ownerPhone}`
      ).join("\n");
      await reply(`╭─〔 ❤️ *TOP FAVORITOS* 〕\n${lista}\n╰──────────────────────⬣`);
    },
  },

  // ── SERIEINFO ────────────────────────────────
  {
    name: "serieinfo", alias: ["ainfo", "animeinfo"],
    description: "Información de un anime",
    category: "Gacha",
    execute: async ({ text, sock, from, msg, reply, pushName}) => {
      const name = text.trim();
      if (!name) return reply("❌ Ej: *!serieinfo Sword Art Online*");
      await reply("🔍 Buscando anime...");
      try {
        const a = await searchAnime(name);
        if (!a) return reply(`❌ No encontré *${name}* en AniList.`);
        const genres = (a.genres || []).slice(0, 4).join(", ");
        const desc   = (a.description || "Sin descripción.").replace(/<[^>]+>/g, "").slice(0, 300);
        const txt =
          `╭─〔 📺 *${a.title.romaji}* 〕\n` +
          `${a.title.english ? `│ *EN:* ${a.title.english}\n` : ""}` +
          `${a.title.native  ? `│ *JP:* ${a.title.native}\n`  : ""}` +
          `│ *Año:* ${a.startDate?.year || "?"}\n` +
          `│ *Episodios:* ${a.episodes || "?"}\n` +
          `│ *Estado:* ${a.status || "?"}\n` +
          `│ *Score:* ${a.averageScore || "?"}%\n` +
          `│ *Géneros:* ${genres || "?"}\n` +
          `├──────────────────────\n` +
          `│ ${desc}\n` +
          `╰──────────────────────⬣`;
        if (a.coverImage?.large) {
          const buf = await fetchImageBuffer(a.coverImage.large);
          await sock.sendMessage(from, { image: buf, caption: txt }, { quoted: msg });
        } else {
          await reply(txt);
        }
      } catch {
        reply("❌ Error al buscar el anime.");
      }
    },
  },

  // ── SERIELIST ────────────────────────────────
  {
    name: "serielist", alias: ["slist", "animelist"],
    description: "Listar series presentes en el bot",
    category: "Gacha",
    execute: async ({ reply, msg, pushName}) => {
      const gdb = loadGacha();
      const seriesSet = new Set();
      for (const u of Object.values(gdb.users)) {
        for (const h of (u.harem || [])) if (h.serie) seriesSet.add(h.serie);
      }
      const shop = gdb.shop || [];
      for (const s of shop) if (s.serie) seriesSet.add(s.serie);
      const series = [...seriesSet].sort();
      if (!series.length) return reply("📺 No hay series registradas aún. ¡Haz *!roll* para empezar!");
      const lista = series.map((s, i) => `│ ${i + 1}. ${s}`).join("\n");
      await reply(`╭─〔 📺 *SERIES EN EL BOT* 〕\n${lista}\n╰──────────────────────⬣\n_Total: ${series.length}_`);
    },
  },

  // ── SETCLAIMMSG ──────────────────────────────
  {
    name: "setclaimmsg", alias: ["setclaim"],
    description: "Personalizar tu mensaje al reclamar",
    category: "Gacha",
    execute: async ({ sender, text, reply, pushName}) => {
      const msg = text.trim();
      if (!msg) return reply("❌ Escribe el mensaje. Usa {nombre} para el personaje y {serie} para la serie.\nEj: *!setclaim ¡{nombre} de {serie} es mío!*");
      const { db, id, user } = getGachaUser(sender);
      user.claimMsg = msg.replace(/{nombre}/g, "{nombre}").replace(/{serie}/g, "{serie}");
      saveUser(db, id, user);
      await reply(`✅ Mensaje de reclamo guardado:\n_${msg}_`);
    },
  },

  // ── DELCLAIMMSG ──────────────────────────────
  {
    name: "delclaimmsg",
    description: "Restablecer mensaje de reclamo",
    category: "Gacha",
    execute: async ({ sender, reply, msg, pushName}) => {
      const { db, id, user } = getGachaUser(sender);
      user.claimMsg = null;
      saveUser(db, id, user);
      await reply("✅ Mensaje de reclamo restablecido al predeterminado.");
    },
  },

];

export default gachaCommands;

// ── Función exportada para el roll automático ─
export async function autoRollGacha(sock, groupJid) {
  if (pendingRolls.has(groupJid)) return; // ya hay uno activo
  try {
    const character = await fetchRandomCharacter();
    const rarity    = getRarity();
    character.rarity = rarity.name;
    character.value  = rarity.yenes;

    const expires = Date.now() + 5 * 60 * 1000;
    const sentMsg = await sock.sendMessage(groupJid, {
      image: character.image ? await fetchImageBuffer(character.image) : undefined,
      caption:
        `✨ *¡Apareció un personaje!*\n` +
        `━━━━━━━━━━━━━━\n` +
        `👤 *${character.name}*${character.native ? ` (${character.native})` : ""}\n` +
        `📺 *Serie:* ${character.serie}\n` +
        `⭐ *Rareza:* ${rarity.name}\n` +
        `💴 *Valor:* ¥${rarity.yenes}\n` +
        `━━━━━━━━━━━━━━\n` +
        `💬 Responde con *!claim* citando este mensaje.\n` +
        `⏳ Expira en 5 minutos.`,
    });

    pendingRolls.set(groupJid, {
      character,
      groupJid,
      msgKey: sentMsg.key,
      expiresAt: expires,
    });

    setTimeout(() => {
      const cur = pendingRolls.get(groupJid);
      if (cur?.character?.id === character.id) {
        pendingRolls.delete(groupJid);
        sock.sendMessage(groupJid, {
          text: `⏰ *${character.name}* no fue reclamado/a y se fue...`,
        }).catch(() => {});
      }
    }, 5 * 60 * 1000);

  } catch (e) {
    console.error("[GACHA AUTO-ROLL]", e.message);
  }
}
