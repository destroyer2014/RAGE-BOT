// ═══════════════════════════════════════════
//    PRAGMATA BOT — src/commands/premium.js
//        Comandos exclusivos Premium
// ═══════════════════════════════════════════

import config from "../../config.js";
import { isPremium, getPremiumPlan, isPlanAtLeast, getUser, addXP, setXP } from "../lib/database.js";
import QRCode from "qrcode";

// ── Helper: bloquear si no es premium ───────
function gatePremium(isPrem, reply) {
  if (!isPrem) {
    reply(
      `⭐ *Comando PREMIUM*\n\n` +
      `Este comando es exclusivo para usuarios premium.\n` +
      `Escribe *!adqpremium* para ver los planes 💎\n` +
      `📞 Contacto: +${config.ownerNumber}`
    );
    return true;
  }
  return false;
}

// ── Tipo de cambio fijo PEN→USD ──────────────
const PEN_USD = 0.27;

// ── Wordle — palabra del día ─────────────────
const WORDLE_WORDS = [
  "GATOS","PLAYA","FUEGO","MUNDO","LIBRO","CIELO","VERDE","NEGRO","PERRO","BOTAS",
  "CARRO","LLAVE","MANOS","JUEGO","POLVO","CAMPO","FIERA","RATON","VELAS","HUEVO",
];
function getWordleWord() {
  const idx = Math.floor(Date.now() / 86400000) % WORDLE_WORDS.length;
  return WORDLE_WORDS[idx];
}
const wordleGames = new Map(); // jid → { word, intentos, tablero }

// ── Trivia pool ──────────────────────────────
const TRIVIA_POOL = [
  { p:"¿Cuántos planetas tiene el sistema solar?", r:"8", opts:["6","7","8","9"] },
  { p:"¿Cuál es el océano más grande?", r:"Pacífico", opts:["Atlántico","Índico","Pacífico","Ártico"] },
  { p:"¿Capital de Japón?", r:"Tokio", opts:["Osaka","Tokio","Seúl","Pekín"] },
  { p:"¿Quién pintó la Mona Lisa?", r:"Da Vinci", opts:["Picasso","Da Vinci","Rembrandt","Van Gogh"] },
  { p:"¿Cuántos lados tiene un hexágono?", r:"6", opts:["5","6","7","8"] },
  { p:"¿En qué año llegó el hombre a la Luna?", r:"1969", opts:["1965","1967","1969","1972"] },
  { p:"¿Cuál es el metal más abundante en la Tierra?", r:"Aluminio", opts:["Hierro","Cobre","Aluminio","Oro"] },
  { p:"¿Cuántos huesos tiene el cuerpo humano adulto?", r:"206", opts:["201","206","215","220"] },
];
const triviaActive = new Map(); // from → { trivia, answer, timeout }

