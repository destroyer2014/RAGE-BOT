// ═══════════════════════════════════════════
//     PRAGMATA BOT — src/commands/grupos.js
//        Bienvenida y Antilink
// ═══════════════════════════════════════════

import { getGroupConfig, setGroupConfig } from "../lib/database.js";

const gruposCommands = [

  // ────────────────────────────────────────
  // !welcome on/off — Mensaje de bienvenida
  // ────────────────────────────────────────
  {
    name: "welcome",
    alias: ["bienvenida", "welcome"],
    description: "Activa/desactiva bienvenida automática en el grupo",
    category: "Grupos",
    adminOnly: true,
    execute: async ({ reply, from, args }) => {
      const sub = (args[0] || "").toLowerCase();
      if (!["on", "off"].includes(sub)) return reply("⚙️ Uso: *!welcome on* o *!welcome off*");
      const active = sub === "on";
      setGroupConfig(from, "welcome", active);
      await reply(active
        ? "✅ *Bienvenida activada*\nAhora saludaré a los nuevos miembros automáticamente 👋"
        : "❌ *Bienvenida desactivada*"
      );
    },
  },

  // ────────────────────────────────────────
  // !antilink on/off — Anti-enlaces
  // ────────────────────────────────────────
  {
    name: "antilink",
    alias: ["antienlace", "nolinks"],
    description: "Activa/desactiva eliminación de links y expulsión",
    category: "Grupos",
    adminOnly: true,
    execute: async ({ reply, from, args }) => {
      const sub = (args[0] || "").toLowerCase();
      if (!["on", "off"].includes(sub)) return reply("⚙️ Uso: *!antilink on* o *!antilink off*");
      const active = sub === "on";
      setGroupConfig(from, "antilink", active);
      await reply(active
        ? "🔒 *Antilink activado*\nEliminaré links y expulsaré al que los mande (excepto admins) 🚫"
        : "🔓 *Antilink desactivado*"
      );
    },
  },

];

export default gruposCommands;
