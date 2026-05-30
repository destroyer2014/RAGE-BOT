// ═══════════════════════════════════════════
//           RAGE-BOT — config.js
//              v2.5.0
// ═══════════════════════════════════════════

const config = {
  botName: "PRAGMATA BOT",
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

  // ── Grupo oficial RPG ──────────────────
  // Pon aquí el link de invitación de tu grupo RPG
  // Si lo dejas vacío (""), el bot NO enviará el aviso automático al registrarse
  rpgGroupLink: "",

  // ── Sistema ────────────────────────────
  waitMessage: "⏳ Procesando...",
  errorMessage: "❌ Ocurrió un error. Inténtalo de nuevo.",
  workInGroups: true,
  workInPrivate: true,
  cooldown: 3,

  // ── APIs externas ──────────────────────
  anthropicApiKey: "TU_API_KEY_AQUI",   // https://console.anthropic.com

  // ── Sticker metadata ───────────────────
  stickerPackname: "PRAGMATA BOT🤖⚡\nhttps://arcadia-inc.com\n\nInfo:\nadquiere el bot: +51 917 611 323",
  stickerAuthor: "Owner:\n\nZemo - ArcadiaCorp",

  // ── Antilink ───────────────────────────
  antilinkDefaultOn: false,

  // ── XP ─────────────────────────────────
  xpPerCommand: 10,
  xpPremiumBonus: 15,
};

export default config;