const premiumCommands = [

  // ════════════════════════════════════════
  //   🤖 IA & UTILIDADES
  // ════════════════════════════════════════

  {
    name: "ocr",
    alias: ["leerimg", "textoimg"],
    description: "Extrae texto de una imagen (responde a la imagen)",
    category: "Premium-IA",
    premiumOnly: true,
    execute: async ({ sock, from, msg, reply, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imgData = quoted?.imageMessage;
      if (!imgData) return reply("📷 Responde a una imagen con *!ocr*");

      await reply("🔍 Extrayendo texto... espera un momento.");
      try {
        const stream = await sock.downloadMediaMessage({ message: { imageMessage: imgData } });
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const b64 = Buffer.concat(chunks).toString("base64");

        const apiKey = config.anthropicApiKey;
        if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
          return reply("❌ El owner no ha configurado la API key de Anthropic.\nContacta al administrador.");
        }
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1000,
            messages: [{
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
                { type: "text", text: "Extrae y devuelve únicamente el texto visible en esta imagen, sin comentarios extra." }
              ]
            }]
          })
        });
        const data = await res.json();
        if (data.error) return reply("❌ Error IA: " + data.error.message);
        const text = data.content?.[0]?.text || "No se encontró texto en la imagen.";
        await reply(`📄 *Texto extraído:*\n\n${text}`);
      } catch (e) {
        await reply("❌ Error al procesar la imagen: " + e.message);
      }
    },
  },

  {
    name: "qr",
    alias: ["generarqr", "qrcode"],
    description: "Genera un código QR de cualquier texto o URL",
    category: "Premium-IA",
    premiumOnly: true,
    execute: async ({ sock, from, msg, reply, args, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const texto = args.join(" ");
      if (!texto) return reply("📝 Uso: *!qr [texto o URL]*");
      try {
        const buf = await QRCode.toBuffer(texto, { width: 400, margin: 2 });
        await sock.sendMessage(from, { image: buf, caption: `🔲 *QR generado:*\n${texto}` }, { quoted: msg });
      } catch {
        await reply("❌ Error al generar el QR.");
      }
    },
  },

  {
    name: "moneda",
    alias: ["convertir", "cambio", "divisa"],
    description: "Conversor de divisas en tiempo real",
    category: "Premium-IA",
    premiumOnly: true,
    execute: async ({ reply, args, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      if (args.length < 3) return reply("💱 Uso: *!moneda [cantidad] [DE] [A]*\nEj: *!moneda 100 USD PEN*");
      const [cantidad, de, a] = [parseFloat(args[0]), args[1].toUpperCase(), args[2].toUpperCase()];
      if (isNaN(cantidad)) return reply("❌ La cantidad debe ser un número.");
      try {
        const res  = await fetch(`https://api.exchangerate-api.com/v4/latest/${de}`);
        const data = await res.json();
        if (!data.rates?.[a]) return reply(`❌ No encontré la divisa *${a}*.`);
        const result = (cantidad * data.rates[a]).toFixed(2);
        await reply(
          `💱 *Conversor de Divisas*\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `• ${cantidad} *${de}* = *${result} ${a}*\n` +
          `• Tasa: 1 ${de} = ${data.rates[a].toFixed(4)} ${a}\n` +
          `_Datos en tiempo real_`
        );
      } catch {
        await reply("❌ Error al obtener tasas de cambio.");
      }
    },
  },

  {
    name: "traducir",
    alias: ["translate", "trad"],
    description: "Traduce texto a cualquier idioma con IA",
    category: "Premium-IA",
    premiumOnly: true,
    execute: async ({ reply, args, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      if (args.length < 2) return reply("🌐 Uso: *!traducir [idioma] [texto]*\nEj: *!traducir inglés Hola mundo*");
      const idioma = args[0];
      const texto  = args.slice(1).join(" ");
      try {
        const res  = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 500,
            messages: [{ role: "user", content: `Traduce al ${idioma} el siguiente texto. Devuelve solo la traducción, sin explicaciones:\n\n${texto}` }]
          })
        });
        const data = await res.json();
        const trad = data.content?.[0]?.text || "No se pudo traducir.";
        await reply(`🌐 *Traducción al ${idioma}:*\n\n${trad}`);
      } catch {
        await reply("❌ Error al traducir.");
      }
    },
  },

  {
    name: "totext",
    alias: ["transcribir", "audio2text", "voz2texto"],
    description: "Transcribe audios/notas de voz a texto con IA",
    category: "Premium-IA",
    premiumOnly: true,
    execute: async ({ sock, from, msg, reply, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const audio  = quoted?.audioMessage || quoted?.videoMessage;
      if (!audio) return reply("🎙️ Responde a una nota de voz con *!totext*");
      await reply("🎙️ Transcribiendo audio... (función requiere API de transcripción configurada)");
      // Integración con Whisper/AssemblyAI — requiere API key en config
      await reply(
        "⚠️ Para activar esta función configura tu API key de AssemblyAI o Whisper en *config.js*:\n" +
        "`transcribeApiKey: \"TU_API_KEY\"`"
      );
    },
  },

  {
    name: "resumir",
    alias: ["resume", "summary", "tldr"],
    description: "Resume textos largos o documentos con IA",
    category: "Premium-IA",
    premiumOnly: true,
    execute: async ({ reply, args, msg, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const texto  = args.join(" ") || quoted?.conversation || quoted?.extendedTextMessage?.text;
      if (!texto || texto.length < 50) return reply("📄 Uso: *!resumir [texto largo]* o responde a un mensaje con *!resumir*");
      await reply("⏳ Resumiendo...");
      try {
        const res  = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 600,
            messages: [{ role: "user", content: `Resume el siguiente texto de forma clara y concisa en español:\n\n${texto}` }]
          })
        });
        const data = await res.json();
        const res2 = data.content?.[0]?.text || "No se pudo resumir.";
        await reply(`📋 *Resumen:*\n\n${res2}`);
      } catch {
        await reply("❌ Error al resumir.");
      }
    },
  },

  {
    name: "imagen",
    alias: ["genimg", "aiimg", "imagenia"],
    description: "Genera imágenes con IA (describe lo que quieres)",
    category: "Premium-IA",
    premiumOnly: true,
    execute: async ({ reply, args, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const desc = args.join(" ");
      if (!desc) return reply("🎨 Uso: *!imagen [descripción]*\nEj: *!imagen un dragón en el espacio*");
      await reply(
        "🎨 *Generación de imágenes con IA*\n\n" +
        "Para activar esta función conecta una API de generación de imágenes:\n" +
        "• Stability AI (stable-diffusion)\n" +
        "• Replicate\n" +
        "• OpenAI DALL·E\n\n" +
        "Agrega tu API key en *config.js*:\n`imageApiKey: \"TU_API_KEY\"`"
      );
    },
  },

  // ════════════════════════════════════════
  //   🎨 IMAGEN & STICKERS
  // ════════════════════════════════════════

  {
    name: "pdf",
    alias: ["webpdf", "url2pdf", "pagepdf"],
    description: "Convierte una página web a PDF",
    category: "Premium-IA",
    premiumOnly: true,
    execute: async ({ reply, args, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const url = args[0];
      if (!url || !url.startsWith("http")) return reply("🌐 Uso: *!pdf [url]*\nEj: *!pdf https://ejemplo.com*");
      await reply(
        `📄 *Conversión a PDF*\n\n` +
        `Para convertir páginas web a PDF instala puppeteer:\n` +
        `\`npm install puppeteer\`\n\n` +
        `O usa esta API gratuita directamente en tu navegador:\n` +
        `🔗 https://api.html2pdf.app/v1/generate?url=${encodeURIComponent(url)}`
      );
    },
  },

  {
    name: "fondo",
    alias: ["background", "bgcolor", "cambiafondo"],
    description: "Cambia el fondo de una imagen (responde a imagen)",
    category: "Premium-Imagen",
    premiumOnly: true,
    execute: async ({ sock, from, msg, reply, args, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imgData = quoted?.imageMessage;
      if (!imgData) return reply("🖼️ Responde a una imagen con *!fondo [color]*\nEj: *!fondo rojo*\nColores: rojo, azul, verde, negro, blanco, amarillo");
      const color = (args[0] || "blanco").toLowerCase();
      const colores = { rojo:"#FF0000", azul:"#0000FF", verde:"#00FF00", negro:"#000000", blanco:"#FFFFFF", amarillo:"#FFFF00", morado:"#800080", naranja:"#FFA500", rosa:"#FF69B4", gris:"#808080" };
      const hex = colores[color] || color;
      try {
        const stream = await sock.downloadMediaMessage({ message: { imageMessage: imgData } });
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const inputBuf = Buffer.concat(chunks);
        const sharp = (await import("sharp")).default;
        const meta = await sharp(inputBuf).metadata();
        const bg = await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: hex } }).png().toBuffer();
        const result = await sharp(bg).composite([{ input: inputBuf }]).jpeg().toBuffer();
        await sock.sendMessage(from, { image: result, caption: `🖼️ Fondo cambiado a *${color}*` }, { quoted: msg });
      } catch (e) {
        await reply(`❌ Error al cambiar el fondo. Asegúrate de tener \`sharp\` instalado.`);
      }
    },
  },

  {
    name: "meme",
    alias: ["generarmeme", "hacermeme"],
    description: "Genera memes con texto en imagen",
    category: "Premium-Imagen",
    premiumOnly: true,
    execute: async ({ sock, from, msg, reply, args, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const texto = args.join(" ");
      if (!texto) return reply("😂 Uso: *!meme [texto arriba | texto abajo]*\nEj: *!meme cuando pides premium | y no tienes saldo*");
      const partes = texto.split("|").map(t => t.trim());
      const top    = encodeURIComponent(partes[0] || "_");
      const bottom = encodeURIComponent(partes[1] || "_");
      const url    = `https://api.memegen.link/images/drake/${top}/${bottom}.png`;
      try {
        const res = await fetch(url);
        const buf = Buffer.from(await res.arrayBuffer());
        await sock.sendMessage(from, { image: buf, caption: "😂 *Meme generado* — PRAGMATA BOT Premium" }, { quoted: msg });
      } catch {
        await reply("❌ Error al generar el meme.");
      }
    },
  },

  {
    name: "filtro",
    alias: ["filter", "efecto"],
    description: "Aplica filtros a fotos (responde a una imagen)",
    category: "Premium-Imagen",
    premiumOnly: true,
    execute: async ({ reply, sock, from, msg, args, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const tipos = ["blur", "gris", "sepia", "negativo", "brillo", "contraste"];
      const tipo  = args.join(" ").toLowerCase();
      if (!tipo) return reply(`🎨 Uso: *!filtro [tipo]*\nFiltros disponibles: ${tipos.join(", ")}\n\nResponde a una imagen con el comando.`);
      if (!tipos.includes(tipo)) return reply(`❌ Filtro no válido.\nDisponibles: ${tipos.join(", ")}`);

      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imgMsg = quoted?.imageMessage;
      if (!imgMsg) return reply("📷 Responde a una imagen con *!filtro [tipo]*");

      await reply("🎨 Aplicando filtro *" + tipo + "*...");
      try {
        const { Jimp } = await import("jimp");
        const stream = await sock.downloadMediaMessage({ message: { imageMessage: imgMsg } });
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        const img = await Jimp.fromBuffer(buffer);
        if (tipo === "gris")      img.greyscale();
        if (tipo === "sepia")     img.sepia();
        if (tipo === "negativo")  img.invert();
        if (tipo === "blur")      img.blur(4);
        if (tipo === "brillo")    img.brightness(0.3);
        if (tipo === "contraste") img.contrast(0.5);

        const outBuf = await img.getBuffer("image/jpeg");
        await sock.sendMessage(from, {
          image: outBuf,
          caption: `🎨 Filtro *${tipo}* aplicado`,
        }, { quoted: msg });
      } catch (e) {
        await reply("❌ Error al aplicar filtro: " + e.message);
      }
    },
  },

  {
    name: "collage",
    alias: ["unirfotos", "grid"],
    description: "Une varias fotos en un collage",
    category: "Premium-Imagen",
    premiumOnly: true,
    execute: async ({ reply, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      await reply(
        "🖼️ *Collage de fotos*\n\n" +
        "Envía varias imágenes seguidas y luego escribe *!collage* — función en desarrollo.\n" +
        "Requiere paquete `sharp`: `npm install sharp`"
      );
    },
  },

  // ════════════════════════════════════════
  //   🎵 MÚSICA
  // ════════════════════════════════════════

  {
    name: "letra",
    alias: ["lyrics", "lyric"],
    description: "Busca la letra de una canción",
    category: "Premium-Música",
    premiumOnly: true,
    execute: async ({ reply, args, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const cancion = args.join(" ");
      if (!cancion) return reply("🎵 Uso: *!letra [canción - artista]*");
      await reply(`🔍 Buscando letra de: *${cancion}*...`);
      try {
        const res  = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(cancion.replace(/ - /,"/").replace(/ /,"/"))}`);
        const data = await res.json();
        if (data.lyrics) {
          const corta = data.lyrics.slice(0, 3000);
          await reply(`🎵 *Letra: ${cancion}*\n\n${corta}${data.lyrics.length > 3000 ? "\n\n_(letra recortada por longitud)_" : ""}`);
        } else {
          // Fallback: usar IA
          const r2   = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 800,
              messages: [{ role: "user", content: `Dame el nombre del artista y álbum de la canción "${cancion}". No incluyas la letra completa, solo datos de la canción y dónde encontrarla.` }]
            })
          });
          const d2 = await r2.json();
          await reply(`🎵 *${cancion}*\n\n${d2.content?.[0]?.text || "No se encontró la letra."}`);
        }
      } catch {
        await reply("❌ Error buscando la letra.");
      }
    },
  },

  {
    name: "spotify",
    alias: ["spoti", "buscarsong"],
    description: "Busca info de una canción en Spotify",
    category: "Premium-Música",
    premiumOnly: true,
    execute: async ({ reply, args, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const cancion = args.join(" ");
      if (!cancion) return reply("🎵 Uso: *!spotify [canción]*");
      try {
        const res  = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cancion)}&entity=song&limit=1`);
        const data = await res.json();
        const t    = data.results?.[0];
        if (!t) return reply(`❌ No encontré *${cancion}* en el catálogo.`);
        await reply(
          `🎵 *Resultado musical:*\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `🎤 *Artista:* ${t.artistName}\n` +
          `💿 *Canción:* ${t.trackName}\n` +
          `📀 *Álbum:* ${t.collectionName}\n` +
          `📅 *Año:* ${t.releaseDate?.slice(0,4)}\n` +
          `⏱️ *Duración:* ${Math.floor(t.trackTimeMillis/60000)}:${String(Math.floor((t.trackTimeMillis%60000)/1000)).padStart(2,"0")}\n` +
          `🔗 *Link:* ${t.trackViewUrl}`
        );
      } catch {
        await reply("❌ Error buscando la canción.");
      }
    },
  },

  {
    name: "shazam",
    alias: ["identificar", "quecancion"],
    description: "Identifica una canción por audio (responde a audio)",
    category: "Premium-Música",
    premiumOnly: true,
    execute: async ({ reply, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      await reply(
        "🎵 *Shazam Bot*\n\n" +
        "Para identificar canciones por audio, conecta la API de AudD.io:\n" +
        "• Regístrate en https://audd.io\n" +
        "• Agrega en *config.js*: `auddApiKey: \"TU_KEY\"`\n" +
        "• Luego esta función quedará activa automáticamente."
      );
    },
  },

  // ════════════════════════════════════════
  //   🌐 REDES SOCIALES
  // ════════════════════════════════════════

  {
    name: "twitter",
    alias: ["tw", "perfiltw"],
    description: "Ver info de un perfil de Twitter/X",
    category: "Premium-Redes",
    premiumOnly: true,
    execute: async ({ reply, args, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const usuario = (args[0] || "").replace("@","");
      if (!usuario) return reply("🐦 Uso: *!twitter [@usuario]*");
      await reply(
        `🐦 *Twitter/X — @${usuario}*\n\n` +
        `Para ver perfiles en tiempo real, configura la API de Twitter v2:\n` +
        `• Bearer Token en *config.js*: \`twitterBearer: \"TU_TOKEN\"\``
      );
    },
  },

  {
    name: "clima",
    alias: ["weather", "tiempo"],
    description: "Clima detallado de cualquier ciudad",
    category: "Premium-Utilidades",
    premiumOnly: true,
    execute: async ({ reply, args, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const ciudad = args.join(" ");
      if (!ciudad) return reply("🌤️ Uso: *!clima [ciudad]*");
      try {
        const res  = await fetch(`https://wttr.in/${encodeURIComponent(ciudad)}?format=j1`);
        const data = await res.json();
        const cur  = data.current_condition?.[0];
        const area = data.nearest_area?.[0];
        if (!cur) return reply("❌ No se encontró esa ciudad.");
        const nombre = area?.areaName?.[0]?.value || ciudad;
        const pais   = area?.country?.[0]?.value || "";
        await reply(
          `🌤️ *Clima en ${nombre}, ${pais}*\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `🌡️ *Temperatura:* ${cur.temp_C}°C / ${cur.temp_F}°F\n` +
          `💧 *Humedad:* ${cur.humidity}%\n` +
          `🌬️ *Viento:* ${cur.windspeedKmph} km/h\n` +
          `👁️ *Visibilidad:* ${cur.visibility} km\n` +
          `☁️ *Estado:* ${cur.weatherDesc?.[0]?.value}\n` +
          `_Datos en tiempo real_`
        );
      } catch {
        await reply("❌ Error al obtener el clima.");
      }
    },
  },

  // ════════════════════════════════════════
  //   🎮 JUEGOS
  // ════════════════════════════════════════

  {
    name: "trivia",
    alias: ["pregunta", "quiz"],
    description: "Juega trivia de preguntas y respuestas",
    category: "Premium-Juegos",
    premiumOnly: true,
    execute: async ({ sock, from, msg, reply, args, isPremium: isPrem, sender }) => {
      if (gatePremium(isPrem, reply)) return;
      if (triviaActive.has(from)) {
        // Responder trivia activa
        const game   = triviaActive.get(from);
        const resp   = args.join(" ").trim();
        if (!resp) return reply(`❓ *Trivia activa:*\n${game.trivia.p}\n\nOpciones: ${game.trivia.opts.join(" | ")}`);
        clearTimeout(game.timeout);
        triviaActive.delete(from);
        if (resp.toLowerCase() === game.trivia.r.toLowerCase()) {
          return reply(`✅ *¡Correcto, @${sender.split("@")[0]}!*\nLa respuesta era: *${game.trivia.r}* 🎉`);
        } else {
          return reply(`❌ *¡Incorrecto!*\nLa respuesta correcta era: *${game.trivia.r}*`);
        }
      }
      // Nueva pregunta
      const t = TRIVIA_POOL[Math.floor(Math.random() * TRIVIA_POOL.length)];
      const tm = setTimeout(() => {
        triviaActive.delete(from);
        sock.sendMessage(from, { text: `⏰ *Tiempo agotado!*\nLa respuesta era: *${t.r}*` });
      }, 30000);
      triviaActive.set(from, { trivia: t, timeout: tm });
      await reply(
        `🧠 *TRIVIA PREMIUM*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `❓ ${t.p}\n\n` +
        `Opciones: *${t.opts.join(" | ")}*\n\n` +
        `_Responde con !trivia [tu respuesta] — 30 segundos_`
      );
    },
  },

  {
    name: "wordle",
    alias: ["adivinar", "palabrita"],
    description: "Adivina la palabra del día (5 letras, 6 intentos)",
    category: "Premium-Juegos",
    premiumOnly: true,
    execute: async ({ reply, args, isPremium: isPrem, sender }) => {
      if (gatePremium(isPrem, reply)) return;
      const key   = sender;
      const word  = getWordleWord();

      if (!wordleGames.has(key)) {
        wordleGames.set(key, { word, intentos: 0, tablero: [] });
        return reply(
          `🟩 *WORDLE PREMIUM*\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `Adivina la palabra del día de *5 letras*.\n` +
          `Tienes *6 intentos*.\n\n` +
          `🟩 = letra correcta en su lugar\n` +
          `🟨 = letra en la palabra, lugar incorrecto\n` +
          `⬛ = letra no está en la palabra\n\n` +
          `Usa *!wordle [palabra]* para adivinar.`
        );
      }

      const game  = wordleGames.get(key);
      const guess = (args[0] || "").toUpperCase().trim();

      if (!guess) {
        const tablero = game.tablero.join("\n") || "_(sin intentos aún)_";
        return reply(`🟩 *WORDLE* — Intento ${game.intentos}/6\n\n${tablero}\n\nUsa *!wordle [palabra]*`);
      }
      if (guess.length !== 5) return reply("❌ La palabra debe tener exactamente *5 letras*.");

      game.intentos++;
      let fila = "";
      for (let i = 0; i < 5; i++) {
        if (guess[i] === word[i])             fila += "🟩";
        else if (word.includes(guess[i]))     fila += "🟨";
        else                                   fila += "⬛";
      }
      fila += ` ${guess}`;
      game.tablero.push(fila);

      if (guess === word) {
        wordleGames.delete(key);
        return reply(`🎉 *¡Ganaste!* La palabra era *${word}*\n\n${game.tablero.join("\n")}`);
      }
      if (game.intentos >= 6) {
        wordleGames.delete(key);
        return reply(`❌ *¡Sin intentos!* La palabra era *${word}*\n\n${game.tablero.join("\n")}`);
      }
      await reply(`🟩 *Intento ${game.intentos}/6*\n\n${game.tablero.join("\n")}\n\nSigue intentando con *!wordle [palabra]*`);
    },
  },

  {
    name: "ruleta",
    alias: ["ruletar", "ruletarusa"],
    description: "Ruleta rusa entre usuarios del grupo",
    category: "Premium-Juegos",
    premiumOnly: true,
    execute: async ({ sock, from, msg, reply, sender, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const bala    = Math.floor(Math.random() * 6) + 1;
      const disparo = Math.floor(Math.random() * 6) + 1;
      const muerto  = bala === disparo;
      const tag     = `@${sender.split("@")[0]}`;
      await sock.sendMessage(from, {
        text: muerto
          ? `🔫 *RULETA RUSA*\n\n${tag} jaló el gatillo...\n\n💥 *¡BANG!* — Mala suerte, te tocó la bala 💀`
          : `🔫 *RULETA RUSA*\n\n${tag} jaló el gatillo...\n\n✅ *¡Click!* — Salvado. Por esta vez... 😏`,
        mentions: [sender],
      }, { quoted: msg });
    },
  },

  {
    name: "casino",
    alias: ["blackjack", "dados", "apuesta"],
    description: "Casino con oro del RPG — !casino dados/blackjack [cantidad]",
    category: "Premium-Juegos",
    premiumOnly: true,
    execute: async ({ reply, args, sender, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;

      const modo     = (args[0] || "dados").toLowerCase();
      const cantidad = parseInt(args[1]) || 0;

      // Importar RPG
      const { getPlayer, savePlayer } = await import("../lib/rpg-database.js");
      const p = getPlayer(sender);

      if (!p.clase) return reply(
        `🎰 *Casino RPG*\n━━━━━━━━━━━━━━\n` +
        `❌ Necesitas un personaje RPG para apostar oro.\n` +
        `Crea uno con *!rpgregistro*`
      );

      if (cantidad <= 0) return reply(
        `🎰 *Casino RPG*\n━━━━━━━━━━━━━━\n` +
        `📝 Uso: *!casino [modo] [cantidad]*\n\n` +
        `🎲 Modos:\n` +
        `• *!casino dados 100* — Apuesta oro tirando dados (≥8 ganas)\n` +
        `• *!casino blackjack 100* — Apuesta oro en blackjack\n\n` +
        `💰 Tu oro: *${p.oro}*`
      );

      if (p.oro < cantidad) return reply(
        `❌ No tienes suficiente oro.\n💰 Tu oro: *${p.oro}* | Apostado: *${cantidad}*`
      );

      // ── DADOS ─────────────────────────────────
      if (modo === "dados") {
        const d1  = Math.floor(Math.random() * 6) + 1;
        const d2  = Math.floor(Math.random() * 6) + 1;
        const sum = d1 + d2;
        const win = sum >= 8;
        const ganancia = win ? cantidad : -cantidad;
        p.oro = Math.max(0, p.oro + ganancia);
        savePlayer(p);
        return reply(
          `🎲 *Casino — Dados*\n━━━━━━━━━━━━━━\n` +
          `🎲 Dado 1: *${d1}*  |  Dado 2: *${d2}*\n` +
          `📊 Total: *${sum}/12*\n\n` +
          `${win
            ? `✅ *¡Ganaste ${cantidad} oro!* (≥8)\n💰 Oro actual: *${p.oro}*`
            : `❌ *Perdiste ${cantidad} oro* (<8)\n💰 Oro actual: *${p.oro}*`}`
        );
      }

      // ── BLACKJACK ─────────────────────────────
      if (modo === "blackjack" || modo === "bj") {
        const carta = () => Math.min(Math.floor(Math.random() * 13) + 1, 10);
        const mano  = [carta(), carta()];
        const dealer = [carta(), carta()];
        const sumaJ  = mano.reduce((a, b) => a + b, 0);
        const sumaD  = dealer.reduce((a, b) => a + b, 0);

        let resultado, ganancia;
        if (sumaJ === 21)       { resultado = "🃏 *¡BLACKJACK!* ×1.5"; ganancia = Math.floor(cantidad * 1.5); }
        else if (sumaJ > 21)    { resultado = "💥 *¡Te pasaste!*";       ganancia = -cantidad; }
        else if (sumaD > 21)    { resultado = "✅ *¡El dealer se pasó!*"; ganancia = cantidad; }
        else if (sumaJ > sumaD) { resultado = "✅ *¡Ganaste!*";           ganancia = cantidad; }
        else if (sumaJ === sumaD){ resultado = "🤝 *Empate*";             ganancia = 0; }
        else                    { resultado = "❌ *Perdiste*";            ganancia = -cantidad; }

        p.oro = Math.max(0, p.oro + ganancia);
        savePlayer(p);
        return reply(
          `🃏 *Casino — Blackjack*\n━━━━━━━━━━━━━━\n` +
          `🧑 Tu mano: *${mano.join(" + ")} = ${sumaJ}*\n` +
          `🤖 Dealer:  *${dealer.join(" + ")} = ${sumaD}*\n\n` +
          `${resultado}\n` +
          `${ganancia > 0 ? `+${ganancia}` : ganancia} oro\n` +
          `💰 Oro actual: *${p.oro}*`
        );
      }

      return reply(`❌ Modo inválido. Usa: *dados* o *blackjack*\nEj: *!casino dados 100*`);
    },
  },

  // ════════════════════════════════════════
  //   📊 GRUPO
  // ════════════════════════════════════════

  {
    name: "encuesta",
    alias: ["poll", "votacion"],
    description: "Crea una encuesta en el grupo",
    category: "Premium-Grupo",
    premiumOnly: true,
    execute: async ({ sock, from, msg, reply, args, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const texto = args.join(" ");
      if (!texto) return reply("📊 Uso: *!encuesta [pregunta] | opción1 | opción2 | opción3*");
      const partes    = texto.split("|").map(p => p.trim());
      const pregunta  = partes[0];
      const opciones  = partes.slice(1);
      if (opciones.length < 2) return reply("📊 Necesitas al menos *2 opciones* separadas por |");
      const emojis    = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
      const lista     = opciones.map((o, i) => `${emojis[i]} ${o}`).join("\n");
      await sock.sendMessage(from, {
        text: `📊 *ENCUESTA PREMIUM*\n━━━━━━━━━━━━━━━━━━\n❓ *${pregunta}*\n\n${lista}\n\n_Responde con el número de tu opción_`,
      }, { quoted: msg });
    },
  },

  {
    name: "cumpleanos",
    alias: ["birthday", "cumple"],
    description: "Registra y recuerda cumpleaños de miembros",
    category: "Premium-Grupo",
    premiumOnly: true,
    execute: async ({ sock, from, msg, reply, args, mentioned, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      if (!mentioned?.length) return reply("🎂 Uso: *!cumpleaños @usuario DD/MM*\nEj: *!cumpleaños @Juan 15/06*");
      const fecha = args.find(a => /\d{1,2}\/\d{1,2}/.test(a));
      if (!fecha) return reply("📅 Indica la fecha en formato *DD/MM*\nEj: *!cumpleaños @Juan 15/06*");
      const tag = `@${mentioned[0].split("@")[0]}`;
      await sock.sendMessage(from, {
        text: `🎂 *Cumpleaños registrado*\n━━━━━━━━━━━━━━━━━━\n👤 Usuario: ${tag}\n📅 Fecha: *${fecha}*\n\n_El bot enviará felicitaciones automáticas en esa fecha._\n_(Sistema completo — próximamente)_`,
        mentions: mentioned,
      }, { quoted: msg });
    },
  },

  {
    name: "stats",
    alias: ["estadisticas", "estadísticas", "groupstats"],
    description: "Estadísticas del grupo (mensajes, usuarios activos)",
    category: "Premium-Grupo",
    premiumOnly: true,
    execute: async ({ sock, from, reply, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const { getGroupStats } = await import("../lib/database.js");
      try {
        const meta  = await sock.groupMetadata(from);
        const total = meta.participants.length;
        const admins = meta.participants.filter(p => p.admin).length;
        const stats = getGroupStats(from, 7);

        // Top 5 usuarios más activos
        const top = Object.entries(stats.porUsuario)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([jid, count], i) => {
            const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
            return `${medals[i]} +${jid}: *${count}* msgs`;
          }).join("\n") || "_Sin actividad registrada_";

        // Actividad últimos 7 días
        const dias = Object.entries(stats.porDia)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([fecha, count]) => {
            const d = new Date(fecha);
            const label = d.toLocaleDateString("es-PE", { weekday: "short", day: "numeric" });
            const barra = "█".repeat(Math.min(10, Math.ceil(count / 5))) || "░";
            return `${label}: ${barra} ${count}`;
          }).join("\n") || "_Sin actividad_";

        await reply(
          `📊 *Estadísticas del Grupo*\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `📋 *${meta.subject}*\n` +
          `👥 Miembros: *${total}* (${admins} admins)\n` +
          `📅 Creado: ${new Date(meta.creation * 1000).toLocaleDateString("es-PE")}\n\n` +
          `💬 *Actividad últimos 7 días*\n` +
          `Total mensajes: *${stats.total}*\n\n` +
          `${dias}\n\n` +
          `🏆 *Más activos*\n${top}`
        );
      } catch {
        await reply("❌ Solo funciona en grupos.");
      }
    },
  },

  {
    name: "recordatorio",
    alias: ["remind", "reminder", "aviso"],
    description: "Recordatorio personal por tiempo",
    category: "Premium-Utilidades",
    premiumOnly: true,
    execute: async ({ sock, from, msg, reply, args, sender, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      if (args.length < 2) return reply("⏰ Uso: *!recordatorio [tiempo] [mensaje]*\nFormatos: 1m, 5m, 1h, 2h\nEj: *!recordatorio 30m Tomar agua*");
      const tiempoStr = args[0].toLowerCase();
      const mensaje   = args.slice(1).join(" ");
      let ms = 0;
      if (tiempoStr.endsWith("m")) ms = parseInt(tiempoStr) * 60000;
      else if (tiempoStr.endsWith("h")) ms = parseInt(tiempoStr) * 3600000;
      else return reply("❌ Formato de tiempo inválido. Usa: *1m*, *30m*, *1h*");
      if (isNaN(ms) || ms <= 0 || ms > 86400000) return reply("❌ Tiempo inválido. Mínimo 1m, máximo 24h.");
      await reply(`⏰ *Recordatorio configurado*\n⏱️ Te avisaré en *${tiempoStr}*\n📝 Mensaje: _${mensaje}_`);
      setTimeout(async () => {
        await sock.sendMessage(from, {
          text: `⏰ *¡RECORDATORIO!*\n━━━━━━━━━━━━━━━━━━\n@${sender.split("@")[0]}, te recordé:\n\n📝 _${mensaje}_`,
          mentions: [sender],
        });
      }, ms);
    },
  },

  // ── !voz [texto] ─────────────────────────────
  {
    name: "voz",
    alias: ["tts", "hablar"],
    description: "Convierte texto a nota de voz [Premium]",
    category: "Premium",
    premiumOnly: true,
    execute: async ({ reply, args, sock, from, msg, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const texto = args.join(" ").trim();
      if (!texto) return reply("🎙️ Escribe el texto.\nEj: *!voz Hola mundo*");
      try {
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const { readFile, unlink } = await import("fs/promises");
        const { join: pjoin } = await import("path");
        const execP = promisify(exec);
        const tmpFile = pjoin(process.cwd(), `tts_${Date.now()}.mp3`);
        await execP(`espeak -v es -s 140 -w "${tmpFile}" "${texto.replace(/"/g, "'")}"`);
        const audio = await readFile(tmpFile);
        await unlink(tmpFile).catch(() => {});
        await sock.sendMessage(from, {
          audio,
          mimetype: "audio/mpeg",
          ptt: true,
        }, { quoted: msg });
      } catch {
        await reply("❌ No se pudo generar el audio.\n_Asegúrate de tener `espeak` instalado:_\n`pkg install espeak`");
      }
    },
  },

  // ── !deepfry ─────────────────────────────────
  {
    name: "deepfry",
    alias: ["freir", "fry"],
    description: "Efecto deep fry a una imagen [Premium]",
    category: "Premium",
    premiumOnly: true,
    execute: async ({ reply, sock, from, msg, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imgMsg = quoted?.imageMessage || msg.message?.imageMessage;
      if (!imgMsg) return reply("🖼️ Responde a una imagen con *!deepfry*");
      try {
        const { downloadContentFromMessage } = await import("@whiskeysockets/baileys");
        const { createCanvas, loadImage } = await import("canvas");
        const stream = await downloadContentFromMessage(imgMsg, "image");
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        const img = await loadImage(buffer);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        // Efecto deepfry: saturación y contraste extremo
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i]   = Math.min(255, data[i] * 1.8 + 30);     // R
          data[i+1] = Math.min(255, data[i+1] * 0.6);        // G
          data[i+2] = Math.min(255, data[i+2] * 0.5);        // B
        }
        ctx.putImageData(imageData, 0, 0);
        const out = canvas.toBuffer("image/jpeg", { quality: 0.1 });
        await sock.sendMessage(from, { image: out, mimetype: "image/jpeg" }, { quoted: msg });
      } catch {
        await reply("❌ No pude procesar la imagen.");
      }
    },
  },

  // ── !blur ────────────────────────────────────
  {
    name: "blur",
    alias: ["desenfoque"],
    description: "Desenfoca una imagen [Premium]",
    category: "Premium",
    premiumOnly: true,
    execute: async ({ reply, sock, from, msg, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imgMsg = quoted?.imageMessage || msg.message?.imageMessage;
      if (!imgMsg) return reply("🖼️ Responde a una imagen con *!blur*");
      try {
        const { downloadContentFromMessage } = await import("@whiskeysockets/baileys");
        const { execFile } = await import("child_process");
        const { promisify } = await import("util");
        const { readFile, writeFile, unlink } = await import("fs/promises");
        const { join: pjoin } = await import("path");
        const execFileP = promisify(execFile);
        const stream = await downloadContentFromMessage(imgMsg, "image");
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const inFile = pjoin(process.cwd(), `blur_in_${Date.now()}.jpg`);
        const outFile = pjoin(process.cwd(), `blur_out_${Date.now()}.jpg`);
        await writeFile(inFile, Buffer.concat(chunks));
        await execFileP("convert", [inFile, "-blur", "0x8", outFile]);
        const out = await readFile(outFile);
        await unlink(inFile).catch(() => {});
        await unlink(outFile).catch(() => {});
        await sock.sendMessage(from, { image: out, mimetype: "image/jpeg" }, { quoted: msg });
      } catch {
        await reply("❌ No pude procesar la imagen.\n_Necesitas `imagemagick`:_\n`pkg install imagemagick`");
      }
    },
  },

  // ── !velocidad [0.5/1.5/2] ───────────────────
  {
    name: "velocidad",
    alias: ["speed", "vel"],
    description: "Cambia velocidad de un audio [Premium]",
    category: "Premium",
    premiumOnly: true,
    execute: async ({ reply, args, sock, from, msg, isPremium: isPrem }) => {
      if (gatePremium(isPrem, reply)) return;
      const speed = parseFloat(args[0]);
      if (!speed || speed < 0.5 || speed > 3) return reply("⚡ Uso: *!velocidad 0.5/1.5/2*\nRango: 0.5 a 3");
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const audioMsg = quoted?.audioMessage || msg.message?.audioMessage;
      if (!audioMsg) return reply("🎵 Responde a un audio con *!velocidad 2*");
      try {
        const { downloadContentFromMessage } = await import("@whiskeysockets/baileys");
        const { execFile } = await import("child_process");
        const { promisify } = await import("util");
        const { readFile, writeFile, unlink } = await import("fs/promises");
        const { join: pjoin } = await import("path");
        const execFileP = promisify(execFile);
        const stream = await downloadContentFromMessage(audioMsg, "audio");
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const inFile = pjoin(process.cwd(), `spd_in_${Date.now()}.mp3`);
        const outFile = pjoin(process.cwd(), `spd_out_${Date.now()}.mp3`);
        await writeFile(inFile, Buffer.concat(chunks));
        await execFileP("ffmpeg", ["-y", "-i", inFile, "-filter:a", `atempo=${speed}`, outFile]);
        const out = await readFile(outFile);
        await unlink(inFile).catch(() => {});
        await unlink(outFile).catch(() => {});
        await sock.sendMessage(from, { audio: out, mimetype: "audio/mpeg", ptt: true }, { quoted: msg });
      } catch {
        await reply("❌ No pude procesar el audio.");
      }
    },
  },

];

export default premiumCommands;
