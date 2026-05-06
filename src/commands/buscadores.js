// ═══════════════════════════════════════════
//     RAGE-BOT — src/commands/buscadores.js
//              v1.0.0
// ═══════════════════════════════════════════

import axios from "axios";
import * as cheerio from "cheerio";

// ── Google Image search ──────────────────────
async function searchGoogleImage(query) {
  const res = await axios.get("https://www.google.com/search", {
    params: { q: query, tbm: "isch", hl: "es" },
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    timeout: 15000,
  });
  const $ = cheerio.load(res.data);
  const imgs = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http")) imgs.push(src);
  });
  return imgs;
}

// ── Anime info ───────────────────────────────
async function searchAnime(query) {
  const res = await axios.get("https://api.jikan.moe/v4/anime", {
    params: { q: query, limit: 1 },
    timeout: 15000,
  });
  return res.data?.data?.[0] || null;
}

// ── Google search ────────────────────────────
async function searchGoogle(query) {
  const res = await axios.get("https://www.google.com/search", {
    params: { q: query, hl: "es" },
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    timeout: 15000,
  });
  const $ = cheerio.load(res.data);
  const results = [];
  $("div.g").each((_, el) => {
    const title = $(el).find("h3").first().text();
    const url = $(el).find("a").first().attr("href");
    const desc = $(el).find("div.VwiC3b").first().text();
    if (title && url) results.push({ title, url, desc });
  });
  return results.slice(0, 5);
}

// ── Peliculas search via TMDB ─────────────────
async function searchPelicula(query) {
  const res = await axios.get("https://api.themoviedb.org/3/search/multi", {
    params: { api_key: "8265bd1679663a7ea12ac168da84d2e8", query, language: "es-MX", page: 1 },
    timeout: 15000,
  });
  return (res.data?.results || []).slice(0, 5).map((r) => ({
    title: r.title || r.name || "Sin título",
    year: (r.release_date || r.first_air_date || "").split("-")[0] || "?",
    type: r.media_type === "movie" ? "🎬 Película" : "📺 Serie",
    rating: r.vote_average ? r.vote_average.toFixed(1) : "?",
    overview: (r.overview || "Sin descripción").substring(0, 150),
    poster: r.poster_path ? "https://image.tmdb.org/t/p/w500" + r.poster_path : null,
    link: r.media_type === "movie"
      ? "https://www.themoviedb.org/movie/" + r.id
      : "https://www.themoviedb.org/tv/" + r.id,
  }));
}

// ── Palabras prohibidas para imagen ──────────
const PROHIBITED = ["porno","porn","gore","pussy","hentai","pene","xxx","nsfw","anal","ahegao","sexo","sex","nude","cp","pedofilia","necrofilia"];

const buscadoresCommands = [
  // ── Anime info ──────────────────────────────
  {
    name: "anime",
    alias: ["animeinfo", "buscaranime"],
    description: "Busca info de un anime !anime [nombre]",
    category: "Búsqueda 🔍",
    execute: async ({ text, reply, react, sock, from, msg }) => {
      if (!text) return reply("❌ Uso: `!anime [nombre del anime]`");
      await react("🔍");
      try {
        const result = await searchAnime(text);
        if (!result) return reply("❌ No encontré ese anime.");
        const info =
          "🎌 *" + (result.title || "-") + "*\n" +
          "━━━━━━━━━━━━━━\n" +
          "📺 Episodios: " + (result.episodes || "?") + "\n" +
          "📅 Inicio: " + (result.aired?.from?.split("T")[0] || "?") + "\n" +
          "⭐ Popularidad: " + (result.popularity || "?") + "\n" +
          "💖 Favoritos: " + (result.favorites || "?") + "\n" +
          "⏱️ Duración: " + (result.duration || "?") + "\n" +
          "🔞 Rating: " + (result.rating || "?") + "\n" +
          "🎬 Trailer: " + (result.trailer?.url || "No disponible") + "\n" +
          "🔗 URL: " + (result.url || "-");
        const img = result.images?.jpg?.image_url;
        if (img) {
          await sock.sendMessage(from, { image: { url: img }, caption: info }, { quoted: msg });
        } else {
          await reply(info);
        }
        await react("✅");
      } catch (err) {
        await reply("❌ Error buscando el anime. Intenta de nuevo.");
        await react("❌");
      }
    },
  },

  // ── Google search ───────────────────────────
  {
    name: "google",
    alias: ["buscar", "googlebuscar"],
    description: "Busca en Google !google [consulta]",
    category: "Búsqueda 🔍",
    execute: async ({ text, reply, react, sock, from, msg }) => {
      if (!text) return reply("❌ Uso: `!google [consulta]`");
      await react("🔍");
      try {
        const results = await searchGoogle(text);
        if (!results.length) return reply("❌ No encontré resultados.");
        let teks = "🔍 *Resultados para: " + text + "*\n\n";
        for (const r of results) {
          teks += "*" + r.title + "*\n_" + r.url + "_\n" + (r.desc || "") + "\n\n──────────\n\n";
        }
        const ssUrl = "https://image.thum.io/get/fullpage/https://google.com/search?q=" + encodeURIComponent(text);
        await sock.sendMessage(from, { image: { url: ssUrl }, caption: teks }, { quoted: msg });
        await react("✅");
      } catch (err) {
        await reply("❌ Error en la búsqueda. Intenta de nuevo.");
        await react("❌");
      }
    },
  },

  // ── Imagen Google ───────────────────────────
  {
    name: "imagen",
    alias: ["gimage", "img", "jpg"],
    description: "Busca imágenes en Google !imagen [consulta]",
    category: "Búsqueda 🔍",
    execute: async ({ text, reply, react, sock, from, msg }) => {
      if (!text) return reply("❌ Uso: `!imagen [consulta]`");
      if (PROHIBITED.some((w) => text.toLowerCase().includes(w))) {
        return reply("⚠️ Consulta no permitida.");
      }
      await react("🔍");
      try {
        const imgs = await searchGoogleImage(text);
        if (!imgs.length) return reply("❌ No encontré imágenes.");
        const url = imgs[Math.floor(Math.random() * imgs.length)];
        await sock.sendMessage(from, { image: { url }, caption: "💞 *" + text + "*" }, { quoted: msg });
        await react("✅");
      } catch (err) {
        await reply("❌ Error buscando imágenes. Intenta de nuevo.");
        await react("❌");
      }
    },
  },

  // ── Películas ───────────────────────────────
  {
    name: "pelicula",
    alias: ["cuevana", "pelisplus", "buscarpelicula"],
    description: "Busca películas !pelicula [nombre]",
    category: "Búsqueda 🔍",
    execute: async ({ text, reply, react, sock, from, msg }) => {
      if (!text) return reply("❌ Uso: `!pelicula [nombre]`");
      await react("🔍");
      try {
        const results = await searchPelicula(text);
        if (!results.length) return reply("❌ No encontré esa película o serie.");
        const r = results[0];
        const caption = results.map((v) =>
          v.type + " *" + v.title + "* (" + v.year + ")\n" +
          "⭐ " + v.rating + "/10\n" +
          "📝 " + v.overview + "\n" +
          "🔗 " + v.link
        ).join("\n\n───────\n\n");
        if (r.poster) {
          await sock.sendMessage(from, { image: { url: r.poster }, caption }, { quoted: msg });
        } else {
          await reply(caption);
        }
        await react("✅");
      } catch (err) {
        await reply("❌ Error buscando. Intenta de nuevo.");
        await react("❌");
      }
    },
  },
];

export default buscadoresCommands;
