// ═══════════════════════════════════════════
//    PRAGMATA BOT — src/commands/reacciones.js
//       Sistema de reacciones con GIF v3.2
// ═══════════════════════════════════════════

import { exec } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

// ── Endpoints REALES de nekos.best (verificados) ─
// lurk, shoot, sleep, clap, shrug, stare, wave, poke, confused, smile,
// peck, wink, sip, blush, smug, tickle, yeet, think, highfive, feed,
// wag, bite, teehee, shocked, bleh, bored, nom, nya, yawn, facepalm,
// cuddle, kick, happy, carry, hug, kabedon, baka, bonk, pat, angry,
// spin, shake, run, nod, nope, kiss, dance, punch, handshake, slap,
// cry, lappillow, pout, blowkiss, handhold, salute, thumbsup, laugh,
// tableflip

const REACTION_MAP = {
  // ── Exactos ────────────────────────────────
  kiss:       "kiss",
  hug:        "hug",
  pat:        "pat",
  cuddle:     "cuddle",
  handhold:   "handhold",
  wave:       "wave",
  highfive:   "highfive",
  wink:       "wink",
  feed:       "feed",
  poke:       "poke",
  lick:       "lappillow",  // más cercano
  stare:      "stare",
  nom:        "nom",
  tickle:     "tickle",
  slap:       "slap",
  punch:      "punch",
  kick:       "kick",
  bite:       "bite",
  shoot:      "shoot",
  yeet:       "yeet",
  cry:        "cry",
  laugh:      "laugh",
  sleep:      "sleep",
  dance:      "dance",
  angry:      "angry",
  happy:      "happy",
  sad:        "cry",
  blush:      "blush",
  think:      "think",
  facepalm:   "facepalm",
  shrug:      "shrug",
  bored:      "bored",
  nod:        "nod",
  nope:       "nope",
  smug:       "smug",
  thumbsup:   "thumbsup",
  nervous:    "shake",
  panic:      "shocked",
  pout:       "pout",
  woah:       "shocked",
  yawn:       "yawn",
  run:        "run",
  confused:   "confused",
  clap:       "clap",
  bleh:       "bleh",
  // ── Aproximados (mejor opción visual) ──────
  greet:      "wave",
  coffee:     "sip",
  eat:        "nom",
  love:       "blowkiss",
  scared:     "shake",
  shy:        "blush",
  sing:       "teehee",
  walk:       "run",
  bath:       "wag",
  call:       "wave",
  cold:       "shake",
  cook:       "nom",
  dramatic:   "tableflip",
  draw:       "think",
  drunk:      "spin",
  gaming:     "smug",
  heat:       "yawn",
  impregnate: "kabedon",
  jump:       "spin",
  kill:       "bonk",
  kisscheek:  "peck",
  lewd:       "blush",
  psycho:     "baka",
  push:       "yeet",
  scream:     "shocked",
  seduce:     "blowkiss",
  smoke:      "lurk",
  spit:       "bleh",
  step:       "kick",
};

// ── Obtiene URL de GIF directo desde nekos.best ─
async function fetchGifUrl(tipo) {
  const endpoint = REACTION_MAP[tipo];
  if (!endpoint) return null;
  try {
    const res = await fetch(`https://nekos.best/api/v2/${endpoint}`, {
      headers: { "User-Agent": "PRAGMATA BOT/3.0" }
    });
    if (res.ok) {
      const json = await res.json();
      const url = json?.results?.[0]?.url;
      if (url) return url;
    }
  } catch {}
  // fallback genérico
  try {
    const res = await fetch(`https://nekos.best/api/v2/pat`, {
      headers: { "User-Agent": "PRAGMATA BOT/3.0" }
    });
    const json = await res.json();
    return json?.results?.[0]?.url || null;
  } catch {}
  return null;
}

// ── Obtiene el mencionado ──
function getTarget(ctx) {
  const mentioned =
    ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  return mentioned.length > 0 ? mentioned[0] : null;
}

