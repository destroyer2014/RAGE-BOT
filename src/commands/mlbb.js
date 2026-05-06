// ════════════════════════════════════════════
//  MLBB — Mobile Legends: Bang Bang
//  Módulo Gaming (beta) — rage-bot v3.0.8
// ════════════════════════════════════════════

import config from "../../config.js";

// ── Base de datos local de héroes ───────────
const HEROES = {
  layla: {
    nombre: "Layla", rol: "Marksman", especialidad: "Push/Recon",
    dificultad: "⭐ Fácil",
    habilidades: ["🔫 Malefic Bomb (Pasiva)", "💥 Malefic Bomb (1)", "🌀 Void Mortar (2)", "☄️ Destruction Rush (Ult)"],
    descripcion: "Marksman de largo alcance ideal para principiantes. Su daño escala con la distancia.",
    counters: ["Lancelot", "Helcurt", "Natalia"],
    contrado_por: ["Saber", "Zilong", "Karina"],
    emblema: "Marksman", build: ["Demon Hunter Sword", "Scarlet Phantom", "Berserker's Fury", "Wind of Nature", "Malefic Roar", "Immortality"]
  },
  gusion: {
    nombre: "Gusion", rol: "Mage/Assassin", especialidad: "Burst/Chase",
    dificultad: "⭐⭐⭐⭐ Difícil",
    habilidades: ["🔮 Dagger Specialist (Pasiva)", "💫 Sword Spike (1)", "🌀 Shadowblade Slaughter (2)", "⚡ Incandescence (Ult)"],
    descripcion: "Assassin mago de alto burst. Requiere buena mecánica para dominar su combo.",
    counters: ["Kaja", "Diggie", "Nana"],
    contrado_por: ["Akai", "Franco", "Khufra"],
    emblema: "Mage", build: ["Arcane Boots", "Clock of Destiny", "Lightning Truncheon", "Holy Crystal", "Divine Glaive", "Blood Wings"]
  },
  chou: {
    nombre: "Chou", rol: "Fighter", especialidad: "Control de masas/Chase",
    dificultad: "⭐⭐⭐⭐ Difícil",
    habilidades: ["🥊 Only Fast (Pasiva)", "💨 Jeet Kune Do (1)", "🌀 Shunpo (2)", "👊 The Way of Dragon (Ult)"],
    descripcion: "Fighter con gran movilidad y CC. Muy popular en ranked por su potencial de jugadas.",
    counters: ["Jawhead", "Franco", "Kaja"],
    contrado_por: ["Esmeralda", "Uranus", "Hylos"],
    emblema: "Fighter", build: ["Tough Boots", "Blade of the Heptaseas", "Endless Battle", "Blade of Despair", "Immortality", "Antique Cuirass"]
  },
  ling: {
    nombre: "Ling", rol: "Assassin", especialidad: "Chase/Recon",
    dificultad: "⭐⭐⭐⭐⭐ Muy Difícil",
    habilidades: ["🌸 Cloud Walker (Pasiva)", "🗡️ Finch Poise (1)", "💨 Tempest of Blades (2)", "❄️ Tempest of Blades (Ult)"],
    descripcion: "El asesino más difícil del juego. Puede escalar paredes y dominar mapas enteros.",
    counters: ["Diggie", "Nana", "Kaja"],
    contrado_por: ["Saber", "Karina", "Helcurt"],
    emblema: "Assassin", build: ["Warrior Boots", "Endless Battle", "Blade of Despair", "Hunter Strike", "Immortality", "Malefic Roar"]
  },
  tigreal: {
    nombre: "Tigreal", rol: "Tank", especialidad: "Iniciador/Soporte",
    dificultad: "⭐⭐ Fácil-Medio",
    habilidades: ["🛡️ Fearless (Pasiva)", "⚔️ Attack Wave (1)", "🌊 Sacred Hammer (2)", "💥 Rotary Impact (Ult)"],
    descripcion: "Tank iniciador clásico. Ideal para aprender a jugar de support/tank en ranked.",
    counters: ["Atlas", "Franco", "Akai"],
    contrado_por: ["Karrie", "Claude", "Moskov"],
    emblema: "Tank", build: ["Tough Boots", "Dominance Ice", "Oracle", "Antique Cuirass", "Immortality", "Cursed Helmet"]
  },
  angela: {
    nombre: "Angela", rol: "Support", especialidad: "Escudo/Buff",
    dificultad: "⭐⭐ Fácil-Medio",
    habilidades: ["💕 Smart Heart (Pasiva)", "🔗 Love Waves (1)", "🌸 Puppet-on-a-String (2)", "💫 Heartguard (Ult)"],
    descripcion: "Support con escudos y buffs. Su ult le permite unirse a cualquier aliado en el mapa.",
    counters: ["Nana", "Diggie", "Estes"],
    contrado_por: ["Helcurt", "Selena", "Saber"],
    emblema: "Support", build: ["Demon Shoes", "Fleeting Time", "Genius Wand", "Holy Crystal", "Ice Queen Wand", "Immortality"]
  },
  lancelot: {
    nombre: "Lancelot", rol: "Assassin", especialidad: "Chase/Burst",
    dificultad: "⭐⭐⭐⭐ Difícil",
    habilidades: ["⚔️ Soul Cutter (Pasiva)", "🌀 Puncture (1)", "💨 Thorned Rose (2)", "🗡️ Phantom Execution (Ult)"],
    descripcion: "Asesino de alta movilidad. Inmune durante su ult, difícil de atrapar.",
    counters: ["Kaja", "Khufra", "Diggie"],
    contrado_por: ["Saber", "Akai", "Franco"],
    emblema: "Assassin", build: ["Warrior Boots", "Endless Battle", "Blade of Despair", "Hunter Strike", "Malefic Roar", "Immortality"]
  },
  nana: {
    nombre: "Nana", rol: "Mage/Support", especialidad: "Control/Poke",
    dificultad: "⭐ Fácil",
    habilidades: ["🐱 Molina's Gift (Pasiva)", "🌟 Magic Boomerang (1)", "🐾 Molina Smooch (2)", "💥 Dragon Feast (Ult)"],
    descripcion: "Mage/Support con gran CC. Su habilidad 2 convierte enemigos en gatitos.",
    counters: ["Selena", "Valir", "Pharsa"],
    contrado_por: ["Lancelot", "Helcurt", "Gusion"],
    emblema: "Mage", build: ["Demon Shoes", "Ice Queen Wand", "Glowing Wand", "Holy Crystal", "Oracle", "Immortality"]
  },
};

