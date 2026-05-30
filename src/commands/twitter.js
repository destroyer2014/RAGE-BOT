// ═══════════════════════════════════════════
//    PRAGMATA BOT — src/commands/twitter.js
//      Twitter/X API v2 con Bearer Token
// ═══════════════════════════════════════════

import axios from "axios";

const TWITTER_BEARER = "AAAAAAAAAAAAAAAAAAAAAGk79gEAAAAAX289ZsAmGAhbDylt920tLBvfZ80%3DY0v5HpyucMw7mJcmhU8FSDy8YXQajc1qLnPtioAXKfEJxE97TV";

const twitterApi = axios.create({
  baseURL: "https://api.twitter.com/2",
  headers: { Authorization: `Bearer ${TWITTER_BEARER}` },
  timeout: 15000,
});

// ── Buscar tweets ─────────────────────────────
async function searchTweets(query, max = 5) {
  const res = await twitterApi.get("/tweets/search/recent", {
    params: {
      query: query + " lang:es -is:retweet",
      max_results: max,
      "tweet.fields": "created_at,public_metrics,author_id",
      expansions: "author_id",
      "user.fields": "name,username,verified",
    },
  });
  const tweets = res.data?.data || [];
  const users = res.data?.includes?.users || [];
  return tweets.map((t) => {
    const user = users.find((u) => u.id === t.author_id);
    return { ...t, user };
  });
}

// ── Info de usuario ───────────────────────────
async function getUserInfo(username) {
  const res = await twitterApi.get(`/users/by/username/${username}`, {
    params: {
      "user.fields": "name,username,description,public_metrics,verified,created_at",
    },
  });
  return res.data?.data || null;
}

// ── Trending (simulado — v2 free no tiene trends) ─
async function getWorldTrends() {
  // La API v2 gratuita no tiene endpoint de trends
  // Usamos búsqueda de hashtags populares como alternativa
  throw new Error("NO_TRENDS");
}