// ── Convierte GIF/WEBP a MP4 o devuelve MP4 directo ──
async function gifToMp4Buffer(gifUrl) {
  const tmp = tmpdir();
  const ts  = Date.now();
  const mp4Path = join(tmp, `reac_${ts}.mp4`);
  try {
    const res = await fetch(gifUrl, { headers: { "User-Agent": "PRAGMATA BOT/3.0" } });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    const buf = Buffer.from(await res.arrayBuffer());

    // Si ya es MP4, devolverlo directo sin convertir
    if (contentType.includes("video/mp4") || gifUrl.endsWith(".mp4")) {
      return buf;
    }

    // Detectar formato real por magic bytes
    const isWebp = buf[0] === 0x52 && buf[1] === 0x49; // RIFF
    const isGif  = buf[0] === 0x47 && buf[1] === 0x49; // GIF

    if (!isWebp && !isGif) {
      // Puede ser mp4 aunque no tenga header correcto, intentar enviar directo
      return buf;
    }

    const ext     = isWebp ? "webp" : "gif";
    const inPath  = join(tmp, `reac_${ts}.${ext}`);
    await writeFile(inPath, buf);

    // Comando ffmpeg sin forzar -f gif para que detecte automáticamente
    await execAsync(
      `ffmpeg -i "${inPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${mp4Path}" -y`
    );
    const mp4Buf = await readFile(mp4Path);
    unlink(inPath).catch(() => {});
    return mp4Buf;
  } catch {
    return null;
  } finally {
    unlink(mp4Path).catch(() => {});
  }
}

// ── Envía reacción con GIF convertido a MP4 ──
async function sendGifReaction(ctx, tipo, buildText) {
  const { sock, from, msg, sender } = ctx;
  const target = getTarget(ctx);
  const mentions = [sender];
  if (target) mentions.push(target);

  const yo = ctx.pushName || sender.split("@")[0];
  const elTag = target ? `@${target.split("@")[0]}` : null;
  const texto = buildText(yo, elTag);

  try {
    const gifUrl = await fetchGifUrl(tipo);
    if (gifUrl) {
      const mp4Buffer = await gifToMp4Buffer(gifUrl);
      if (mp4Buffer) {
        await sock.sendMessage(from, {
          video: mp4Buffer,
          caption: texto,
          gifPlayback: true,
          mimetype: "video/mp4",
          mentions,
        }, { quoted: msg });
        return;
      }
    }
  } catch {}

  // Fallback a texto si todo falla
  await sock.sendMessage(from, { text: texto, mentions }, { quoted: msg });
}