// ── Counters extendidos ──────────────────────
const COUNTERS_DB = {
  marksman: ["Lancelot", "Helcurt", "Natalia", "Karina", "Saber"],
  mage:     ["Lancelot", "Gusion", "Helcurt", "Saber", "Karina"],
  tank:     ["Karrie", "Claude", "Moskov", "Kimmy", "Brody"],
  fighter:  ["Esmeralda", "Uranus", "Hylos", "Alice", "Belerick"],
  assassin: ["Kaja", "Diggie", "Nana", "Khufra", "Akai"],
  support:  ["Helcurt", "Selena", "Saber", "Gusion", "Lancelot"],
};

// ── Parches (actualizar con cada parche nuevo) ─
const PATCH_INFO = {
  version: "2.1.67",
  fecha: "22 Abril 2026",
  buffs: [
    "💪 *Dyrroth* — Ajuste de curva de poder, Skill 1 mejorada en fase de línea",
    "💪 *Harith* — Ajuste de curva, ahora puede tomar rol de Jungler",
    "💪 *Melissa* — Control más fluido entre Skill 1 y 2, Ultimate ajustada",
    "💪 *Wanwan* — Capacidad de línea en early game ligeramente aumentada",
    "💪 *Bruno* — Atributos ajustados al estándar Marksman actualizado",
    "💪 *Terizla* — Se eliminó el sistema de maná, habilidades gratuitas",
    "💪 *Dominance Ice* — Stats mejoradas",
    "💪 *Emblema Marksman* — Buffed para la temporada actual",
  ],
  nerfs: [
    "📉 *Hanabi* — Atributos ajustados a los nuevos estándares Marksman",
    "📉 *Karrie* — Reducción de atributos, costo de maná ajustado",
    "📉 *Claude* — Burst de Ult en early-mid reducido, se añadió costo de maná",
    "📉 *Natan* — Atributos y costo de maná ajustados",
    "📉 *Sora* — Potencial de kill solitario en Lv.4 reducido",
  ],
  ajustes: [
    "⚙️ *Aulus* — REVAMP completo: nuevo kit, nueva Ult, habilidad de persecución",
    "⚙️ *Marcel* — Ultimate optimizada para reducir efectos negativos en aliados",
    "⚙️ *Brody* — Curva de poder: buff en early/late, reducción en mid game",
    "⚙️ *Layla / Miya / Ixia / Moskov* — Ajustes de atributos Marksman + velocidad base",
    "⚙️ *Evento ALLSTAR* — Tidal Treasure Hunt disponible (30 Abr – 28 Jun)",
    "⚙️ *Modo Frozen Sea Showdown* — 4v4 Franco disponible hasta 06 Mayo",
  ],
};

