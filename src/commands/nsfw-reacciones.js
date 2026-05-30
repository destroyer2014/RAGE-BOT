// ═══════════════════════════════════════════
//  PRAGMATA BOT — src/commands/nsfw-reacciones.js
//  Reacciones NSFW + imágenes para adultos
// ═══════════════════════════════════════════

import { exec } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import axios from "axios";
import config from "../../config.js";
import { checkNsfwLimit, FREE_NSFW_LIMIT, PLANES, isPremium, getPremiumPlan } from "../lib/database.js";

const execAsync = promisify(exec);

// ── Control de chats NSFW habilitados ────────
export const nsfwChats = new Set();

function requireNsfw(ctx) {
  if (!nsfwChats.has(ctx.from)) {
    ctx.reply(`🔞 El NSFW no está activado aquí.\nUsa \`${config.prefix}nsfw on\` para activarlo (solo admins).`);
    return false;
  }
  return true;
}

// ── Control de límite diario NSFW ────────────
// Free: 10/día | Semanal: 30 | Plata: 50 | Dorado: 80 | King: 150 | Dios: ♾️
async function requireNsfwLimit(ctx) {
  if (ctx.isOwner) return true; // Owner sin límite

  const check = checkNsfwLimit(ctx.sender);
  if (check.ok) return true;

  const p = config.prefix;
  await ctx.reply(
`╭─〔 🔞 *LÍMITE NSFW ALCANZADO* 〕
│ Has usado *${check.used}/${check.limit}* comandos NSFW hoy.
│ Tu contador se resetea en 24 horas. 🕛
├──────────────────────
│ 💎 *MEJORA TU PLAN:*
│ 🆓 Gratis    → 10/día
│ 🎟️ Semanal  → 30/día  — S/. 1.50
│ 🥈 Plata    → 50/día  — S/. 3.00
│ 🥇 Dorado   → 80/día  — S/. 6.00
│ 👑 King     → 150/día — S/. 10.00
│ 🔱 Dios     → ♾️ Ilimitado — S/. 15.00
├──────────────────────
│ 📞 Contacta: +${config.ownerNumber}
│ 📋 Info: \`${p}adqpremium\`
╰──────────────────────⬣`
  );
  await ctx.react("⛔");
  return false;
}

// ── APIs de imágenes NSFW ────────────────────
async function fromWaifuIm(tag) {
  try {
    const r = await axios.get("https://api.waifu.im/search?included_tags=" + tag + "&is_nsfw=true", { timeout: 10000 });
    return r.data?.images?.[0]?.url || null;
  } catch { return null; }
}

async function fromWaifuPics(cat) {
  try {
    const r = await axios.get("https://api.waifu.pics/nsfw/" + cat, { timeout: 10000 });
    return r.data?.url || null;
  } catch { return null; }
}

async function fromNekobot(type) {
  try {
    const r = await axios.get("https://nekobot.xyz/api/image?type=" + type, { timeout: 10000 });
    return r.data?.message || null;
  } catch { return null; }
}

async function fromRule34(tags) {
  try {
    const r = await axios.get("https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=20&tags=" + encodeURIComponent(tags || "hentai"), { timeout: 10000 });
    const posts = r.data;
    if (!posts?.length) return null;
    const post = posts[Math.floor(Math.random() * Math.min(posts.length, 20))];
    return post?.file_url || null;
  } catch { return null; }
}

async function fromGelbooru(tags) {
  try {
    const r = await axios.get("https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=20&tags=" + encodeURIComponent((tags || "hentai") + " rating:explicit"), { timeout: 10000 });
    const posts = r.data?.post;
    if (!posts?.length) return null;
    const post = posts[Math.floor(Math.random() * Math.min(posts.length, 20))];
    return post?.file_url || null;
  } catch { return null; }
}

async function fromDanbooru(tags) {
  try {
    const r = await axios.get("https://danbooru.donmai.us/posts.json?limit=20&tags=" + encodeURIComponent((tags || "hentai") + " rating:explicit"), { timeout: 10000 });
    const posts = r.data;
    if (!posts?.length) return null;
    const post = posts[Math.floor(Math.random() * Math.min(posts.length, 20))];
    return post?.file_url || post?.large_file_url || null;
  } catch { return null; }
}

async function fromEvogb(endpoint) {
  try {
    const r = await axios.get(`https://api.evogb.org${endpoint}`, {
      timeout: 10000,
      headers: { "x-api-key": "evogb-Rk23OCHp" }
    });
    return r.data?.data?.url || null;
  } catch { return null; }
}