const reactionCommands = [

  // ══ SOCIALES ══
  { name: "kiss", alias: ["besar","beso"],
    description: "Besa a alguien — !kiss @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "kiss", (yo, el) =>
      el ? `😘 *${yo}* está besando a *${el}* 💋` : `💋 *${yo}* manda besitos al aire~`) },

  { name: "hug", alias: ["abrazar","abrazo"],
    description: "Abraza — !hug @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "hug", (yo, el) =>
      el ? `🤗 *${yo}* le está dando un abrazo a *${el}* 💕` : `🤗 *${yo}* quiere un abrazo...`) },

  { name: "pat", alias: ["palmada","acariciar","carinyo"],
    description: "Palmadita — !pat @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "pat", (yo, el) =>
      el ? `🫶 *${yo}* le da palmaditas cariñosas a *${el}* 🥺` : `🫶 *${yo}* quiere dar palmaditas`) },

  { name: "cuddle", alias: ["mimos","apapachar"],
    description: "Hace mimos — !cuddle @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "cuddle", (yo, el) =>
      el ? `💞 *${yo}* le hace mimos a *${el}* 🥰` : `💞 *${yo}* quiere mimos`) },

  { name: "handhold", alias: ["tomarmano","holdhand"],
    description: "Toma de la mano — !handhold @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "handhold", (yo, el) =>
      el ? `🤝 *${yo}* tomó de la mano a *${el}* 💕` : `🤝 *${yo}* quiere que alguien le tome la mano`) },

  { name: "wave", alias: ["hola","saludar"],
    description: "Saluda — !wave @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "wave", (yo, el) =>
      el ? `👋 *${yo}* le saluda a *${el}* ¡Hola!` : `👋 *${yo}* saluda a todos ¡Hola!`) },

  { name: "highfive", alias: ["choca","chocarla"],
    description: "Choca los cinco — !highfive @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "highfive", (yo, el) =>
      el ? `🙌 *${yo}* chocó los cinco con *${el}* ¡Épico!` : `🙌 *${yo}* quiere chocar los cinco`) },

  { name: "wink", alias: ["guinar","ojito"],
    description: "Guiña el ojo — !wink @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "wink", (yo, el) =>
      el ? `😉 *${yo}* le guiña el ojo a *${el}*~` : `😉 *${yo}* guiña el ojo`) },

  { name: "feed", alias: ["alimentar","dacomida"],
    description: "Da de comer — !feed @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "feed", (yo, el) =>
      el ? `🍱 *${yo}* le está dando de comer a *${el}* ¡Ñam!` : `🍱 *${yo}* come solito`) },

  { name: "poke", alias: ["pokeara","molestar"],
    description: "Molesta — !poke @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "poke", (yo, el) =>
      el ? `👉 *${yo}* está molestando a *${el}* jeje` : `👉 *${yo}* quiere molestar a alguien`) },

  { name: "lick", alias: ["lamer","lamida"],
    description: "Lame — !lick @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "lick", (yo, el) =>
      el ? `👅 *${yo}* lamió a *${el}* 😳` : `👅 *${yo}* lame el aire`) },

  { name: "stare", alias: ["mirar","fijar"],
    description: "Mira fijamente — !stare @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "stare", (yo, el) =>
      el ? `👀 *${yo}* mira fijamente a *${el}*...` : `👀 *${yo}* mira fijamente al vacío`) },

  { name: "nom", alias: ["nomnom"],
    description: "Nom nom — !nom @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "nom", (yo, el) =>
      el ? `😋 *${yo}* nom nom a *${el}*` : `😋 *${yo}* nom nom nom`) },

  { name: "tickle", alias: ["cosquillas","cosquillear"],
    description: "Hace cosquillas — !tickle @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "tickle", (yo, el) =>
      el ? `🤣 *${yo}* le está haciendo cosquillas a *${el}* jajaja` : `🤣 *${yo}* quiere hacerle cosquillas a alguien`) },

  // ══ AGRESIVAS ══
  { name: "slap", alias: ["bofetada","cachetada"],
    description: "Bofetada — !slap @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "slap", (yo, el) =>
      el ? `🖐️ *${yo}* le pegó una bofetada a *${el}* 😤` : `🖐️ *${yo}* necesita golpear algo`) },

  { name: "punch", alias: ["golpear","pegar"],
    description: "Golpea — !punch @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "punch", (yo, el) =>
      el ? `👊 *${yo}* le metió un golpazo a *${el}* 💥` : `👊 *${yo}* golpea el aire`) },

  { name: "kick", alias: ["patear","patada"],
    description: "Patea — !kick @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "kick", (yo, el) =>
      el ? `🦵 *${yo}* le metió una patada a *${el}* 💢` : `🦵 *${yo}* patea al aire`) },

  { name: "bite", alias: ["morder","mordida"],
    description: "Muerde — !bite @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "bite", (yo, el) =>
      el ? `🦷 *${yo}* mordió a *${el}* ¡Au! 😬` : `🦷 *${yo}* muerde el aire`) },

  { name: "shoot", alias: ["disparar","bang"],
    description: "Dispara — !shoot @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "shoot", (yo, el) =>
      el ? `🔫 *${yo}* le disparó a *${el}* 💀` : `🔫 *${yo}* dispara al aire`) },

  { name: "yeet", alias: ["lanzar"],
    description: "Lanza — !yeet @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "yeet", (yo, el) =>
      el ? `🌪️ *${yo}* lanzó a *${el}* al espacio 🚀` : `🌪️ *${yo}* lanza cosas`) },

  // ══ EMOCIONES ══
  { name: "cry", alias: ["llorar","llanto"],
    description: "Llora", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "cry", (yo) =>
      `😢 *${yo}* está llorando... ¿alguien le da un abrazo?`) },

  { name: "laugh", alias: ["reir","jaja","lol"],
    description: "Ríe", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "laugh", (yo) =>
      `😂 *${yo}* no puede parar de reírse JAJAJAJA`) },

  { name: "sleep", alias: ["dormir","zzz"],
    description: "Se queda dormido", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "sleep", (yo) =>
      `😴 *${yo}* se quedó dormido... zzz`) },

  { name: "dance", alias: ["bailar","baile"],
    description: "Baila", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "dance", (yo) =>
      `💃 *${yo}* se puso a bailar ¡A moverse!`) },

  { name: "angry", alias: ["enojado","rage","enojo"],
    description: "Está enojado", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "angry", (yo) =>
      `😡 *${yo}* está ENOJADO 💢`) },

  { name: "happy", alias: ["feliz","alegre"],
    description: "Está feliz", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "happy", (yo) =>
      `😊 *${yo}* está súper feliz hoy 🎉`) },

  { name: "sad", alias: ["triste","tristeza"],
    description: "Está triste", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "sad", (yo) =>
      `😔 *${yo}* está muy triste...`) },

  { name: "blush", alias: ["ruborizar","pena"],
    description: "Se ruboriza", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "blush", (yo) =>
      `😳 *${yo}* se puso todo rojo de vergüenza`) },

  { name: "think", alias: ["pensar","hmm"],
    description: "Está pensando", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "think", (yo) =>
      `🤔 *${yo}* está pensando profundamente...`) },

  { name: "facepalm", alias: ["smh","verguenza2"],
    description: "Facepalm", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "facepalm", (yo, el) =>
      el ? `🤦 *${yo}* hace facepalm por culpa de *${el}*` : `🤦 *${yo}* hace facepalm`) },

  { name: "shrug", alias: ["nise","nosesabe"],
    description: "Se encoge de hombros", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "shrug", (yo) =>
      `🤷 *${yo}* ni idea la verdad`) },

  { name: "bored", alias: ["aburrido","aburrirse"],
    description: "Está aburrido", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "bored", (yo) =>
      `😑 *${yo}* está muy aburrido...`) },

  { name: "nod", alias: ["asentir"],
    description: "Asiente", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "nod", (yo) =>
      `🙂 *${yo}* asiente con la cabeza`) },

  { name: "nope", alias: ["negar","no2"],
    description: "Niega", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "nope", (yo) =>
      `🙅 *${yo}* dice que NO rotundamente`) },

  { name: "smug", alias: ["presumir","creido"],
    description: "Cara de suficiente", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "smug", (yo) =>
      `😏 *${yo}* pone cara de suficiente~`) },

  { name: "thumbsup", alias: ["ok2","like2"],
    description: "Pulgar arriba", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "thumbsup", (yo) =>
      `👍 *${yo}* le da un pulgar arriba`) },

  { name: "nervous", alias: ["nervioso","nervios"],
    description: "Está nervioso", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "nervous", (yo) =>
      `😰 *${yo}* está temblando de nervios...`) },

  { name: "panic", alias: ["panico","panicando"],
    description: "Está en pánico", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "panic", (yo) =>
      `😱 *${yo}* está en PÁNICO total`) },

  { name: "pout", alias: ["morritos","berrinche"],
    description: "Hace morritos", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "pout", (yo) =>
      `😤 *${yo}* está haciendo morritos`) },

  { name: "woah", alias: ["sorprendido","wow"],
    description: "Está sorprendido", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "woah", (yo) =>
      `😲 *${yo}* se quedó con la boca abierta 😮`) },

  { name: "yawn", alias: ["bostezar","bostezo"],
    description: "Bosteza", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "yawn", (yo) =>
      `🥱 *${yo}* bostezó... qué flojera`) },

  { name: "run", alias: ["correr","huir"],
    description: "Sale corriendo — !run @usuario", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "run", (yo, el) =>
      el ? `🏃 *${yo}* huye de *${el}* a toda velocidad` : `🏃 *${yo}* sale corriendo`) },

  { name: "confused", alias: ["confundido"],
    description: "Está confundido", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "confused", (yo) =>
      `😕 *${yo}* está muy confundido...`) },

  // ══ NUEVOS COMANDOS ══

  { name: "bath", alias: [],
    description: "Bañarse", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "bath", (yo, el) =>
      el ? `🛁 *${yo}* está bañando a *${el}*` : `🛁 *${yo}* se va a bañar~`) },

  { name: "bleh", alias: [],
    description: "Sacar la lengua", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "bleh", (yo, el) =>
      el ? `😛 *${yo}* le saca la lengua a *${el}*` : `😛 *${yo}* saca la lengua`) },

  { name: "call", alias: [],
    description: "Llamar a alguien", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "call", (yo, el) =>
      el ? `📞 *${yo}* está llamando a *${el}*` : `📞 *${yo}* está esperando una llamada...`) },

  { name: "clap", alias: ["aplaudir"],
    description: "Aplaudir", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "clap", (yo, el) =>
      el ? `👏 *${yo}* le aplaude a *${el}*` : `👏 *${yo}* aplaude`) },

  { name: "coffee", alias: ["cafe"],
    description: "Tomar café", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "coffee", (yo, el) =>
      el ? `☕ *${yo}* invita un café a *${el}*` : `☕ *${yo}* se toma un cafecito...`) },

  { name: "cold", alias: [],
    description: "Tener frío", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "cold", (yo, el) =>
      el ? `🥶 *${yo}* está congelándose junto a *${el}*` : `🥶 *${yo}* está temblando de frío...`) },

  { name: "cook", alias: [],
    description: "Cocinar", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "cook", (yo, el) =>
      el ? `👨‍🍳 *${yo}* cocina algo rico para *${el}*` : `👨‍🍳 *${yo}* está cocinando algo delicioso~`) },

  { name: "dramatic", alias: ["drama"],
    description: "Modo drama activado", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "dramatic", (yo, el) =>
      el ? `🎭 *${yo}* está siendo muy dramático con *${el}*` : `🎭 *${yo}* activa el modo DRAMA 🎬`) },

  { name: "draw", alias: [],
    description: "Dibujar", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "draw", (yo, el) =>
      el ? `✏️ *${yo}* dibuja el retrato de *${el}*` : `✏️ *${yo}* está dibujando algo~`) },

  { name: "drunk", alias: [],
    description: "Estar borracho", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "drunk", (yo, el) =>
      el ? `🍺 *${yo}* está borracho gracias a *${el}*` : `🍺 *${yo}* está completamente borracho 🥴`) },

  { name: "eat", alias: ["comer"],
    description: "Comer algo delicioso", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "eat", (yo, el) =>
      el ? `🍜 *${yo}* comparte su comida con *${el}*` : `🍜 *${yo}* está comiendo rico~`) },

  { name: "gaming", alias: [],
    description: "Jugar videojuegos", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "gaming", (yo, el) =>
      el ? `🎮 *${yo}* retó a *${el}* a jugar` : `🎮 *${yo}* está en modo gamer 🕹️`) },

  { name: "greet", alias: ["hi"],
    description: "Saludar a alguien", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "greet", (yo, el) =>
      el ? `👋 *${yo}* le dice hola a *${el}*` : `👋 *${yo}* saluda a todos~`) },

  { name: "heat", alias: [],
    description: "Tener calor", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "heat", (yo, el) =>
      el ? `🥵 *${yo}* se derrite de calor junto a *${el}*` : `🥵 *${yo}* se está derritiendo del calor...`) },

  { name: "impregnate", alias: ["preg", "preñar"],
    description: "Embarazar a alguien", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "impregnate", (yo, el) =>
      el ? `😏 *${yo}* quiere embarazar a *${el}* 💀` : `😏 *${yo}* está en modo reproductivo 💀`) },

  { name: "jump", alias: [],
    description: "Saltar", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "jump", (yo, el) =>
      el ? `🦘 *${yo}* salta encima de *${el}*` : `🦘 *${yo}* salta de emoción~`) },

  { name: "kill", alias: [],
    description: "Matar a alguien", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "kill", (yo, el) =>
      el ? `💀 *${yo}* eliminó a *${el}* del servidor 💀` : `💀 *${yo}* está en modo asesino...`) },

  { name: "kisscheek", alias: ["beso"],
    description: "Beso en la mejilla", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "kisscheek", (yo, el) =>
      el ? `😚 *${yo}* le da un besito en la mejilla a *${el}* 🥰` : `😚 *${yo}* manda besitos en la mejilla~`) },

  { name: "lewd", alias: [],
    description: "Hacer algo lascivo", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "lewd", (yo, el) =>
      el ? `😳 *${yo}* está siendo muy lascivo con *${el}*` : `😳 *${yo}* tiene pensamientos lascivos...`) },

  { name: "love", alias: ["amor"],
    description: "Sentirse enamorado", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "love", (yo, el) =>
      el ? `💕 *${yo}* está enamorado de *${el}* 💗` : `💕 *${yo}* está enamorado~`) },

  { name: "psycho", alias: [],
    description: "Modo psicópata", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "psycho", (yo, el) =>
      el ? `😈 *${yo}* se puso psicópata con *${el}*` : `😈 *${yo}* activa su modo PSICÓPATA 🔪`) },

  { name: "push", alias: [],
    description: "Empujar a alguien", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "push", (yo, el) =>
      el ? `💢 *${yo}* empuja a *${el}* 😤` : `💢 *${yo}* empuja todo lo que está en su camino`) },

  { name: "scared", alias: [],
    description: "Estar asustado", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "scared", (yo, el) =>
      el ? `😱 *${yo}* le tiene miedo a *${el}*` : `😱 *${yo}* está muerto de miedo...`) },

  { name: "scream", alias: [],
    description: "Gritar", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "scream", (yo, el) =>
      el ? `😤 *${yo}* le grita a *${el}*` : `😤 *${yo}* GRITA al vacío`) },

  { name: "seduce", alias: [],
    description: "Seducir a alguien", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "seduce", (yo, el) =>
      el ? `😘 *${yo}* está seduciendo a *${el}* 🌹` : `😘 *${yo}* intenta seducir a alguien~`) },

  { name: "shy", alias: ["timido"],
    description: "Sentir timidez", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "shy", (yo, el) =>
      el ? `😖 *${yo}* se pone tímido con *${el}*` : `😖 *${yo}* se muere de timidez~`) },

  { name: "sing", alias: [],
    description: "Cantar", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "sing", (yo, el) =>
      el ? `🎤 *${yo}* le canta una canción a *${el}*` : `🎤 *${yo}* está cantando a todo pulmón~`) },

  { name: "smoke", alias: [],
    description: "Fumar", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "smoke", (yo, el) =>
      el ? `🚬 *${yo}* fuma pensando en *${el}*` : `🚬 *${yo}* enciende un cigarro...`) },

  { name: "spit", alias: ["escupir"],
    description: "Escupir", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "spit", (yo, el) =>
      el ? `🤢 *${yo}* le escupe a *${el}*` : `🤢 *${yo}* escupe`) },

  { name: "step", alias: ["pisar"],
    description: "Pisar a alguien", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "step", (yo, el) =>
      el ? `👟 *${yo}* le pisa encima a *${el}*` : `👟 *${yo}* aplasta todo lo que encuentra`) },

  { name: "walk", alias: [],
    description: "Caminar", category: "Reacciones 🎭",
    execute: (ctx) => sendGifReaction(ctx, "walk", (yo, el) =>
      el ? `🚶 *${yo}* se va caminando con *${el}*` : `🚶 *${yo}* sale a caminar...`) },

  // ══ MENÚ ══
  {
    name: "reacciones",
    alias: ["reactions","reaccion"],
    description: "Lista todos los comandos de reacción",
    category: "Reacciones 🎭",
    execute: async ({ reply }) => {
      await reply(
`🎭 *REACCIONES CON GIF* 🎌
━━━━━━━━━━━━━━━━━━━━
💕 *Sociales:*
!kiss • !hug • !pat • !cuddle • !handhold
!wave • !highfive • !wink • !feed • !poke
!lick • !stare • !nom • !tickle • !greet
!call • !clap • !coffee • !cook • !eat
!kiss • !kisscheek • !love • !seduce • !hug
!bath • !sing • !dance • !cuddle

⚔️ *Acción (broma):*
!slap • !punch • !kick • !bite • !shoot
!yeet • !kill • !push • !step • !spit
!impregnate • !psycho • !scream

😄 *Emociones:*
!cry • !laugh • !sleep • !angry • !happy
!sad • !blush • !think • !facepalm • !shrug
!bored • !nod • !nope • !smug • !thumbsup
!nervous • !panic • !pout • !woah • !yawn
!run • !confused • !scared • !shy • !love
!dramatic • !lewd • !bleh • !pout

🎮 *Actividades:*
!gaming • !draw • !smoke • !drunk • !walk
!jump • !cold • !heat • !coffee • !cook

_Uso: !comando @usuario_`
      );
    },
  },
];

export default reactionCommands;
