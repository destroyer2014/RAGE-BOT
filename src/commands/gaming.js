// ════════════════════════════════════════════
//  RAGE-BOT — src/commands/gaming.js
//  Módulo Gaming — v1.0
//  Juegos: MLBB · Free Fire · CODM · Brawl Stars
//          Fortnite · Valorant
// ════════════════════════════════════════════

import config from "../../config.js";
import axios from "axios";

const p = config.prefix;

// ── Helpers internos ────────────────────────
function rankBar(kills, total) {
  const pct = Math.min(kills / (total || 1), 1);
  const filled = Math.round(pct * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

// ════════════════════════════════════════════
const gamingCommands = [

  // ─────────────────────────────────────────
  // 🎮 MENÚ GAMING
  // ─────────────────────────────────────────
  {
    name: "menugaming",
    alias: ["mgaming", "gamingmenu", "juegomenu"],
    description: "Menú de comandos de juegos",
    category: "Gaming",
    execute: async ({ reply, isPremium: isPrem, isOwner }) => {
      const vip = isPrem || isOwner;
      await reply(
        `🎮 *RAGE-BOT — MENÚ GAMING* 🎮\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +

        `📱 *MOBILE LEGENDS*\n` +
        `▸ \`${p}mlbb <id> <zona>\` — Stats de cuenta\n` +
        `▸ \`${p}mlheroe <nombre>\` — Info de héroe\n` +
        `▸ \`${p}mlcounter <rol>\` — Counters por rol\n` +
        `▸ \`${p}mlparche\` — Notas del parche actual\n` +
        `▸ \`${p}mleventos\` — Eventos activos\n` +
        `▸ \`${p}lfg\` — Buscar party\n\n` +

        `🔥 *FREE FIRE*\n` +
        `▸ \`${p}ff <id>\` — Stats de jugador\n` +
        `▸ \`${p}ffranks\` — Rangos de la temporada\n` +
        `▸ \`${p}ffpersonaje <nombre>\` — Info de personaje\n` +
        `▸ \`${p}ffarmas\` — Guía de armas meta\n\n` +

        `🔫 *CALL OF DUTY MOBILE*\n` +
        `▸ \`${p}codm\` — Info general CODM\n` +
        `▸ \`${p}codmarmas\` — Armas meta temporada\n` +
        `▸ \`${p}codmclase <tipo>\` — Clase recomendada\n\n` +

        `💎 *BRAWL STARS*\n` +
        `▸ \`${p}brawl <tag>\` — Stats de jugador\n` +
        `▸ \`${p}brawler <nombre>\` — Info de brawler\n` +
        `▸ \`${p}brawlmeta\` — Meta actual\n\n` +

        `🏗️ *FORTNITE*\n` +
        `▸ \`${p}fortnite\` — Info temporada\n` +
        `▸ \`${p}fortnitearmas\` — Armas meta\n\n` +

        `⚔️ *VALORANT*\n` +
        `▸ \`${p}valorant <usuario#tag>\` — Stats básicos\n` +
        `▸ \`${p}valagente <nombre>\` — Info de agente\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏆 *Ranking gaming:* \`${p}topgaming\`\n` +
        `${vip ? "✅ *Premium activo* — acceso completo" : `⭐ Algunos stats requieren premium → \`${p}adqpremium\``}`
      );
    },
  },

  // ─────────────────────────────────────────
  // 🔥 FREE FIRE
  // ─────────────────────────────────────────
  {
    name: "ff",
    alias: ["freefire", "freef"],
    description: "Stats de jugador de Free Fire por ID",
    category: "Gaming",
    execute: async ({ args, reply, react }) => {
      const id = args[0];
      if (!id) {
        return reply(
          `🔥 *FREE FIRE — Stats*\n━━━━━━━━━━━━━━\n\n` +
          `Uso: \`${p}ff <ID del jugador>\`\n\n` +
          `Ejemplo: \`${p}ff 1234567890\`\n\n` +
          `💡 Encuentra tu ID en el perfil del juego.`
        );
      }

      await react("🔍");
      try {
        // API pública de Free Fire stats
        const res = await axios.get(`https://api.gametools.network/ff/stats/?uid=${id}&region=me`, {
          timeout: 8000,
          headers: { "Accept": "application/json" },
        });
        const d = res.data;

        await reply(
          `🔥 *FREE FIRE — Perfil*\n━━━━━━━━━━━━━━\n\n` +
          `👤 Nick: *${d.name || "N/A"}*\n` +
          `🆔 UID: \`${id}\`\n` +
          `🏆 Rango: *${d.cs_rank_name || "Sin rango"}*\n` +
          `⭐ Nivel: *${d.level || "?"}*\n` +
          `❤️ Likes: *${(d.liked || 0).toLocaleString()}*\n\n` +
          `📊 *Estadísticas Battle Royale*\n` +
          `▸ Partidas: ${d.br_rankpoint || "N/A"}\n` +
          `▸ Rank Points: ${d.cs_rankpoint || "N/A"}\n\n` +
          `_Datos en tiempo real vía gametools_`
        );
      } catch {
        await reply(
          `🔥 *FREE FIRE — Stats*\n━━━━━━━━━━━━━━\n\n` +
          `❌ No se pudo obtener el perfil.\n\n` +
          `Posibles causas:\n` +
          `▸ ID incorrecto\n` +
          `▸ Perfil privado\n` +
          `▸ Servicio no disponible en este momento\n\n` +
          `💡 Verifica tu ID en: Perfil → Esquina superior izquierda`
        );
      }
    },
  },

  {
    name: "ffranks",
    alias: ["ffrango", "ffrangos"],
    description: "Rangos de Free Fire y puntos requeridos",
    category: "Gaming",
    execute: async ({ reply }) => {
      await reply(
        `🔥 *FREE FIRE — Sistema de Rangos*\n━━━━━━━━━━━━━━\n\n` +
        `🥉 *Bronce* — 0 a 999 pts\n` +
        `▸ Bronce I · II · III · IV\n\n` +
        `🪨 *Plata* — 1,000 a 1,999 pts\n` +
        `▸ Plata I · II · III · IV\n\n` +
        `🥇 *Oro* — 2,000 a 2,999 pts\n` +
        `▸ Oro I · II · III · IV\n\n` +
        `💎 *Platino* — 3,000 a 3,999 pts\n` +
        `▸ Platino I · II · III · IV\n\n` +
        `💠 *Diamante* — 4,000 a 4,999 pts\n` +
        `▸ Diamante I · II · III · IV\n\n` +
        `🔴 *Heroico* — 5,000+ pts\n` +
        `▸ Acceso por temporada\n\n` +
        `👑 *Grandmaster* — Top 300 de la región\n\n` +
        `━━━━━━━━━━━━━━\n` +
        `💡 Perder en rangos altos resta puntos.\n` +
        `Usa \`${p}ff <id>\` para ver tu rango actual.`
      );
    },
  },

  {
    name: "ffpersonaje",
    alias: ["ffchar", "ffcharacter", "ffpersonajes"],
    description: "Info de personaje de Free Fire",
    category: "Gaming",
    execute: async ({ args, reply }) => {
      const nombre = (args.join(" ") || "").toLowerCase().trim();

      const personajes = {
        alok: {
          n: "DJ Alok", habilidad: "Drop the Beat (Activa)",
          efecto: "Crea un aura de 5m que restaura 5 HP/seg y aumenta velocidad 15% por 10s.",
          tipo: "Soporte/Movilidad", dificultad: "⭐⭐ Media",
          tip: "Ideal para rush agresivo o escapar de zonas. Combínalo con Chrono o Hayato."
        },
        chrono: {
          n: "Chrono", habilidad: "Time Turner (Activa)",
          efecto: "Crea una barrera impenetrable. Puedes disparar desde adentro. 45s cooldown.",
          tipo: "Defensa/Agresivo", dificultad: "⭐ Fácil",
          tip: "Úsalo para revivir aliados o defenderte en zona. Muy versátil en ranked."
        },
        hayato: {
          n: "Hayato", habilidad: "Bushido (Pasiva)",
          efecto: "Cada 10% de HP perdido aumenta la penetración de armadura en 10%.",
          tipo: "Agresivo/High-risk", dificultad: "⭐⭐⭐ Alta",
          tip: "Mejor con armaduras máximas. A bajo HP se vuelve letal. Combina con Alok."
        },
        over: {
          n: "Overload (Dimitri)", habilidad: "Healing Heartbeat (Activa)",
          efecto: "Crea un aura donde tú y aliados pueden autorevivirse estando caídos.",
          tipo: "Soporte", dificultad: "⭐ Fácil",
          tip: "Imprescindible en duo/squad. Actívalo cuando caigas para levantarte solo."
        },
        kelly: {
          n: "Kelly", habilidad: "Dash (Pasiva)",
          efecto: "Aumenta velocidad de sprint en 6%. Con despertar: primero disparo aumentado.",
          tipo: "Movilidad/Early game", dificultad: "⭐ Fácil",
          tip: "Buena para principiantes. Con despertar activo funciona en late game también."
        },
      };

      const entrada = personajes[nombre] || personajes[Object.keys(personajes).find(k => nombre.includes(k))];

      if (!entrada) {
        return reply(
          `🔥 *FREE FIRE — Personajes*\n━━━━━━━━━━━━━━\n\n` +
          `Uso: \`${p}ffpersonaje <nombre>\`\n\n` +
          `Personajes disponibles:\n` +
          Object.values(personajes).map(x => `▸ *${x.n}*`).join("\n") +
          `\n\n_Más personajes próximamente._`
        );
      }

      await reply(
        `🔥 *FREE FIRE — ${entrada.n}*\n━━━━━━━━━━━━━━\n\n` +
        `⚡ Habilidad: *${entrada.habilidad}*\n` +
        `📖 Efecto: ${entrada.efecto}\n\n` +
        `🎯 Tipo: ${entrada.tipo}\n` +
        `📊 Dificultad: ${entrada.dificultad}\n\n` +
        `💡 *Tip:* ${entrada.tip}`
      );
    },
  },

  {
    name: "ffarmas",
    alias: ["ffmeta", "ffarma"],
    description: "Armas meta de Free Fire",
    category: "Gaming",
    execute: async ({ reply }) => {
      await reply(
        `🔥 *FREE FIRE — Armas Meta*\n━━━━━━━━━━━━━━\n\n` +
        `🏆 *S-Tier (Top meta)*\n` +
        `▸ *M1887* — Escopeta 2 disparos devastadora en corto\n` +
        `▸ *FAMAS* — Rifle versátil, excelente a media distancia\n` +
        `▸ *M82B* — Francotirador, atraviesa girosferas\n\n` +
        `💪 *A-Tier (Muy buenas)*\n` +
        `▸ *MP40* — SMG velocísima, ideal para rush\n` +
        `▸ *AK* — AR con alto daño por bala\n` +
        `▸ *SVD* — Semi-auto a larga distancia\n\n` +
        `✅ *B-Tier (Buenas)*\n` +
        `▸ *Groza* — AR con accesorios, daño medio-alto\n` +
        `▸ *UMP* — SMG equilibrada\n` +
        `▸ *SKS* — Semi-auto precisa\n\n` +
        `━━━━━━━━━━━━━━\n` +
        `💡 Combina siempre un arma de corto + una de largo alcance.`
      );
    },
  },

  // ─────────────────────────────────────────
  // 🔫 CALL OF DUTY MOBILE
  // ─────────────────────────────────────────
  {
    name: "codm",
    alias: ["cod", "callofduty"],
    description: "Info y guía de Call of Duty Mobile",
    category: "Gaming",
    execute: async ({ reply }) => {
      await reply(
        `🔫 *CALL OF DUTY MOBILE*\n━━━━━━━━━━━━━━\n\n` +
        `📱 El FPS #1 en móviles con más de 650M de descargas.\n\n` +
        `🎮 *Modos disponibles*\n` +
        `▸ Multijugador clásico (TDM, Dominación, etc.)\n` +
        `▸ Battle Royale (hasta 100 jugadores)\n` +
        `▸ Zombies (PvE cooperativo)\n` +
        `▸ Ranked (ladder competitivo)\n\n` +
        `📋 *Comandos disponibles*\n` +
        `▸ \`${p}codmarmas\` — Armas meta de la temporada\n` +
        `▸ \`${p}codmclase <tipo>\` — Clase recomendada\n\n` +
        `━━━━━━━━━━━━━━\n` +
        `💡 Temporada actual: verifica en el juego para eventos vigentes.`
      );
    },
  },

  {
    name: "codmarmas",
    alias: ["codmmeta", "codmarma", "codmweapons"],
    description: "Armas meta de CODM",
    category: "Gaming",
    execute: async ({ reply }) => {
      await reply(
        `🔫 *CODM — Armas Meta*\n━━━━━━━━━━━━━━\n\n` +
        `🏆 *S-Tier Multijugador*\n` +
        `▸ *HVK-30* — AR versátil, TTK excelente\n` +
        `▸ *CBR4* — SMG, la más rápida para rush\n` +
        `▸ *Kilo 141* — AR precisa, meta estable\n\n` +
        `🏆 *S-Tier Battle Royale*\n` +
        `▸ *Krig 6* — AR + mira, daño consistente\n` +
        `▸ *Locus* — Francotirador one-shot con cabeza\n` +
        `▸ *MAC-10* — SMG letal en corto\n\n` +
        `💪 *A-Tier*\n` +
        `▸ *QQ9* — SMG equilibrada para ranked\n` +
        `▸ *M13* — AR control de retroceso fácil\n` +
        `▸ *DL Q33* — Bolt-action clásico\n\n` +
        `━━━━━━━━━━━━━━\n` +
        `💡 Usa \`${p}codmclase <tipo>\` para ver combinaciones completas.`
      );
    },
  },

  {
    name: "codmclase",
    alias: ["codmloadout", "codmbuild"],
    description: "Clase/loadout recomendada para CODM",
    category: "Gaming",
    execute: async ({ args, reply }) => {
      const tipo = (args[0] || "").toLowerCase();

      const clases = {
        rush: {
          nombre: "🏃 Rush / Agresivo",
          principal: "CBR4 (SMG) — Mayor velocidad de disparo",
          secundaria: "Pistola DP .45",
          perk1: "Ligero — velocidad de movimiento +10%",
          perk2: "Fantasma — oculto de UAVs",
          perk3: "Alerta — detectas pasos enemigos",
          letal: "Granada de fragmentación",
          tactoca: "Humo",
          tip: "Juega cerca de esquinas. Siempre muévete, nunca pares.",
        },
        sniper: {
          nombre: "🎯 Sniper / Francotirador",
          principal: "Locus — máximo daño por disparo",
          secundaria: "QQ9 — para lucha cerrada",
          perk1: "Espalda fría — menos retroceso acuclillado",
          perk2: "Fantasma — UAV invisible",
          perk3: "Maestría — recarga más rápida",
          letal: "C4",
          tactoca: "Flash",
          tip: "Mantén distancia. Cambia de posición después de cada baja.",
        },
        soporte: {
          nombre: "🛡️ Soporte / Defensivo",
          principal: "Kilo 141 — control y daño equilibrado",
          secundaria: "Escopeta BY15",
          perk1: "Manos rápidas — swap rápido de armas",
          perk2: "Sin rastro — marcador eliminado del minimapa",
          perk3: "Vigilante — más duración de killstreaks",
          letal: "Claymore",
          tactoca: "Sensor de latido",
          tip: "Cubre a tus compañeros. Prioriza objetivos en modos como Dominación.",
        },
      };

      const clase = clases[tipo];
      if (!clase) {
        return reply(
          `🔫 *CODM — Clases disponibles*\n━━━━━━━━━━━━━━\n\n` +
          `Uso: \`${p}codmclase <tipo>\`\n\n` +
          `Tipos:\n` +
          `▸ \`rush\` — Agresivo\n` +
          `▸ \`sniper\` — Francotirador\n` +
          `▸ \`soporte\` — Defensivo/Objetivo`
        );
      }

      await reply(
        `🔫 *CODM — Clase: ${clase.nombre}*\n━━━━━━━━━━━━━━\n\n` +
        `🔧 *Arma Principal:* ${clase.principal}\n` +
        `🔧 *Secundaria:* ${clase.secundaria}\n\n` +
        `⚙️ *Perks*\n` +
        `▸ Ranura 1: ${clase.perk1}\n` +
        `▸ Ranura 2: ${clase.perk2}\n` +
        `▸ Ranura 3: ${clase.perk3}\n\n` +
        `💣 Letal: ${clase.letal}\n` +
        `🌫️ Táctica: ${clase.tactoca}\n\n` +
        `💡 *Tip:* ${clase.tip}`
      );
    },
  },

  // ─────────────────────────────────────────
  // 💎 BRAWL STARS
  // ─────────────────────────────────────────
  {
    name: "brawl",
    alias: ["brawlstars", "bs"],
    description: "Stats de jugador de Brawl Stars por tag",
    category: "Gaming",
    execute: async ({ args, reply, react }) => {
      let tag = (args[0] || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!tag) {
        return reply(
          `💎 *BRAWL STARS — Stats*\n━━━━━━━━━━━━━━\n\n` +
          `Uso: \`${p}brawl #TAG\`\n\n` +
          `Ejemplo: \`${p}brawl #ABC123\`\n\n` +
          `💡 Encuentra tu tag en tu perfil dentro del juego.`
        );
      }

      await react("🔍");
      try {
        const res = await axios.get(
          `https://bsproxy.royaleapi.dev/v1/players/%23${tag}`,
          {
            timeout: 8000,
            headers: {
              Authorization: `Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.placeholder`,
            },
          }
        );
        const d = res.data;
        await reply(
          `💎 *BRAWL STARS — ${d.name}*\n━━━━━━━━━━━━━━\n\n` +
          `🏷️ Tag: *#${tag}*\n` +
          `🏆 Trofeos: *${d.trophies?.toLocaleString() || "?"}*\n` +
          `🎯 Trofeos máx: *${d.highestTrophies?.toLocaleString() || "?"}*\n` +
          `⭐ Exp: Nivel *${d.expLevel || "?"}*\n` +
          `🤖 Brawlers: *${d.brawlers?.length || "?"}*\n\n` +
          `🏅 *Club:* ${d.club?.name || "Sin club"}`
        );
      } catch {
        await reply(
          `💎 *BRAWL STARS — Stats*\n━━━━━━━━━━━━━━\n\n` +
          `❌ No se pudo obtener el perfil *#${tag}*.\n\n` +
          `▸ Verifica que el tag sea correcto\n` +
          `▸ El perfil debe ser público\n` +
          `▸ Intenta sin el símbolo #`
        );
      }
    },
  },

  {
    name: "brawler",
    alias: ["brawlhero", "brawlpersonaje"],
    description: "Info de brawler de Brawl Stars",
    category: "Gaming",
    execute: async ({ args, reply }) => {
      const nombre = (args.join(" ") || "").toLowerCase().trim();

      const brawlers = {
        shelly: {
          n: "Shelly", clase: "Brawler", rareza: "🔵 Común",
          descripcion: "Escopeta de corto alcance. Su super elimina escudos y estructuras.",
          super: "Shell Shock — disparo potente que ralentiza enemigos.",
          tip: "Ideal para modos de corto rango como Gem Grab. Acercate antes de disparar.",
        },
        colt: {
          n: "Colt", clase: "Brawler", rareza: "🔵 Común",
          descripcion: "Pistolero de largo alcance con 6 balas rápidas.",
          super: "Bullet Storm — destruye paredes y hace gran daño.",
          tip: "Usa objetos como cobertura. Punta en Brawl Ball y Bounty.",
        },
        bull: {
          n: "Bull", clase: "Brawler", rareza: "🔵 Común",
          descripcion: "Tank de escopeta. Tanquea mucho daño y lo aplica en corto.",
          super: "Bulldozer — carga hacia adelante destruyendo paredes.",
          tip: "Combina su super con arbustos para emboscadas. Excelente en Heist.",
        },
        spike: {
          n: "Spike", clase: "Brawler", rareza: "🟡 Legendario",
          descripcion: "Cactus que lanza espinas en área. Super que ralentiza zona entera.",
          super: "Stick Around — zona de ralentización y daño continuo.",
          tip: "Controla el centro del mapa. Punta en Gem Grab y Bounty.",
        },
        leon: {
          n: "Leon", clase: "Assassin", rareza: "🟡 Legendario",
          descripcion: "Asesino con invisibilidad. Letal a corta distancia.",
          super: "Smoke Bomb — se vuelve invisible por varios segundos.",
          tip: "Úsalo para flanquear o escapar. Aprovecha arbustos para emboscadas.",
        },
        crow: {
          n: "Crow", clase: "Assassin", rareza: "🟡 Legendario",
          descripcion: "Lanza navajas con veneno. Reduce la curación enemiga.",
          super: "Swoop — salta hacia atrás o sobre enemigos causando daño.",
          tip: "Peligroso para apoyar a tanks. Su veneno deja enemigos sin curación.",
        },
      };

      const entrada = brawlers[nombre] || brawlers[Object.keys(brawlers).find(k => nombre.includes(k))];

      if (!entrada) {
        return reply(
          `💎 *BRAWL STARS — Brawlers*\n━━━━━━━━━━━━━━\n\n` +
          `Uso: \`${p}brawler <nombre>\`\n\n` +
          `Disponibles:\n` +
          Object.values(brawlers).map(b => `▸ *${b.n}* (${b.rareza})`).join("\n") +
          `\n\n_Más brawlers próximamente._`
        );
      }

      await reply(
        `💎 *BRAWL STARS — ${entrada.n}*\n━━━━━━━━━━━━━━\n\n` +
        `🏷️ Clase: ${entrada.clase}\n` +
        `✨ Rareza: ${entrada.rareza}\n\n` +
        `📖 ${entrada.descripcion}\n\n` +
        `⚡ *Super:* ${entrada.super}\n\n` +
        `💡 *Tip:* ${entrada.tip}`
      );
    },
  },

  {
    name: "brawlmeta",
    alias: ["brawlstierlist", "bstierlist"],
    description: "Meta actual de Brawl Stars",
    category: "Gaming",
    execute: async ({ reply }) => {
      await reply(
        `💎 *BRAWL STARS — Meta Actual*\n━━━━━━━━━━━━━━\n\n` +
        `🥇 *S-Tier (Overpowered)*\n` +
        `▸ Cordelius · Maisie · Angelo · Draco\n\n` +
        `💪 *A-Tier (Muy fuertes)*\n` +
        `▸ Leon · Crow · Spike · Meg · Otis\n\n` +
        `✅ *B-Tier (Buenos en su modo)*\n` +
        `▸ Mortis · Tara · Gene · Emz · Bo\n\n` +
        `⚠️ *C-Tier (Situacionales)*\n` +
        `▸ Shelly · Colt · Bull · Brock\n\n` +
        `━━━━━━━━━━━━━━\n` +
        `💡 El meta cambia con cada actualización.\n` +
        `Usa \`${p}brawler <nombre>\` para info específica.`
      );
    },
  },

  // ─────────────────────────────────────────
  // 🏗️ FORTNITE
  // ─────────────────────────────────────────
  {
    name: "fortnite",
    alias: ["fn", "fortnitev"],
    description: "Info de temporada actual de Fortnite",
    category: "Gaming",
    execute: async ({ reply }) => {
      await reply(
        `🏗️ *FORTNITE*\n━━━━━━━━━━━━━━\n\n` +
        `🎮 Battle Royale de construcción de Epic Games.\n` +
        `100 jugadores, último en pie gana.\n\n` +
        `🗺️ *Modos de juego*\n` +
        `▸ Battle Royale — Clásico PvP\n` +
        `▸ Zero Build — Sin construcción\n` +
        `▸ Ranked — Modo competitivo\n` +
        `▸ LEGO Fortnite — Modo creativo/PvE\n` +
        `▸ Rocket Racing — Carreras\n` +
        `▸ Festival — Modo musical\n\n` +
        `📋 *Comandos*\n` +
        `▸ \`${p}fortnitearmas\` — Armas meta actuales\n\n` +
        `━━━━━━━━━━━━━━\n` +
        `💡 Descarga gratis en PC, consola y móvil (Samsung/Epic Games).`
      );
    },
  },

  {
    name: "fortnitearmas",
    alias: ["fnmeta", "fnweapons", "fnarmas"],
    description: "Armas meta de Fortnite",
    category: "Gaming",
    execute: async ({ reply }) => {
      await reply(
        `🏗️ *FORTNITE — Armas Meta*\n━━━━━━━━━━━━━━\n\n` +
        `🏆 *S-Tier*\n` +
        `▸ *Heavy Sniper* — One-shot a jugadores sin escudo\n` +
        `▸ *Striker AR* — Daño y precisión balanceada\n` +
        `▸ *Combat Shotgun* — Letal en corto alcance\n\n` +
        `💪 *A-Tier*\n` +
        `▸ *Thermal AR* — Detecta enemigos a través de paredes\n` +
        `▸ *Suppressed SMG* — Silenciosa y rápida\n` +
        `▸ *Hunting Rifle* — Semi-sniper de alto daño\n\n` +
        `✅ *B-Tier*\n` +
        `▸ *Pump Shotgun* — Clásico, versátil\n` +
        `▸ *Heavy AR* — Buena para spam\n\n` +
        `━━━━━━━━━━━━━━\n` +
        `💡 Siempre lleva: 1 SMG/Shotgun (corto) + 1 AR/Sniper (largo).`
      );
    },
  },

  // ─────────────────────────────────────────
  // ⚔️ VALORANT
  // ─────────────────────────────────────────
  {
    name: "valorant",
    alias: ["val", "valo"],
    description: "Stats básicos de Valorant por usuario#tag",
    category: "Gaming",
    execute: async ({ args, reply, react }) => {
      const input = args.join(" ").trim();
      if (!input || !input.includes("#")) {
        return reply(
          `⚔️ *VALORANT — Stats*\n━━━━━━━━━━━━━━\n\n` +
          `Uso: \`${p}valorant Usuario#TAG\`\n\n` +
          `Ejemplo: \`${p}valorant RageBot#2024\`\n\n` +
          `💡 Tu usuario#tag aparece en tu perfil de Valorant.`
        );
      }

      const [name, tag] = input.split("#");
      await react("🔍");

      try {
        const res = await axios.get(
          `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
          { timeout: 8000 }
        );
        const d = res.data?.data;
        if (!d) throw new Error("No data");

        await reply(
          `⚔️ *VALORANT — ${d.name}#${d.tag}*\n━━━━━━━━━━━━━━\n\n` +
          `🌍 Región: *${d.region?.toUpperCase() || "N/A"}*\n` +
          `🃏 Nivel de cuenta: *${d.account_level || "?"}*\n` +
          `📅 Última actividad: ${d.last_update || "N/A"}\n\n` +
          `💡 Para stats de ranked usa la web: tracker.gg/valorant`
        );
      } catch {
        await reply(
          `⚔️ *VALORANT — Stats*\n━━━━━━━━━━━━━━\n\n` +
          `❌ No se encontró el jugador *${name}#${tag}*\n\n` +
          `▸ Verifica el nombre y tag exacto\n` +
          `▸ La cuenta debe haber jugado recientemente\n` +
          `▸ Intenta en: tracker.gg/valorant`
        );
      }
    },
  },

  {
    name: "valagente",
    alias: ["valagent", "valorantagente"],
    description: "Info de agente de Valorant",
    category: "Gaming",
    execute: async ({ args, reply }) => {
      const nombre = (args.join(" ") || "").toLowerCase().trim();

      const agentes = {
        jett: {
          n: "Jett", rol: "Duelista", origen: "🇰🇷 Corea",
          descripcion: "La duelista más ágil. Domina el aire con sus habilidades de movilidad.",
          ult: "Blade Storm — navajas precisas que se recargan con kills.",
          tip: "Perfecta para abrir con Operator. Su dash la hace casi imposible de matar.",
        },
        sage: {
          n: "Sage", rol: "Centinela/Sanador", origen: "🇨🇳 China",
          descripcion: "La única agente con curación y resurreción. Pilar de cualquier equipo.",
          ult: "Resurrection — revive a un compañero caído.",
          tip: "Úsala para cerrar puertas con su orbe de hielo y curar en sitio.",
        },
        reyna: {
          n: "Reyna", rol: "Duelista", origen: "🇲🇽 México",
          descripcion: "Vampiro que se alimenta de kills. Curación tras cada eliminación.",
          ult: "Empress — velocidad de fuego máxima y curación automática.",
          tip: "Solo es efectiva si matas. Ideal para ranked en solitario con buen aim.",
        },
        omen: {
          n: "Omen", rol: "Controlador", origen: "Desconocido",
          descripcion: "Maestro de las sombras. Humos, teleports y ceguera para controlar el mapa.",
          ult: "From the Shadows — se teletransporta a cualquier punto del mapa.",
          tip: "Sus humos son los más versátiles. Ideal para jugadores que quieren controlar el ritmo.",
        },
        sova: {
          n: "Sova", rol: "Iniciador", origen: "🇷🇺 Rusia",
          descripcion: "Cazador que revela enemigos con flechas de reconocimiento.",
          ult: "Hunter's Fury — tres rayos que atraviesan paredes.",
          tip: "El reconocimiento es su fuerte. Aprende lineups de flechas para tu mapa favorito.",
        },
      };

      const entrada = agentes[nombre] || agentes[Object.keys(agentes).find(k => nombre.includes(k))];

      if (!entrada) {
        return reply(
          `⚔️ *VALORANT — Agentes*\n━━━━━━━━━━━━━━\n\n` +
          `Uso: \`${p}valagente <nombre>\`\n\n` +
          `Disponibles:\n` +
          Object.values(agentes).map(a => `▸ *${a.n}* — ${a.rol}`).join("\n") +
          `\n\n_Más agentes próximamente._`
        );
      }

      await reply(
        `⚔️ *VALORANT — ${entrada.n}*\n━━━━━━━━━━━━━━\n\n` +
        `🎯 Rol: *${entrada.rol}*\n` +
        `🌍 Origen: ${entrada.origen}\n\n` +
        `📖 ${entrada.descripcion}\n\n` +
        `⚡ *Ultimate:* ${entrada.ult}\n\n` +
        `💡 *Tip:* ${entrada.tip}`
      );
    },
  },

];

export default gamingCommands;
