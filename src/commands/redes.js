// ═══════════════════════════════════════════
//       PRAGMATA BOT — src/commands/redes.js
//    Instagram, Pinterest, Mediafire
//              v1.0.0
// ═══════════════════════════════════════════

import axios from "axios";

// ── Instagram DL ─────────────────────────────
async function igdl(url) {
  const apis = [
    "https://api.siputzx.my.id/api/d/igdl?url=" + url,
    "https://api.betabotz.eu.org/api/download/igdowloader?url=" + encodeURIComponent(url) + "&apikey=bot-secx3",
  ];
  for (const api of apis) {
    try {
      const res = await axios.get(api, { timeout: 15000 });
      const data = res.data?.data || res.data?.message;
      if (Array.isArray(data) && data.length > 0) {
        return data.map((d) => ({ url: d.url || d._url || d.thumbnail, type: (d.url || "").includes("mp4") ? "video" : "image" }));
      }
    } catch { continue; }
  }
  return null;
}

// ── IG Stories ───────────────────────────────
async function igstory(username) {
  const res = await axios.get("https://api.siputzx.my.id/api/d/igstory?username=" + username, { timeout: 15000 });
  return res.data?.data || null;
}

// ── Pinterest ────────────────────────────────
async function pinterest(query) {
  const apis = [
    "https://api.siputzx.my.id/api/s/pinterest?query=" + encodeURIComponent(query),
    "https://api.betabotz.eu.org/api/search/pinterest?query=" + encodeURIComponent(query) + "&apikey=bot-secx3",
    "https://api.ryzendesu.vip/api/search/pinterest?query=" + encodeURIComponent(query),
    "https://api.nekorinn.my.id/search/pinterest?query=" + encodeURIComponent(query),
  ];
  for (const api of apis) {
    try {
      const res = await axios.get(api, { timeout: 15000 });
      const data = res.data?.data || res.data?.result || res.data;
      if (Array.isArray(data) && data.length > 0) return data;
    } catch { continue; }
  }
  return null;
}

// ── Mediafire ────────────────────────────────
async function mediafire(url) {
  const res = await axios.get("https://api.delirius.store/download/mediafire?url=" + encodeURIComponent(url), { timeout: 20000 });
  const data = res.data?.data || res.data?.result || res.data;
  return {
    url: data?.url || data?.link || data?.download || data?.dl,
    title: data?.title || data?.filename || "archivo",
    size: data?.size || "Desconocido",
    mime: data?.mime || "application/octet-stream",
  };
}

const redesCommands = [
  // ── Instagram ───────────────────────────────
  {
    name: "ig",
    alias: ["instagram", "igdl"],
    description: "Descarga un post de Instagram !ig [url]",
    category: "Descargas 📥",
    execute: async ({ text, react, reply, sock, from, msg }) => {
      if (!text || !text.startsWith("http")) return reply("❌ Uso: `!ig [url de instagram]`");
      await react("⏳");
      try {
        const results = await igdl(text);
        if (!results) return reply("❌ No pude descargar. Verifica el link.");
        for (const item of results.slice(0, 3)) {
          if (item.type === "video") {
            await sock.sendMessage(from, { video: { url: item.url }, caption: "📸 Descargado por PRAGMATA BOT" }, { quoted: msg });
          } else {
            await sock.sendMessage(from, { image: { url: item.url }, caption: "📸 Descargado por PRAGMATA BOT" }, { quoted: msg });
          }
        }
        await react("✅");
      } catch (err) {
        await reply("❌ Error al descargar. Intenta de nuevo.");
        await react("❌");
      }
    },
  },

  // ── IG Stories ──────────────────────────────
  {
    name: "igstory",
    alias: ["ighistoria", "ighistorias"],
    description: "Descarga historias de Instagram !igstory [usuario]",
    category: "Descargas 📥",
    execute: async ({ text, args, react, reply, sock, from, msg }) => {
      const user = args[0] || text;
      if (!user) return reply("❌ Uso: `!igstory [usuario]`\nEjemplo: `!igstory cristiano`");
      await react("⏳");
      try {
        const stories = await igstory(user);
        if (!stories || !stories.length) return reply("❌ No encontré historias para ese usuario.");
        for (const url of stories.slice(0, 5)) {
          const isVideo = url.includes(".mp4");
          if (isVideo) {
            await sock.sendMessage(from, { video: { url }, caption: "📖 Historia de @" + user }, { quoted: msg });
          } else {
            await sock.sendMessage(from, { image: { url }, caption: "📖 Historia de @" + user }, { quoted: msg });
          }
        }
        await react("✅");
      } catch (err) {
        await reply("❌ Error al descargar historias.");
        await react("❌");
      }
    },
  },

  // ── Pinterest ───────────────────────────────
  {
    name: "pinterest",
    alias: ["pinterestdl", "dlpinterest", "pin"],
    description: "Busca imágenes en Pinterest !pinterest [consulta]",
    category: "Búsqueda 🔍",
    execute: async ({ text, react, reply, sock, from, msg }) => {
      if (!text) return reply("❌ Uso: `!pinterest [consulta o url]`");
      await react("🔍");
      try {
        // Si es URL directa de pinterest
        if (text.startsWith("http") && text.includes("pinterest")) {
          const res = await axios.get("https://api.dorratz.com/v2/pinterestdl?url=" + encodeURIComponent(text), { timeout: 15000 });
          const data = res.data?.data;
          if (data?.url) {
            await sock.sendMessage(from, { image: { url: data.url }, caption: "📌 " + (data.title || text) }, { quoted: msg });
            return react("✅");
          }
        }
        const results = await pinterest(text);
        if (!results) return reply("❌ No se encontraron resultados. Intenta con otra búsqueda.");
        const r = results[0];
        const url = r.hd || r.image || r.images_url || r.url || r.imageUrl || r.img;
        if (!url) return reply("❌ No se pudo obtener la imagen.");
        await sock.sendMessage(from, {
          image: { url },
          caption: "📌 *" + (r.title || r.fullname || r.name || text) + "*\n👤 " + (r.full_name || r.upload_by || r.username || "Desconocido"),
        }, { quoted: msg });
        await react("✅");
      } catch (err) {
        await reply("❌ No se encontraron resultados.");
        await react("❌");
      }
    },
  },

  // ── Mediafire ───────────────────────────────
  {
    name: "mediafire",
    alias: ["mediafiredl", "dlmediafire"],
    description: "Descarga un archivo de Mediafire !mediafire [url]",
    category: "Descargas 📥",
    execute: async ({ text, args, react, reply, sock, from, msg }) => {
      const url = args[0] || text;
      if (!url || !url.includes("mediafire.com")) return reply("❌ Uso: `!mediafire [url de mediafire]`");
      await react("⏳");
      try {
        const data = await mediafire(url);
        if (!data.url) return reply("❌ No pude obtener el enlace de descarga.");
        const caption = "📦 *" + data.title + "*\n💾 Tamaño: " + data.size + "\n📁 Tipo: " + data.mime;
        await sock.sendMessage(from, {
          document: { url: data.url },
          mimetype: data.mime,
          fileName: data.title,
          caption,
        }, { quoted: msg });
        await react("✅");
      } catch (err) {
        await reply("❌ Error al descargar. Verifica el link.");
        await react("❌");
      }
    },
  },
];

export default redesCommands;
