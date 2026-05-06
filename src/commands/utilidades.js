// ═══════════════════════════════════════════
//    RAGE-BOT — src/commands/utilidades.js
//     Comandos útiles inspirados en GataBot
// ═══════════════════════════════════════════

import axios from "axios";
import { random } from "../lib/utils.js";

const utilCommands = [

  // ────────────────────────────────────────
  // !clima — Clima de una ciudad
  // ────────────────────────────────────────
  {
    name: "clima",
    alias: ["weather", "tiempo"],
    description: "Clima de una ciudad",
    category: "Utilidades",
    execute: async ({ reply, react, text }) => {
      if (!text) return reply("🌍 Escribe una ciudad.\nEj: *!clima Lima*");
      await react("🌤️");
      try {
        const res = await axios.get(
          `https://wttr.in/${encodeURIComponent(text)}?format=j1`,
          { timeout: 10000 }
        );
        const d = res.data.current_condition[0];
        const area = res.data.nearest_area[0];
        const ciudad = area.areaName[0].value;
        const pais = area.country[0].value;
        const temp = d.temp_C;
        const feels = d.FeelsLikeC;
        const humid = d.humidity;
        const desc = d.weatherDesc[0].value;
        const viento = d.windspeedKmph;

        const emoji =
          desc.toLowerCase().includes("sun") || desc.toLowerCase().includes("clear") ? "☀️"
          : desc.toLowerCase().includes("cloud") ? "☁️"
          : desc.toLowerCase().includes("rain") ? "🌧️"
          : desc.toLowerCase().includes("storm") ? "⛈️"
          : desc.toLowerCase().includes("snow") ? "❄️"
          : "🌤️";

        await reply(
          `${emoji} *Clima en ${ciudad}, ${pais}*\n` +
          `━━━━━━━━━━━━━━\n` +
          `🌡️ Temperatura: *${temp}°C*\n` +
          `🤔 Sensación: *${feels}°C*\n` +
          `💧 Humedad: *${humid}%*\n` +
          `💨 Viento: *${viento} km/h*\n` +
          `📋 Estado: *${desc}*`
        );
      } catch {
        await reply("❌ No encontré esa ciudad. Verifica el nombre.");
      }
    },
  },

  // ────────────────────────────────────────
  // !calc — Calculadora
  // ────────────────────────────────────────
  {
    name: "calc",
    alias: ["calculadora", "calcular", "math"],
    description: "Calculadora básica",
    category: "Utilidades",
    execute: async ({ reply, text }) => {
      if (!text) return reply("🔢 Escribe una operación.\nEj: *!calc 25 * 4 + 10*");
      try {
        // Solo permite caracteres matemáticos seguros
        if (!/^[0-9+\-*/.() %^]+$/.test(text)) {
          return reply("❌ Solo se permiten operaciones matemáticas.");
        }
        const result = Function(`"use strict"; return (${text})`)();
        if (!isFinite(result)) return reply("❌ Resultado inválido.");
        await reply(
          `🔢 *Calculadora*\n━━━━━━━━━━━━━━\n` +
          `📥 Operación: \`${text}\`\n` +
          `📤 Resultado: *${result}*`
        );
      } catch {
        await reply("❌ Operación inválida. Ej: *!calc 10 + 5 * 2*");
      }
    },
  },

  // ────────────────────────────────────────
  // !dado — Dado con cantidad de caras
  // ────────────────────────────────────────
  {
    name: "dado",
    alias: ["dice", "roll"],
    description: "Tira un dado (ej: !dado 20 para dado de 20)",
    category: "Diversión",
    execute: async ({ reply, args }) => {
      const caras = parseInt(args[0]) || 6;
      if (caras < 2 || caras > 1000) return reply("🎲 El dado debe tener entre 2 y 1000 caras.");
      const resultado = random(1, caras);
      const emoji = resultado === caras ? "🎯" : resultado === 1 ? "💀" : "🎲";
      await reply(
        `${emoji} *Dado de ${caras} caras*\n━━━━━━━━━━━━━━\n` +
        `Resultado: *${resultado}*\n` +
        `${resultado === caras ? "¡Número máximo! 🎉" : resultado === 1 ? "¡Número mínimo! 😬" : ""}`
      );
    },
  },

  // ────────────────────────────────────────
  // !verdadoatrevimiento — Verdad o reto
  // ────────────────────────────────────────
  {
    name: "verdadoatrevimiento",
    alias: ["voa", "truthordare", "tod"],
    description: "Verdad o Atrevimiento aleatorio",
    category: "Diversión",
    execute: async ({ reply, args }) => {
      const verdades = [
        "¿Cuál es tu mayor miedo?",
        "¿A quién en este grupo le tienes más confianza?",
        "¿Cuál fue tu momento más vergonzoso?",
        "¿Has mentido hoy? ¿En qué?",
        "¿A quién le guardarías un secreto aquí?",
        "¿Cuál es lo más estúpido que has hecho por amor?",
        "¿Tienes crush en alguien del grupo?",
        "¿Qué es lo que más te avergüenza de ti mismo?",
        "¿Cuál es tu peor hábito?",
        "¿Qué canción escuchas en secreto?",
      ];
      const retos = [
        "Escribe un mensaje cariñoso a la última persona en tu lista de contactos.",
        "Cambia tu foto de perfil por un meme por 1 hora.",
        "Escribe en el grupo lo que sientes por la persona de tu derecha.",
        "Haz 10 sentadillas ahora mismo.",
        "Cambia tu estado a '¡Me encanta el grupo!' por 30 minutos.",
        "Manda un audio cantando cualquier canción.",
        "Cuenta un chiste malo.",
        "Escribe un poema de 4 versos para el grupo.",
        "Imita a alguien del grupo y que adivinen quién es.",
        "Manda el último meme que guardaste.",
      ];

      const tipo = args[0]?.toLowerCase();
      let elegido, label;

      if (tipo === "verdad" || tipo === "v") {
        elegido = verdades[random(0, verdades.length - 1)];
        label = "💬 *VERDAD*";
      } else if (tipo === "reto" || tipo === "r" || tipo === "atrevimiento" || tipo === "a") {
        elegido = retos[random(0, retos.length - 1)];
        label = "🔥 *RETO / ATREVIMIENTO*";
      } else {
        const esVerdad = Math.random() < 0.5;
        elegido = esVerdad
          ? verdades[random(0, verdades.length - 1)]
          : retos[random(0, retos.length - 1)];
        label = esVerdad ? "💬 *VERDAD*" : "🔥 *RETO / ATREVIMIENTO*";
      }

      await reply(
        `🎮 *Verdad o Atrevimiento*\n━━━━━━━━━━━━━━\n` +
        `${label}\n\n` +
        `_${elegido}_\n\n` +
        `_Usa !voa verdad / !voa reto para elegir_`
      );
    },
  },

  // ────────────────────────────────────────
  // !pokemon — Info de un Pokémon
  // ────────────────────────────────────────
  {
    name: "pokemon",
    alias: ["poke", "pokedex"],
    description: "Info de un Pokémon",
    category: "Utilidades",
    execute: async ({ reply, react, text }) => {
      if (!text) return reply("🔍 Escribe el nombre o número.\nEj: *!pokemon pikachu*");
      await react("⚡");
      try {
        const query = text.toLowerCase().trim().replace(/ /g, "-");
        const res = await axios.get(`https://pokeapi.co/api/v2/pokemon/${query}`, { timeout: 10000 });
        const p = res.data;
        const nombre = p.name.charAt(0).toUpperCase() + p.name.slice(1);
        const tipos = p.types.map((t) => t.type.name).join(", ");
        const stats = p.stats.map((s) => `  ${s.stat.name}: *${s.base_stat}*`).join("\n");
        const altura = (p.height / 10).toFixed(1);
        const peso = (p.weight / 10).toFixed(1);

        await reply(
          `⚡ *${nombre}* #${p.id}\n━━━━━━━━━━━━━━\n` +
          `🏷️ Tipo: *${tipos}*\n` +
          `📏 Altura: *${altura}m*\n` +
          `⚖️ Peso: *${peso}kg*\n\n` +
          `📊 *Stats base:*\n${stats}`
        );
      } catch {
        await reply("❌ No encontré ese Pokémon. Verifica el nombre.");
      }
    },
  },

  // ────────────────────────────────────────
  // !moneda — Cara o sello mejorado
  // ────────────────────────────────────────
  {
    name: "moneda",
    alias: ["coin", "flipcoin", "careosello"],
    description: "Cara o sello",
    category: "Diversión",
    execute: async ({ reply }) => {
      const resultado = Math.random() < 0.5;
      await reply(
        `🪙 *Lanzando moneda...*\n━━━━━━━━━━━━━━\n` +
        `Resultado: *${resultado ? "¡CARA! 😊" : "¡SELLO! 🔵"}*`
      );
    },
  },

  // ────────────────────────────────────────
  // !sorteo — Elegir ganador entre mencionados
  // ────────────────────────────────────────
  {
    name: "sorteo",
    alias: ["winner", "ganador", "random"],
    description: "Elige un ganador entre los mencionados",
    category: "Grupo",
    execute: async ({ sock, msg, from, reply, text }) => {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (mentioned.length < 2) return reply("👥 Menciona al menos 2 personas.\nEj: *!sorteo @user1 @user2 @user3*");

      const ganador = mentioned[random(0, mentioned.length - 1)];
      const premio = text.replace(/@\d+/g, "").trim() || "el premio";

      await sock.sendMessage(
        from,
        {
          text:
            `🎉 *¡SORTEO!*\n━━━━━━━━━━━━━━\n` +
            `🏆 Participantes: ${mentioned.length}\n` +
            `🎁 Premio: *${premio}*\n\n` +
            `🥇 *¡El ganador es:*\n@${ganador.split("@")[0]} *¡Felicitaciones!* 🎊`,
          mentions: [ganador],
        },
        { quoted: msg }
      );
    },
  },

  // ────────────────────────────────────────
  // !horoscopo — Horóscopo del día
  // ────────────────────────────────────────
  {
    name: "horoscopo",
    alias: ["horoscope", "signo"],
    description: "Horóscopo del día",
    category: "Diversión",
    execute: async ({ reply, text }) => {
      const signos = ["aries","tauro","geminis","cancer","leo","virgo","libra","escorpio","sagitario","capricornio","acuario","piscis"];
      if (!text) {
        return reply(
          `♈ *Signos disponibles:*\n━━━━━━━━━━━━━━\n` +
          signos.map((s) => `▸ ${s}`).join("\n") +
          `\n\nEj: *!horoscopo leo*`
        );
      }

      const signo = text.toLowerCase().trim();
      if (!signos.includes(signo)) return reply(`❌ Signo no válido.\nEj: *!horoscopo leo*\n\nSignos: ${signos.join(", ")}`);

      const predicciones = [
        "Hoy es un gran día para tomar decisiones importantes. La energía está a tu favor. 🌟",
        "Cuida tu salud y descansa lo suficiente. El descanso es clave hoy. 💤",
        "Una persona especial podría aparecer en tu vida hoy. Mantén los ojos abiertos. 👀",
        "Tu creatividad está en su punto más alto. Aprovéchala al máximo. 🎨",
        "Evita conflictos innecesarios. La paciencia será tu mejor aliada. 🕊️",
        "El dinero podría llegar de formas inesperadas. Mantén una actitud positiva. 💰",
        "Un viejo amigo podría contactarte. Los recuerdos afloran hoy. 📱",
        "Es momento de soltar lo que ya no te sirve. El cambio se acerca. 🌱",
        "La suerte está de tu lado hoy. Atrévete a dar ese paso que has dudado. ✨",
        "Confía en tu instinto. Tu intuición nunca falla cuando más la necesitas. 🔮",
      ];

      const emojis = { aries:"♈",tauro:"♉",geminis:"♊",cancer:"♋",leo:"♌",virgo:"♍",libra:"♎",escorpio:"♏",sagitario:"♐",capricornio:"♑",acuario:"♒",piscis:"♓" };

      await reply(
        `${emojis[signo]} *Horóscopo de ${signo.charAt(0).toUpperCase() + signo.slice(1)}*\n━━━━━━━━━━━━━━\n\n` +
        `_${predicciones[random(0, predicciones.length - 1)]}_`
      );
    },
  },
];

export default utilCommands;
