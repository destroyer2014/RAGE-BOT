// ═══════════════════════════════════════════
//    RAGE-BOT — src/commands/reacciones.js
//       Sistema de reacciones con GIF v3.2
// ═══════════════════════════════════════════

import { exec } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

const ENDPOINTS = {
  // Sociales
  kiss:      "https://nekos.best/api/v2/kiss",
  hug:       "https://nekos.best/api/v2/hug",
  pat:       "https://nekos.best/api/v2/pat",
  cuddle:    "https://nekos.best/api/v2/cuddle",
  handhold:  "https://nekos.best/api/v2/handhold",
  wave:      "https://nekos.best/api/v2/wave",
  highfive:  "https://nekos.best/api/v2/highfive",
  wink:      "https://nekos.best/api/v2/wink",
  feed:      "https://nekos.best/api/v2/feed",
  poke:      "https://nekos.best/api/v2/poke",
  lick:      "https://nekos.best/api/v2/lick",
  stare:     "https://nekos.best/api/v2/stare",
  nom:       "https://nekos.best/api/v2/nom",
  tickle:    "https://nekos.best/api/v2/tickle",
  // Agresivas
  slap:      "https://nekos.best/api/v2/slap",
  punch:     "https://nekos.best/api/v2/punch",
  kick:      "https://nekos.best/api/v2/kick",
  bite:      "https://nekos.best/api/v2/bite",
  shoot:     "https://nekos.best/api/v2/shoot",
  yeet:      "https://nekos.best/api/v2/yeet",
  // Emociones
  cry:       "https://nekos.best/api/v2/cry",
  laugh:     "https://nekos.best/api/v2/laugh",
  sleep:     "https://nekos.best/api/v2/sleep",
  dance:     "https://nekos.best/api/v2/dance",
  angry:     "https://nekos.best/api/v2/angry",
  happy:     "https://nekos.best/api/v2/happy",
  sad:       "https://nekos.best/api/v2/sad",
  blush:     "https://nekos.best/api/v2/blush",
  think:     "https://nekos.best/api/v2/think",
  facepalm:  "https://nekos.best/api/v2/facepalm",
  shrug:     "https://nekos.best/api/v2/shrug",
  bored:     "https://nekos.best/api/v2/bored",
  nod:       "https://nekos.best/api/v2/nod",
  nope:      "https://nekos.best/api/v2/nope",
  smug:      "https://nekos.best/api/v2/smug",
  thumbsup:  "https://nekos.best/api/v2/thumbsup",
  nervous:   "https://nekos.best/api/v2/nervous",
  panic:     "https://nekos.best/api/v2/panic",
  pout:      "https://nekos.best/api/v2/pout",
  woah:      "https://nekos.best/api/v2/woah",
  yawn:      "https://nekos.best/api/v2/yawn",
  run:       "https://nekos.best/api/v2/run",
  confused:  "https://nekos.best/api/v2/confused",
};

// ── Obtiene la URL del GIF ──
async function fetchGifUrl(tipo) {
  try {
    const res = await fetch(ENDPOINTS[tipo], {
      headers: { "User-Agent": "RAGE-BOT/3.0" }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.results?.[0]?.url || null;
  } catch {
    return null;
  }
}

// ── Convierte GIF a MP4 con ffmpeg y devuelve buffer ──
async function gifToMp4Buffer(gifUrl) {
  const tmp = tmpdir();
  const gifPath = join(tmp, `reac_${Date.now()}.gif`);
  const mp4Path = join(tmp, `reac_${Date.now()}.mp4`);
  try {
    // Descargar GIF
    const res = await fetch(gifUrl, { headers: { "User-Agent": "RAGE-BOT/3.0" } });
    if (!res.ok) return null;
    const gifBuf = Buffer.from(await res.arrayBuffer());
    await writeFile(gifPath, gifBuf);

    // Convertir GIF → MP4 con ffmpeg
    await execAsync(
      `ffmpeg -f gif -i "${gifPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${mp4Path}" -y`
    );

    const mp4Buf = await readFile(mp4Path);
    return mp4Buf;
  } catch {
    return null;
  } finally {
    unlink(gifPath).catch(() => {});
    unlink(mp4Path).catch(() => {});
  }
}

// ── Obtiene el mencionado ──
function getTarget(ctx) {
  const mentioned =
    ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  return mentioned.length > 0 ? mentioned[0] : null;
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
!kiss (Beso) • !hug (Abrazo) • !pat (Palmadita)
!cuddle (Mimos) • !handhold (Tomar mano)
!wave (Saludar) • !highfive (Chocar cinco)
!wink (Guiño) • !feed (Dar de comer)
!poke (Molestar) • !lick (Lamer)
!stare (Mirar fijo) • !nom (Nom nom)
!tickle (Cosquillas)

⚔️ *Agresivas (broma):*
!slap (Bofetada) • !punch (Golpe)
!kick (Patada) • !bite (Mordida)
!shoot (Disparar) • !yeet (Lanzar)

😄 *Emociones:*
!cry (Llorar) • !laugh (Reír) • !sleep (Dormir)
!dance (Bailar) • !angry (Enojado) • !happy (Feliz)
!sad (Triste) • !blush (Ruborizar) • !think (Pensar)
!facepalm • !shrug (Hombros) • !bored (Aburrido)
!nod (Asentir) • !nope (Negar) • !smug (Presumir)
!thumbsup (👍) • !nervous (Nervioso) • !panic (Pánico)
!pout (Morritos) • !woah (Sorpresa) • !yawn (Bostezo)
!run (Correr) • !confused (Confundido)

_Uso: !comando @usuario_`
      );
    },
  },
];

export default reactionCommands;
