// ═══════════════════════════════════════════
//   RAGE-BOT — src/commands/antiviewonce.js
//     Revela fotos/videos de ver una vez
//              v1.0.0
// ═══════════════════════════════════════════

import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { isOwner, cleanJid } from "../lib/utils.js";

// ── Antiviewonce — se activa en handler ─────
// Grupos con antiviewonce activo
export const antiViewOnceGroups = new Set();

// ── Comando para activar/desactivar ─────────
const antiViewOnceCommands = [
  {
    name: "antiver",
    alias: ["antiviewonce", "antiview"],
    description: "Activa/desactiva el antiviewonce !antiver on/off",
    category: "Grupo ⚙️",
    execute: async ({ from, args, reply, react, isGroupAdmin, isOwner: ownerCheck }) => {
      if (!from.endsWith("@g.us")) return reply("❌ Solo funciona en grupos.");
      if (!isGroupAdmin && !ownerCheck) return reply("❌ Solo administradores del grupo.");

      const sub = (args[0] || "").toLowerCase();
      if (sub === "on" || sub === "activar") {
        antiViewOnceGroups.add(from);
        await react("✅");
        await reply("👁️ *Antiviewonce ACTIVADO* ✅\nAhora revelaré todas las fotos y videos de ver una vez.");
      } else if (sub === "off" || sub === "desactivar") {
        antiViewOnceGroups.delete(from);
        await react("✅");
        await reply("👁️ *Antiviewonce DESACTIVADO* ❌");
      } else {
        const estado = antiViewOnceGroups.has(from) ? "✅ *Activo*" : "❌ *Inactivo*";
        await reply("👁️ *Antiviewonce*\nEstado: " + estado + "\n\nUso: `!antiver on` / `!antiver off`");
      }
    },
  },
];

export default antiViewOnceCommands;
