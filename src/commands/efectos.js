// ═══════════════════════════════════════════
//      PRAGMATA BOT — src/commands/efectos.js
//         Efectos de audio con ffmpeg
//              v1.0.0
// ═══════════════════════════════════════════

import { exec } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

// ── Filtros ffmpeg por efecto ─────────────────
const EFECTOS = {
  bass:      "bass=g=20,dynaudnorm=f=200",
  blown:     "acrusher=level_in=4:level_out=3:bits=8:mode=log:aa=1",
  deep:      "atempo=0.8,asetrate=44100*0.7",
  earrape:   "acrusher=level_in=10:level_out=10:bits=8:mode=log:aa=1,volume=10",
  fast:      "atempo=1.6",
  fat:       "atempo=0.8,asetrate=44100*1.3",
  nightcore: "atempo=1.3,asetrate=44100*1.25",
  reverse:   "areverse",
  robot:     "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75",
  slow:      "atempo=0.7",
  smooth:    "aecho=0.8:0.88:60:0.4,equalizer=f=3000:width_type=o:width=2:g=3",
  tupai:     "atempo=1.5,asetrate=44100*1.5",
};

async function applyEffect(ctx, effectName) {
  const { react, reply, sock, from, msg } = ctx;
  const filter = EFECTOS[effectName];

  // Verificar que haya audio citado
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted) return reply("❌ Responde a un audio/nota de voz con este comando.");

  const audioMsg = quoted.audioMessage || quoted.videoMessage;
  if (!audioMsg) return reply("❌ El mensaje citado debe ser un audio o video.");

  await react("⏳");

  const tmpIn = join(tmpdir(), "ragebot_efx_in_" + Date.now() + ".ogg");
  const tmpOut = join(tmpdir(), "ragebot_efx_out_" + Date.now() + ".ogg");

  try {
    // Descargar el audio citado
    const stanzaId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
    const participant = msg.message?.extendedTextMessage?.contextInfo?.participant || from;

    // Usar downloadMediaMessage de Baileys
    const { downloadMediaMessage } = await import("@whiskeysockets/baileys");
    const buffer = await downloadMediaMessage(
      {
        key: { remoteJid: from, id: stanzaId, participant },
        message: quoted,
      },
      "buffer",
      {}
    );

    await writeFile(tmpIn, buffer);

    // Aplicar efecto
    await execAsync(
      "ffmpeg -i \"" + tmpIn + "\" -af \"" + filter + "\" -c:a libopus -b:a 64k \"" + tmpOut + "\" -y",
      { timeout: 60000 }
    );

    const outBuffer = await readFile(tmpOut);
    await sock.sendMessage(from, {
      audio: outBuffer,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,
    }, { quoted: msg });

    await react("✅");
  } catch (err) {
    console.error("[EFECTOS]", effectName, err.message);
    await reply("❌ Error aplicando el efecto. Asegúrate de responder a un audio.");
    await react("❌");
  } finally {
    try { await unlink(tmpIn); } catch {}
    try { await unlink(tmpOut); } catch {}
  }
}

const efectosCommands = Object.keys(EFECTOS).map((name) => ({
  name,
  alias: [],
  description: "Efecto de audio: " + name + " (responde a un audio)",
  category: "Efectos 🎵",
  execute: (ctx) => applyEffect(ctx, name),
}));

export default efectosCommands;
