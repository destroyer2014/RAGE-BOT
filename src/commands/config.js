// ═══════════════════════════════════════════
//           RAGE-BOT — config.js
//              v2.5.0
// ═══════════════════════════════════════════

const config = {
  botName: "RAGE-BOT",
  botVersion: "3.0.8",
  prefix: "!",

  // ── Owner principal ────────────────────
  ownerNumber: "51917611323",
  ownerName: "Zemo",

  // ── Sub-creadores ───────────────────────
  // Números normales Y lids — el bot acepta ambos formatos
  subCreators: ["51921909260"],
  subCreatorLids: ["238722939379788"],

  // ── LID de WhatsApp del owner ───────────
  ownerLid: "50148205949148",

  // ── Número del bot ──────────────────────
  botNumber: "51986121294",

  // ── Comunidad ──────────────────────────
  communityLink: "https://whatsapp.com/channel/0029VbADsUx6LwHo4wdirM0v",

  // ── Sistema ────────────────────────────
  waitMessage: "⏳ Procesando...",
  errorMessage: "❌ Ocurrió un error. Inténtalo de nuevo.",
  workInGroups: true,
  workInPrivate: true,
  cooldown: 3,

  // ── Sticker metadata ───────────────────
  stickerPackname: "RAGE-BOT 🔥",
  stickerAuthor: "Zemo & Smith",

  // ── Antilink ───────────────────────────
  antilinkDefaultOn: false,

  // ── XP ─────────────────────────────────
  xpPerCommand: 10,
  xpPremiumBonus: 15,
};

export default config;
