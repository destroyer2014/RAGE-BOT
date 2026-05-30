// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/busqueda.js
//         Búsqueda en Google y más
// ═══════════════════════════════════════════

import axios from "axios";

const utilCommands = [

  // ────────────────────────────────────────
  // !google — Buscar en Google
  // ────────────────────────────────────────
  {
    name: "google",
    alias: ["buscar", "search", "gg"],
    description: "Busca en Google",
    category: "Búsqueda",
    execute: async ({ reply, react, text }) => {
      if (!text) return reply("🔍 Escribe qué quieres buscar.\nEj: *!google capital de Perú*");
      await react("🔍");
      try {
        // Usamos la API de DuckDuckGo (no requiere key)
        const res = await axios.get("https://api.duckduckgo.com/", {
          params: {
            q: text,
            format: "json",
            no_html: 1,
            skip_disambig: 1,
          },
          timeout: 12000,
        });

        const data = res.data;
        const abstract = data.AbstractText?.trim();
        const title = data.Heading?.trim();
        const url = data.AbstractURL?.trim();
        const results = data.RelatedTopics?.slice(0, 4) || [];

        if (!abstract && !results.length) {
          return reply(
            `🔍 *Búsqueda: ${text}*\n━━━━━━━━━━━━━━\n` +
            `❌ No encontré resultados directos.\n\n` +
            `🌐 Busca manualmente:\nhttps://www.google.com/search?q=${encodeURIComponent(text)}`
          );
        }

        let msg = `🔍 *Búsqueda: ${text}*\n━━━━━━━━━━━━━━\n`;

        if (title && abstract) {
          msg += `📌 *${title}*\n\n${abstract}\n`;
          if (url) msg += `\n🔗 ${url}\n`;
        }

        if (!abstract && results.length) {
          msg += `📋 *Resultados relacionados:*\n`;
          for (const r of results.slice(0, 3)) {
            const txt = r.Text || r.Result || "";
            if (txt) msg += `\n▸ ${txt.slice(0, 120)}...\n`;
          }
        }

        msg += `\n━━━━━━━━━━━━━━\n🌐 https://www.google.com/search?q=${encodeURIComponent(text)}`;

        await reply(msg);
        await react("✅");
      } catch (err) {
        console.error("[GOOGLE]", err.message);
        await reply(
          `🔍 *Búsqueda: ${text}*\n━━━━━━━━━━━━━━\n` +
          `⚠️ No pude consultar el buscador ahora.\n\n` +
          `🌐 Busca directamente:\nhttps://www.google.com/search?q=${encodeURIComponent(text)}`
        );
        await react("⚠️");
      }
    },
  },

  // ────────────────────────────────────────
  // !yt — Buscar en YouTube
  // ────────────────────────────────────────
  {
    name: "yt",
    alias: ["youtube", "ytbuscar"],
    description: "Busca un video en YouTube",
    category: "Búsqueda",
    execute: async ({ reply, react, text }) => {
      if (!text) return reply("🎬 Escribe qué quieres buscar.\nEj: *!yt Bad Bunny*");
      await react("🎬");

      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(text)}`;

      try {
        // Usamos yt-dlp para buscar
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execAsync = promisify(exec);

        const { stdout } = await execAsync(
          `yt-dlp "ytsearch3:${text.replace(/"/g, "")}" --get-title --get-id --get-duration --no-playlist`,
          { timeout: 20000 }
        );

        const lines = stdout.trim().split("\n");
        const results = [];
        for (let i = 0; i < lines.length; i += 3) {
          if (lines[i] && lines[i+1]) {
            results.push({
              title: lines[i],
              id: lines[i+1],
              duration: lines[i+2] || "?",
            });
          }
        }

        if (!results.length) throw new Error("Sin resultados");

        let msg = `🎬 *Resultados de YouTube:*\n*"${text}"*\n━━━━━━━━━━━━━━\n`;
        results.forEach((r, i) => {
          msg += `\n${i+1}. *${r.title}*\n   ⏱️ ${r.duration}\n   🔗 https://youtu.be/${r.id}\n`;
        });
        msg += `\n━━━━━━━━━━━━━━\n_Usa !play [nombre] para descargar_`;

        await reply(msg);
        await react("✅");
      } catch {
        await reply(
          `🎬 *Buscar en YouTube:*\n━━━━━━━━━━━━━━\n` +
          `🔗 ${searchUrl}\n\n` +
          `_Instala yt-dlp para mejores resultados:_\n\`pip install yt-dlp\``
        );
        await react("✅");
      }
    },
  },

  // ────────────────────────────────────────
  // !wiki — Wikipedia
  // ────────────────────────────────────────
  {
    name: "wiki",
    alias: ["wikipedia", "definir"],
    description: "Busca en Wikipedia",
    category: "Búsqueda",
    execute: async ({ reply, react, text }) => {
      if (!text) return reply("📖 Escribe qué quieres buscar.\nEj: *!wiki Albert Einstein*");
      await react("📖");
      try {
        const res = await axios.get("https://es.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(text), {
          timeout: 12000,
        });
        const { title, extract, content_urls } = res.data;
        if (!extract) return reply(`❌ No encontré "${text}" en Wikipedia.`);
        const resumen = extract.length > 600 ? extract.slice(0, 600) + "..." : extract;
        await reply(
          `📖 *${title}*\n━━━━━━━━━━━━━━\n${resumen}\n\n🔗 ${content_urls?.desktop?.page || ""}`
        );
        await react("✅");
      } catch {
        await reply(`❌ No encontré "${text}" en Wikipedia.\nVerifica el nombre e intenta de nuevo.`);
        await react("❌");
      }
    },
  },

  // ────────────────────────────────────────
  // !acortador — Acortar URL
  // ────────────────────────────────────────
  {
    name: "acortador",
    alias: ["shorturl", "acortar", "short"],
    description: "Acorta una URL larga",
    category: "Utilidades",
    execute: async ({ reply, react, args }) => {
      const url = args[0];
      if (!url || !url.startsWith("http")) return reply("🔗 Pega la URL a acortar.\nEj: *!acortador https://ejemplo.com/url-muy-larga*");
      await react("🔗");
      try {
        const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
          timeout: 10000,
        });
        await reply(
          `🔗 *URL acortada:*\n━━━━━━━━━━━━━━\n` +
          `📥 Original: ${url.slice(0, 60)}${url.length > 60 ? "..." : ""}\n` +
          `📤 Corta: *${res.data}*`
        );
        await react("✅");
      } catch {
        await reply("❌ No pude acortar la URL. Intenta de nuevo.");
        await react("❌");
      }
    },
  },
];

export default utilCommands;