// ── Eventos activos (actualizar con cada parche) ───
const EVENTOS = [
  { nombre: "🏆 Ranked Season — Temporada activa", tipo: "Ranked", estado: "🟢 Activo", hasta: "Por confirmar" },
  { nombre: "🎣 Tidal Treasure Hunt — Pesca de recompensas", tipo: "ALLSTAR", estado: "🟢 Activo", hasta: "28 Jun 2026" },
  { nombre: "⚔️ Tide Clash 5vs5 — Torneo de marea", tipo: "ALLSTAR", estado: "🟡 Próximo", hasta: "08 May – 16 Jun 2026" },
  { nombre: "🐟 Tidal Fishing Mini-game", tipo: "Mini-juego", estado: "🟡 Próximo", hasta: "15 May – 28 Jun 2026" },
  { nombre: "🧊 Frozen Sea Showdown — 4v4 Franco", tipo: "Modo especial", estado: "🔴 Por terminar", hasta: "06 May 2026" },
  { nombre: "🌊 Tide Siege — Defensa de base", tipo: "Modo especial", estado: "🟡 Próximo", hasta: "Desde 07 May 2026" },
];

// ════════════════════════════════════════════
const mlbbCommands = [

  // ────────────────────────────────────────
  // !mlbb — Submenú principal
  // ────────────────────────────────────────
  {
    name: "mlbb",
    alias: ["mobilelegends", "ml"],
    description: "Menú de comandos de Mobile Legends (beta)",
    category: "Gaming",
    execute: async ({ reply }) => {
      await reply(
`╔═══════════════════════════╗
║  📱 *MOBILE LEGENDS: BB*    ║
║       *(BETA)*               ║
╚═══════════════════════════╝

🎮 *Comandos disponibles:*
━━━━━━━━━━━━━━━━━━━━

👤 *!mlstats [ID]* 
   Ver stats de tu cuenta

📋 *!mlheroe [nombre]*
   Info completa de un héroe

⚔️ *!mlcounter [nombre/rol]*
   Counters de un héroe o rol

📰 *!mlparche*
   Últimos buffs, nerfs y ajustes

🎪 *!mleventos*
   Eventos activos en el juego

📣 *!lfg [mensaje]*
   Llamar a todos a jugar

━━━━━━━━━━━━━━━━━━━━
_⚠️ Módulo en beta — puede mejorar_
_Usa !mlheroe para ver héroes disponibles_`
      );
    },
  },

  // ────────────────────────────────────────
  // !mlstats — Stats de cuenta por ID
  // ────────────────────────────────────────
  {
    name: "mlstats",
    alias: ["mlcuenta", "mlperfil"],
    description: "Ver nickname de cuenta ML — !mlstats [ID] [Servidor]",
    category: "Gaming",
    execute: async ({ reply, args }) => {
      const id = args[0];
      const zone = args[1];
      if (!id || !zone) {
        return reply(
          `📱 *ML STATS*\n━━━━━━━━━━━━━━\n` +
          `❓ Uso: *!mlstats [ID] [Servidor]*\n\n` +
          `Ejemplo: *!mlstats 371880848 6056*\n\n` +
          `_Tu ID y Servidor los encuentras en tu perfil de ML,_\n` +
          `_esquina superior izquierda del juego._`
        );
      }
      await reply(`⏳ Buscando cuenta *${id}* (Servidor: ${zone})...`);
      try {
        const res = await fetch(`https://api.isan.eu.org/nickname/ml?id=${id}&zone=${zone}`);
        const data = await res.json();
        if (!data || !data.success || !data.name) throw new Error("not found");
        await reply(
          `📱 *ML STATS*\n━━━━━━━━━━━━━━\n` +
          `👤 Nickname: *${data.name}*\n` +
          `🆔 ID: *${id}*\n` +
          `🌐 Servidor: *${zone}*\n\n` +
          `_✅ Cuenta verificada en Mobile Legends_`
        );
      } catch {
        await reply(
          `❌ *No se pudo obtener la cuenta.*\n\n` +
          `Verifica que tu *ID y Servidor* sean correctos.\n` +
          `Los encuentras en tu perfil ML → esquina superior izquierda.\n\n` +
          `Ejemplo: *!mlstats 371880848 6056*`
        );
      }
    },
  },

  // ────────────────────────────────────────
  // !mlheroe — Info de héroe
  // ────────────────────────────────────────
  {
    name: "mlheroe",
    alias: ["mlhero", "mhero"],
    description: "Info de un héroe de ML — !mlheroe [nombre]",
    category: "Gaming",
    execute: async ({ reply, args }) => {
      if (!args.length) {
        const lista = Object.values(HEROES).map((h) => `• ${h.nombre} (${h.rol})`).join("\n");
        return reply(
          `📋 *HÉROES DISPONIBLES*\n━━━━━━━━━━━━━━\n${lista}\n\n` +
          `_Uso: !mlheroe [nombre]_\n_Ej: !mlheroe Gusion_`
        );
      }
      const key = args[0].toLowerCase();
      const h = HEROES[key];
      if (!h) {
        return reply(
          `❌ Héroe *${args[0]}* no encontrado.\n\n` +
          `Usa *!mlheroe* sin argumentos para ver la lista.`
        );
      }
      await reply(
        `╔══════════════════════╗\n` +
        `║  ⚔️  *${h.nombre.toUpperCase()}*\n` +
        `╚══════════════════════╝\n\n` +
        `🎭 Rol: *${h.rol}*\n` +
        `🎯 Especialidad: *${h.especialidad}*\n` +
        `🎮 Dificultad: ${h.dificultad}\n\n` +
        `📖 *Descripción:*\n${h.descripcion}\n\n` +
        `✨ *Habilidades:*\n${h.habilidades.join("\n")}\n\n` +
        `✅ *Counters a:* ${h.counters.join(", ")}\n` +
        `❌ *Contrado por:* ${h.contrado_por.join(", ")}\n\n` +
        `🛡️ *Emblema:* ${h.emblema}\n` +
        `🔧 *Build sugerida:*\n${h.build.map((i) => `• ${i}`).join("\n")}`
      );
    },
  },

  // ────────────────────────────────────────
  // !mlcounter — Counters por héroe o rol
  // ────────────────────────────────────────
  {
    name: "mlcounter",
    alias: ["mlcontra", "counter"],
    description: "Ver counters de un héroe o rol — !mlcounter [nombre/rol]",
    category: "Gaming",
    execute: async ({ reply, args }) => {
      if (!args.length) {
        return reply(
          `⚔️ *COUNTERS ML*\n━━━━━━━━━━━━━━\n` +
          `Uso: *!mlcounter [héroe o rol]*\n\n` +
          `Ejemplos:\n` +
          `• *!mlcounter Gusion*\n` +
          `• *!mlcounter marksman*\n` +
          `• *!mlcounter tank*\n\n` +
          `Roles: marksman, mage, tank, fighter, assassin, support`
        );
      }
      const key = args[0].toLowerCase();
      // Buscar por héroe primero
      const h = HEROES[key];
      if (h) {
        return reply(
          `⚔️ *COUNTERS — ${h.nombre.toUpperCase()}*\n━━━━━━━━━━━━━━\n\n` +
          `✅ *${h.nombre} counter a:*\n${h.counters.map((c) => `• ${c}`).join("\n")}\n\n` +
          `❌ *${h.nombre} es contrado por:*\n${h.contrado_por.map((c) => `• ${c}`).join("\n")}\n\n` +
          `_Usa !mlheroe ${key} para más info_`
        );
      }
      // Buscar por rol
      const counters = COUNTERS_DB[key];
      if (counters) {
        return reply(
          `⚔️ *COUNTERS — ROL: ${key.toUpperCase()}*\n━━━━━━━━━━━━━━\n\n` +
          `Los mejores counters para este rol:\n` +
          `${counters.map((c) => `• ${c}`).join("\n")}\n\n` +
          `_Usa !mlheroe [nombre] para ver info completa_`
        );
      }
      await reply(
        `❌ No encontré counters para *${args[0]}*.\n\n` +
        `Prueba con un héroe disponible o un rol:\n` +
        `marksman • mage • tank • fighter • assassin • support`
      );
    },
  },

  // ────────────────────────────────────────
  // !mlparche — Últimos buffs/nerfs
  // ────────────────────────────────────────
  {
    name: "mlparche",
    alias: ["mlpatch", "mlupdate", "mlnota"],
    description: "Ver últimos buffs, nerfs y ajustes del parche",
    category: "Gaming",
    execute: async ({ reply }) => {
      const p = PATCH_INFO;
      await reply(
        `╔══════════════════════════╗\n` +
        `║  📰 *PARCHE ${p.version}*       ║\n` +
        `║  _${p.fecha}_              ║\n` +
        `╚══════════════════════════╝\n\n` +
        `💪 *BUFFS:*\n${p.buffs.join("\n")}\n\n` +
        `📉 *NERFS:*\n${p.nerfs.join("\n")}\n\n` +
        `⚙️ *AJUSTES:*\n${p.ajustes.join("\n")}\n\n` +
        `_Info actualizada al parche ${p.version}_`
      );
    },
  },

  // ────────────────────────────────────────
  // !mleventos — Eventos activos
  // ────────────────────────────────────────
  {
    name: "mleventos",
    alias: ["mlevents", "mlevent"],
    description: "Ver eventos activos en Mobile Legends",
    category: "Gaming",
    execute: async ({ reply }) => {
      const lista = EVENTOS.map(
        (e) => `${e.estado} *${e.nombre}*\n   Tipo: ${e.tipo} | Hasta: ${e.hasta}`
      ).join("\n\n");
      await reply(
        `╔══════════════════════════╗\n` +
        `║  🎪 *EVENTOS MLBB*         ║\n` +
        `╚══════════════════════════╝\n\n` +
        `${lista}\n\n` +
        `🟢 Activo  🟡 Próximo  🔴 Por terminar\n` +
        `_Info actualizada manualmente_`
      );
    },
  },

  // ────────────────────────────────────────
  // !lfg — Llamar a jugar (tag personalizado)
  // ────────────────────────────────────────
  {
    name: "lfg",
    alias: ["jugar", "queue", "party"],
    description: "Llamar a todos a jugar ML — !lfg [mensaje]",
    category: "Gaming",
    execute: async ({ sock, msg, reply, args }) => {
      const isGroup = msg.key.remoteJid.endsWith("@g.us");
      if (!isGroup) return reply("⚠️ Este comando solo funciona en grupos.");
      const mensaje = args.join(" ") || "¿Alguien para jugar? 🎮";
      const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
      const miembros = groupMetadata.participants
        .filter((p) => p.id !== msg.key.participant)
        .map((p) => p.id);
      const menciones = miembros.map((id) => `@${id.split("@")[0]}`).join(" ");
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
            `📣 *¡LFG — Looking For Group!* 🎮\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🗣️ ${mensaje}\n\n` +
            `${menciones}\n\n` +
            `_Responde si quieres jugar 👇_`,
          mentions: miembros,
        }
      );
    },
  },

  // ────────────────────────────────────────
  // !freef — Placeholder coming soon
  // ────────────────────────────────────────
  {
    name: "freef",
    alias: ["freefire", "ff"],
    description: "Free Fire (coming soon)",
    category: "Gaming",
    execute: async ({ reply }) => {
      await reply(
        `🔜 *FREE FIRE — Coming Soon*\n━━━━━━━━━━━━━━\n\n` +
        `Este módulo está en desarrollo 🛠️\n\n` +
        `_Próximamente podrás ver stats, héroes y más._`
      );
    },
  },

];

export default mlbbCommands;