const twitterCommands = [
  // ── !twitter buscar ──────────────────────────
  {
    name: "twitter",
    alias: ["tweet", "buscartweet", "twit"],
    description: "Busca tweets recientes !twitter [consulta]",
    category: "Redes 📱",
    execute: async ({ text, reply, react, sock, from, msg }) => {
      if (!text) {
        return reply(
          "🐦 *!twitter*\n━━━━━━━━━━━━━━\n" +
          "Busca tweets recientes.\n\n" +
          "Uso: `!twitter [tema o hashtag]`\n" +
          "Ej: `!twitter #Peru`\n\n" +
          "También puedes usar:\n" +
          "• `!twuser [usuario]` — Info de perfil\n" +
          "• `!tweets [usuario]` — Últimos tweets"
        );
      }

      await react("🐦");
      await sock.sendMessage(from, { text: `🔍 Buscando tweets de: *${text}*...` }, { quoted: msg });

      try {
        const tweets = await searchTweets(text, 5);
        if (!tweets.length) {
          return reply("❌ No encontré tweets recientes sobre ese tema.");
        }

        let txt = `🐦 *Tweets sobre: ${text}*\n━━━━━━━━━━━━━━\n\n`;
        for (const t of tweets) {
          const user = t.user;
          const metrics = t.public_metrics;
          txt += `👤 *@${user?.username || "?"}* (${user?.name || "?"})\n`;
          txt += `💬 ${t.text}\n`;
          txt += `❤️ ${metrics?.like_count || 0}  🔁 ${metrics?.retweet_count || 0}  💬 ${metrics?.reply_count || 0}\n`;
          txt += `📅 ${t.created_at ? new Date(t.created_at).toLocaleDateString("es") : "?"}\n`;
          txt += `━━━━━━━━━━━━━━\n`;
        }

        await reply(txt);
        await react("✅");
      } catch (err) {
        console.error("[TWITTER]", err.response?.data || err.message);
        if (err.response?.status === 429) {
          await reply("❌ Límite de Twitter alcanzado. Espera unos minutos e intenta de nuevo.");
        } else {
          await reply("❌ Error al buscar en Twitter. Verifica el token.");
        }
        await react("❌");
      }
    },
  },

  // ── !twuser — Perfil de usuario ──────────────
  {
    name: "twuser",
    alias: ["twitteruser", "tperfil", "twperfil"],
    description: "Info de un usuario de Twitter !twuser [usuario]",
    category: "Redes 📱",
    execute: async ({ text, args, reply, react, sock, from, msg }) => {
      const username = (args[0] || text || "").replace("@", "").trim();
      if (!username) return reply("❌ Uso: `!twuser [usuario]`\nEj: `!twuser elonmusk`");

      await react("🐦");
      try {
        const user = await getUserInfo(username);
        if (!user) return reply(`❌ No encontré al usuario @${username}`);

        const m = user.public_metrics;
        const txt =
          `🐦 *@${user.username}*\n` +
          `━━━━━━━━━━━━━━\n` +
          `👤 *Nombre:* ${user.name}\n` +
          (user.verified ? `✅ Verificado\n` : "") +
          `📝 *Bio:* ${user.description || "Sin bio"}\n` +
          `👥 *Seguidores:* ${m?.followers_count?.toLocaleString() || "?"}\n` +
          `➡️ *Siguiendo:* ${m?.following_count?.toLocaleString() || "?"}\n` +
          `🐦 *Tweets:* ${m?.tweet_count?.toLocaleString() || "?"}\n` +
          `📅 *Desde:* ${user.created_at ? new Date(user.created_at).toLocaleDateString("es") : "?"}\n` +
          `🔗 https://x.com/${user.username}`;

        await reply(txt);
        await react("✅");
      } catch (err) {
        console.error("[TWUSER]", err.response?.data || err.message);
        await reply(`❌ No pude obtener info de @${username}`);
        await react("❌");
      }
    },
  },

  // ── !tweets — Últimos tweets de un usuario ───
  {
    name: "tweets",
    alias: ["ultimostweets", "twrecientes"],
    description: "Últimos tweets de un usuario !tweets [usuario]",
    category: "Redes 📱",
    execute: async ({ text, args, reply, react, sock, from, msg }) => {
      const username = (args[0] || text || "").replace("@", "").trim();
      if (!username) return reply("❌ Uso: `!tweets [usuario]`\nEj: `!tweets nasa`");

      await react("🐦");
      try {
        // Primero obtener el ID del usuario
        const userRes = await twitterApi.get(`/users/by/username/${username}`, {
          params: { "user.fields": "name,username" },
        });
        const user = userRes.data?.data;
        if (!user) return reply(`❌ No encontré al usuario @${username}`);

        // Obtener sus tweets
        const tweetsRes = await twitterApi.get(`/users/${user.id}/tweets`, {
          params: {
            max_results: 5,
            "tweet.fields": "created_at,public_metrics",
            exclude: "retweets,replies",
          },
        });

        const tweets = tweetsRes.data?.data || [];
        if (!tweets.length) return reply(`❌ @${username} no tiene tweets recientes.`);

        let txt = `🐦 *Últimos tweets de @${user.username}*\n━━━━━━━━━━━━━━\n\n`;
        for (const t of tweets) {
          const m = t.public_metrics;
          txt += `💬 ${t.text}\n`;
          txt += `❤️ ${m?.like_count || 0}  🔁 ${m?.retweet_count || 0}\n`;
          txt += `📅 ${t.created_at ? new Date(t.created_at).toLocaleDateString("es") : "?"}\n`;
          txt += `━━━━━━━━━━━━━━\n`;
        }

        await reply(txt);
        await react("✅");
      } catch (err) {
        console.error("[TWEETS]", err.response?.data || err.message);
        if (err.response?.status === 429) {
          await reply("❌ Límite de Twitter alcanzado. Espera unos minutos.");
        } else {
          await reply(`❌ Error al obtener tweets de @${username}`);
        }
        await react("❌");
      }
    },
  },
];

export default twitterCommands;