async function fromEvogbKeyword(endpoint, keyword) {
  try {
    const r = await axios.get(`https://api.evogb.org${endpoint}`, {
      params: { keyword },
      timeout: 10000,
      headers: { "x-api-key": "evogb-Rk23OCHp" }
    });
    return r.data?.data?.url || null;
  } catch { return null; }
}
function getTarget(ctx) {
  const mentioned = ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  return mentioned.length > 0 ? mentioned[0] : null;
}

// ── Convertir GIF a MP4 ───────────────────────
async function gifToMp4Buffer(url) {
  const tmp = tmpdir();
  const ts = Date.now();
  const mp4Path = join(tmp, `nsfwr_${ts}.mp4`);
  try {
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    const buf = Buffer.from(res.data);
    const ct = res.headers["content-type"] || "";
    if (ct.includes("video/mp4") || url.endsWith(".mp4")) return buf;
    const isWebp = buf[0] === 0x52 && buf[1] === 0x49;
    const isGif  = buf[0] === 0x47 && buf[1] === 0x49;
    if (!isWebp && !isGif) return buf;
    const ext = isWebp ? "webp" : "gif";
    const inPath = join(tmp, `nsfwr_${ts}.${ext}`);
    await writeFile(inPath, buf);
    await execAsync(`ffmpeg -i "${inPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${mp4Path}" -y`);
    const out = await readFile(mp4Path);
    unlink(inPath).catch(() => {});
    return out;
  } catch { return null; }
  finally { unlink(mp4Path).catch(() => {}); }
}

// ── Enviar imagen NSFW ────────────────────────
async function sendNsfwImg(ctx, getUrl, label) {
  if (!requireNsfw(ctx)) return;
  if (!await requireNsfwLimit(ctx)) return;
  const { sock, from, msg, reply } = ctx;
  await ctx.react("🔞");
  try {
    const url = await getUrl();
    if (!url) return reply("❌ No se encontró imagen. Intenta de nuevo.");
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    const buf = Buffer.from(res.data);
    const ct = res.headers["content-type"] || "";
    const animated = isAnimatedUrl(url, ct);
    if (animated) {
      const mp4 = await gifToMp4Buffer(url);
      if (mp4) {
        await sock.sendMessage(from, { video: mp4, caption: `🔞 *${label}*`, gifPlayback: true, mimetype: "video/mp4" }, { quoted: msg });
        await ctx.react("✅");
        return;
      }
    }
    // Imagen estática — enviar normal
    await sock.sendMessage(from, { image: buf, caption: `🔞 *${label}*` }, { quoted: msg });
    await ctx.react("✅");
  } catch (e) {
    await reply("❌ Error al cargar. Intenta de nuevo.");
    await ctx.react("❌");
  }
}

// ── Detectar si una URL es GIF/video ──────────
function isAnimatedUrl(url, contentType) {
  if (!url) return false;
  const u = url.toLowerCase();
  const ct = (contentType || "").toLowerCase();
  return u.endsWith(".gif") || u.endsWith(".mp4") || u.endsWith(".webm") ||
         ct.includes("gif") || ct.includes("video");
}

// ── Enviar reacción NSFW con texto ────────────
async function sendNsfwReaction(ctx, getUrl, buildText) {
  if (!requireNsfw(ctx)) return;
  if (!await requireNsfwLimit(ctx)) return;
  const { sock, from, msg, sender } = ctx;
  const target = getTarget(ctx);
  const yo = ctx.pushName || sender.split("@")[0];
  const elTag = target ? `@${target.split("@")[0]}` : "alguien";
  const texto = buildText(yo, elTag);
  const mentions = [sender];
  if (target) mentions.push(target);
  await ctx.react("🔞");
  try {
    const url = await getUrl();
    if (!url) {
      await sock.sendMessage(from, { text: texto, mentions }, { quoted: msg });
      return;
    }
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    const buf = Buffer.from(res.data);
    const ct = res.headers["content-type"] || "";
    const animated = isAnimatedUrl(url, ct);
    if (animated) {
      const mp4 = await gifToMp4Buffer(url);
      if (mp4) {
        await sock.sendMessage(from, { video: mp4, caption: texto, gifPlayback: true, mimetype: "video/mp4", mentions }, { quoted: msg });
        return;
      }
    }
    // Imagen estática — enviar como imagen con el texto
    await sock.sendMessage(from, { image: buf, caption: texto, mentions }, { quoted: msg });
  } catch {
    await sock.sendMessage(from, { text: texto, mentions }, { quoted: msg });
  }
}

const nsfwReaccionesCommands = [

  // ══════════════════════════════════════════
  // CONTROL NSFW
  // ══════════════════════════════════════════
  {
    name: "nsfw",
    alias: ["nsfwmode"],
    description: "Activar/desactivar NSFW en el grupo",
    category: "NSFW 🔞",
    execute: async ({ reply, react, args, from, isGroupAdmin, isGroup }) => {
      if (isGroup && !isGroupAdmin) return reply("❌ Solo admins pueden cambiar esto.");
      const sub = (args[0] || "").toLowerCase();
      if (sub === "on") {
        nsfwChats.add(from);
        await react("🔞");
        await reply("🔞 *NSFW activado* en este grupo.\n_Los usuarios podrán usar comandos para adultos._");
      } else if (sub === "off") {
        nsfwChats.delete(from);
        await react("✅");
        await reply("✅ *NSFW desactivado* en este grupo.");
      } else {
        const estado = nsfwChats.has(from) ? "✅ *ACTIVADO*" : "❌ *DESACTIVADO*";
        await reply(`🔞 Estado NSFW: ${estado}\n\nUsa \`${config.prefix}nsfw on/off\` para cambiar.`);
      }
    },
  },

  // ══════════════════════════════════════════
  // MENÚ NSFW
  // ══════════════════════════════════════════
  {
    name: "menunsfw",
    alias: ["mnsfww", "nsfwmenu"],
    description: "Ver todos los comandos NSFW",
    category: "NSFW 🔞",
    execute: async ({ sock, from, msg, reply, sender, isOwner }) => {
      const p = config.prefix;
      const activo = nsfwChats.has(from);

      // Calcular usos NSFW del usuario (sin consumir)
      let nsfwUsosTexto = "";
      if (!isOwner) {
        const { getUser, isPremium: _ip, getPremiumPlan: _gpp, PLANES: _pl, FREE_NSFW_LIMIT: _fnl } = await import("../lib/database.js");
        const u = getUser(sender);
        const premActivo = u.premium && u.premiumExpiry && Date.now() < u.premiumExpiry;
        const plan = premActivo ? u.premiumPlan : null;
        const planData = plan ? _pl[plan] : null;
        const limit = planData ? planData.nsfwLimit : _fnl;
        const used = (Date.now() > (u.nsfwDailyReset || 0)) ? 0 : (u.nsfwDailyUsed || 0);
        const planEmoji = { semanal: "🎟️", plata: "🥈", dorado: "🥇", king: "👑", dios: "🔱" }[plan] || "🆓";
        const planLabel = plan ? (planData?.nombre || plan) : "Sin premium";
        nsfwUsosTexto = limit === null
          ? `\n│ ${planEmoji} ${planLabel}: ♾️ usos ilimitados`
          : `\n│ ${planEmoji} ${planLabel}: *${used}/${limit}* usos hoy`;
      } else {
        nsfwUsosTexto = "\n│ 👑 Owner: ♾️ Ilimitado";
      }

      const menu =
`╭─〔 🔞 *MENÚ NSFW* 〕
│ Estado: ${activo ? "✅ *ACTIVADO*" : "❌ *DESACTIVADO*"}${!activo ? `\n│ Activa con: \`${p}nsfw on\`` : ""}${nsfwUsosTexto}
├──────────────────────
│ 🌸 *ANIME NSFW*
│ • \`${p}hentai\` • \`${p}loli\` • \`${p}yuri\`
│ • \`${p}nekomimi\` \`${p}neko\`
│ • \`${p}pussy\`
├──────────────────────
│ 💦 *REACCIONES NSFW*
│ • \`${p}anal @u\` → Hacer un anal
│ • \`${p}ass\` \`${p}poto\` → Ver culo
│ • \`${p}blowjob @u\` \`${p}mamada\` \`${p}bj\`
│ • \`${p}boobjob @u\` → Rusa
│ • \`${p}cum @u\` → Venirse en alguien
│ • \`${p}cummouth @u\` → Acabar en la boca
│ • \`${p}cumshot @u\` → Disparar semen
│ • \`${p}fap\` \`${p}paja\` → Masturbarse
│ • \`${p}footjob @u\` → Paja con pies
│ • \`${p}fuck @u\` \`${p}coger\` → Follar
│ • \`${p}grabboobs @u\` → Agarrar tetas
│ • \`${p}grope @u\` → Manosear
│ • \`${p}handjob @u\` → Paja
│ • \`${p}lickass @u\` → Lamer culo
│ • \`${p}lickdick @u\` → Lamer pene
│ • \`${p}lickpussy @u\` → Lamer coño
│ • \`${p}sixnine @u\` \`${p}69\` → 69
│ • \`${p}spank @u\` \`${p}nalgada\`
│ • \`${p}suckboobs @u\` → Chupar tetas
│ • \`${p}undress @u\` \`${p}encuerar\`
├──────────────────────
│ 🔍 *BUSCADORES*
│ • \`${p}rule34 [tags]\` \`${p}r34\`
│ • \`${p}gelbooru [tags]\` \`${p}gbooru\`
│ • \`${p}danbooru [tags]\` \`${p}dbooru\`
│ • \`${p}e621 [tags]\`
│ • \`${p}dbooru2 [keyword]\` → Danbooru IA
│ • \`${p}gbooru2 [keyword]\` → Gelbooru IA
├──────────────────────
│ 🐾 *ESPECIALES*
│ • \`${p}furro\` \`${p}furry\` → Imagen furro
│ • \`${p}femboy\` \`${p}fem\` → Femboy
│ • \`${p}yuri2\` → Yuri GIF
│ • \`${p}loli2\` → Loli aleatoria
│ • \`${p}gayvid\` → Video gay
╰──────────────────────⬣`;
      try {
        const { readFile } = await import("fs/promises");
        const { join: _join, dirname } = await import("path");
        const { fileURLToPath } = await import("url");
        const __d = dirname(fileURLToPath(import.meta.url));
        const bannerPath = _join(__d, "../../assets/banner-nsfw.png");
        const bannerBuf = await readFile(bannerPath);
        await sock.sendMessage(from, { image: bannerBuf, caption: menu }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: menu }, { quoted: msg });
      }
    },
  },

  // ══════════════════════════════════════════
  // IMÁGENES NSFW
  // ══════════════════════════════════════════
  {
    name: "hentai", alias: ["hentai"],
    description: "Imagen hentai aleatoria", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwImg(ctx, () => fromWaifuPics("hentai").then(u => u || fromNekobot("hentai")), "Hentai"),
  },
  {
    name: "loli", alias: [],
    description: "Imagen loli aleatoria", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwImg(ctx, () => fromNekobot("hentai"), "Loli"),
  },
  {
    name: "yuri", alias: ["tijeras"],
    description: "Imagen yuri", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwImg(ctx, () => fromWaifuPics("hentai").then(u => u || fromNekobot("hentai")), "Yuri 🩷"),
  },
  {
    name: "nekomimi", alias: ["neko"],
    description: "Neko NSFW", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwImg(ctx, () => fromWaifuIm("neko").then(u => u || fromNekobot("nsfwneko")), "Nekomimi 🐱"),
  },
  {
    name: "pussy", alias: [],
    description: "Imagen pussy", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwImg(ctx, () => fromWaifuIm("pussy").then(u => u || fromNekobot("pussy")), "Pussy 💦"),
  },

  // ══════════════════════════════════════════
  // REACCIONES NSFW
  // ══════════════════════════════════════════
  {
    name: "anal", alias: [],
    description: "Hacer un anal @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromNekobot("anal").then(u => u || fromWaifuPics("hentai")),
      (yo, el) => `💦 *${yo}* le hace un anal a *${el}* 🍑`),
  },
  {
    name: "ass", alias: ["poto"],
    description: "Ver un culo", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwImg(ctx, () => fromWaifuIm("ass").then(u => u || fromNekobot("ass")), "Ass 🍑"),
  },
  {
    name: "blowjob", alias: ["mamada", "bj"],
    description: "Dar una mamada @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromWaifuPics("blowjob").then(u => u || fromNekobot("blowjob")),
      (yo, el) => `👅 *${yo}* le está dando una mamada a *${el}* 💦`),
  },
  {
    name: "boobjob", alias: [],
    description: "Hacer una rusa @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromNekobot("boobs"),
      (yo, el) => `🍒 *${yo}* le hace una rusa a *${el}* 😍`),
  },
  {
    name: "cum", alias: [],
    description: "Venirse en alguien @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromNekobot("cum"),
      (yo, el) => `💦 *${yo}* se viene encima de *${el}* 😳`),
  },
  {
    name: "cummouth", alias: [],
    description: "Acabar en la boca @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromNekobot("cum"),
      (yo, el) => `👄 *${yo}* acaba en la boca de *${el}* 💦`),
  },
  {
    name: "cumshot", alias: [],
    description: "Disparar semen @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromNekobot("cum"),
      (yo, el) => `💦 *${yo}* dispara semen sobre *${el}* 🎯`),
  },
  {
    name: "fap", alias: ["paja"],
    description: "Hacerse una paja", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromWaifuPics("hentai"),
      (yo) => `🖐️ *${yo}* se está haciendo una paja~ 💦`),
  },
  {
    name: "footjob", alias: [],
    description: "Paja con los pies @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromWaifuIm("thighs"),
      (yo, el) => `🦶 *${yo}* le hace una paja con los pies a *${el}* 💦`),
  },
  {
    name: "fuck", alias: ["coger"],
    description: "Follar @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromNekobot("hentai").then(u => u || fromWaifuPics("hentai")),
      (yo, el) => `🔥 *${yo}* se está cogiendo a *${el}* 💦😩`),
  },
  {
    name: "grabboobs", alias: [],
    description: "Agarrar tetas @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromNekobot("boobs"),
      (yo, el) => `🍒 *${yo}* le agarra las tetas a *${el}* 😏`),
  },
  {
    name: "grope", alias: [],
    description: "Manosear @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromWaifuPics("hentai"),
      (yo, el) => `🖐️ *${yo}* está manoseando a *${el}* 😳`),
  },
  {
    name: "handjob", alias: [],
    description: "Hacer una paja @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromNekobot("hentai"),
      (yo, el) => `🤜 *${yo}* le está haciendo una paja a *${el}* 💦`),
  },
  {
    name: "lickass", alias: [],
    description: "Lamer culo @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromNekobot("ass"),
      (yo, el) => `👅 *${yo}* le está lamiendo el culo a *${el}* 🍑`),
  },
  {
    name: "lickdick", alias: [],
    description: "Lamer pene @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromWaifuPics("blowjob"),
      (yo, el) => `👅 *${yo}* le está lamiendo el pene a *${el}* 💦`),
  },
  {
    name: "lickpussy", alias: [],
    description: "Lamer coño @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromNekobot("pussy"),
      (yo, el) => `👅 *${yo}* le está lamiendo el coño a *${el}* 💦`),
  },
  {
    name: "sixnine", alias: ["69"],
    description: "69 con @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromWaifuPics("hentai"),
      (yo, el) => `🔀 *${yo}* y *${el}* están haciendo el 69 💦😩`),
  },
  {
    name: "spank", alias: ["nalgada"],
    description: "Dar una nalgada @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromNekobot("ass"),
      (yo, el) => `👋 *${yo}* le da una nalgada a *${el}* 🍑💥`),
  },
  {
    name: "suckboobs", alias: [],
    description: "Chupar tetas @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromNekobot("boobs"),
      (yo, el) => `👄 *${yo}* le está chupando las tetas a *${el}* 🍒`),
  },
  {
    name: "undress", alias: ["encuerar"],
    description: "Desnudar @usuario", category: "NSFW 🔞",
    execute: (ctx) => sendNsfwReaction(ctx,
      () => fromWaifuPics("hentai"),
      (yo, el) => `👀 *${yo}* está desnudando a *${el}* 😳🔥`),
  },

  // ══════════════════════════════════════════
  // BUSCADORES
  // ══════════════════════════════════════════
  {
    name: "rule34", alias: ["r34"],
    description: "Buscar en Rule34 — !rule34 [tags]", category: "NSFW 🔞",
    execute: async (ctx) => {
      if (!requireNsfw(ctx)) return;
      if (!await requireNsfwLimit(ctx)) return;
      const tags = ctx.args.join(" ") || "hentai";
      await ctx.react("🔍");
      await sendNsfwImg(ctx, () => fromRule34(tags), "Rule34: " + tags);
    },
  },
  {
    name: "gelbooru", alias: ["gbooru", "booru"],
    description: "Buscar en Gelbooru — !gelbooru [tags]", category: "NSFW 🔞",
    execute: async (ctx) => {
      if (!requireNsfw(ctx)) return;
      if (!await requireNsfwLimit(ctx)) return;
      const tags = ctx.args.join(" ") || "hentai";
      await ctx.react("🔍");
      await sendNsfwImg(ctx, () => fromGelbooru(tags), "Gelbooru: " + tags);
    },
  },
  {
    name: "danbooru", alias: ["dbooru"],
    description: "Buscar en Danbooru — !danbooru [tags]", category: "NSFW 🔞",
    execute: async (ctx) => {
      if (!requireNsfw(ctx)) return;
      if (!await requireNsfwLimit(ctx)) return;
      const tags = ctx.args.join(" ") || "hentai";
      await ctx.react("🔍");
      await sendNsfwImg(ctx, () => fromDanbooru(tags), "Danbooru: " + tags);
    },
  },
  {
    name: "e621", alias: [],
    description: "Buscar en e621 — !e621 [tags]", category: "NSFW 🔞",
    execute: async (ctx) => {
      if (!requireNsfw(ctx)) return;
      if (!await requireNsfwLimit(ctx)) return;
      const tags = ctx.args.join(" ") || "furry";
      await ctx.react("🔍");
      await sendNsfwImg(ctx, async () => {
        try {
          const r = await axios.get("https://e621.net/posts.json?limit=20&tags=" + encodeURIComponent(tags + " rating:explicit"), {
            timeout: 10000,
            headers: { "User-Agent": "PRAGMATA BOT/3.0 (by owner)" }
          });
          const posts = r.data?.posts;
          if (!posts?.length) return null;
          const post = posts[Math.floor(Math.random() * Math.min(posts.length, 20))];
          return post?.file?.url || null;
        } catch { return null; }
      }, "e621: " + tags);
    },
  },

  // ── Evogb API ────────────────────────────────
  { name: "furro",   alias: ["furry"],         description: "Imagen furro aleatoria",   category: "NSFW 🔞",
    execute: async (ctx) => { await sendNsfwImg(ctx, () => fromEvogb("/nsfw/random/furro"),  "Furro");   } },

  { name: "yuri2",   alias: ["yuri2"],         description: "Imagen yuri GIF",          category: "NSFW 🔞",
    execute: async (ctx) => { await sendNsfwImg(ctx, () => fromEvogb("/nsfw/random/yuri2"), "Yuri 2");  } },

  { name: "femboy",  alias: ["fem"],           description: "Imagen femboy aleatoria",  category: "NSFW 🔞",
    execute: async (ctx) => { await sendNsfwImg(ctx, () => fromEvogb("/nsfw/random/femboy"), "Femboy"); } },

  { name: "loli2",   alias: [],                description: "Imagen loli aleatoria",    category: "NSFW 🔞",
    execute: async (ctx) => { await sendNsfwImg(ctx, () => fromEvogb("/nsfw/random/loli"), "Loli");     } },

  { name: "gayvid",  alias: ["videogay"],      description: "Video gay aleatorio",      category: "NSFW 🔞",
    execute: async (ctx) => {
      if (!requireNsfw(ctx)) return;
      if (!await requireNsfwLimit(ctx)) return;
      await ctx.react("🔞");
      try {
        const r = await axios.get("https://api.evogb.org/porn/video/gay", {
          params: { apikey: "evogb-Rk23OCHp" },
          timeout: 15000,
        });
        const url = r.data?.url;
        if (!url) return ctx.reply("❌ No se pudo obtener el video. Intenta de nuevo.");
        const buf = await gifToMp4Buffer(url);
        if (!buf) return ctx.reply("❌ Error descargando el video.");
        await ctx.sock.sendMessage(ctx.from, { video: buf, caption: "🔞 *Gay Video*" }, { quoted: ctx.msg });
      } catch { await ctx.reply("❌ Error al obtener el video."); }
    },
  },

  { name: "dbooru2", alias: ["danbooru2"],     description: "Buscar en Danbooru — !dbooru2 [keyword]", category: "NSFW 🔞",
    execute: async (ctx) => {
      const kw = ctx.args.join(" ") || "hentai";
      await sendNsfwImg(ctx, () => fromEvogbKeyword("/nsfw/danbooru", kw), "Danbooru: " + kw);
    },
  },

  { name: "gbooru2", alias: ["gelbooru2"],     description: "Buscar en Gelbooru — !gbooru2 [keyword]", category: "NSFW 🔞",
    execute: async (ctx) => {
      const kw = ctx.args.join(" ") || "hentai";
      await sendNsfwImg(ctx, () => fromEvogbKeyword("/nsfw/gelbooru", kw), "Gelbooru: " + kw);
    },
  },
];

export default nsfwReaccionesCommands;
