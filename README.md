# 🤖 RAGE-BOT v2.0 — WhatsApp Bot para Termux

Bot de WhatsApp construido con **Baileys** y **Node.js**, optimizado para correr en **Termux** (Android).

---

## ⚡ Instalación rápida en Termux

```bash
# 1. Instalar dependencias del sistema
pkg update && pkg upgrade -y
pkg install nodejs git ffmpeg python -y
pip install yt-dlp

# 2. Entrar a la carpeta del bot
cd rage-bot

# 3. Instalar dependencias de Node
npm install

# 4. Configurar el bot (edita tu número)
nano config.js

# 5. Iniciar el bot
npm start
```

Escanea el QR con WhatsApp → Dispositivos vinculados → Vincular dispositivo.

---

## ⚙️ Configuración (`config.js`)

| Campo | Descripción |
|-------|-------------|
| `ownerNumber` | Tu número sin + ni espacios (ej: `51917611323`) |
| `prefix` | Prefijo de comandos (default: `!`) |
| `botName` | Nombre del bot |

---

## 📋 Comandos

### 🔧 Generales
| Comando | Descripción |
|---------|-------------|
| `!menu` | Menú completo |
| `!ping` | Latencia |
| `!info` | Info del bot |
| `!uptime` | Tiempo activo |
| `!creador` | Info del creador |

### 🎵 Música
| Comando | Descripción |
|---------|-------------|
| `!play [canción]` | Descarga canción como audio MP3 |
| `!playurl [url]` | Audio desde URL de YouTube |

> ⚠️ Requiere `yt-dlp`: `pip install yt-dlp`

### 🎨 Stickers
| Comando | Descripción |
|---------|-------------|
| `!sticker` | Imagen/video → sticker |
| `!toimg` | Sticker → imagen |
| `!stext [texto]` | Sticker de texto |

> ⚠️ Requiere ffmpeg: `pkg install ffmpeg`

### 📱 Grupo (todos)
| Comando | Descripción |
|---------|-------------|
| `!everyone` | Menciona a todos |
| `!ginfo` | Info del grupo |
| `!id` | ID del chat |

### ⚙️ Grupo Admin (solo admins)
| Comando | Descripción |
|---------|-------------|
| `!ban @usuario` | Expulsar del grupo |
| `!add [número]` | Agregar al grupo |
| `!promote @usuario` | Hacer admin |
| `!demote @usuario` | Quitar admin |
| `!mute` | Silenciar grupo |
| `!unmute` | Abrir grupo |
| `!gtitle [nombre]` | Cambiar nombre del grupo |
| `!gdesc [desc]` | Cambiar descripción |
| `!warn @usuario [motivo]` | Advertir usuario |

> ⚠️ El bot debe ser admin del grupo para estos comandos.

### 👑 Owner/Creador
| Comando | Descripción |
|---------|-------------|
| `!reiniciar` | Reiniciar bot |
| `!broadcast [msg]` | Mensaje a todos los chats |
| `!botinfo` | Info técnica del sistema |
| `!eval [código]` | Ejecutar código JS |
| `!block @usuario` | Bloquear número |
| `!unblock @usuario` | Desbloquear número |
| `!setprefijo [p]` | Cambiar prefijo |
| `!estado [texto]` | Cambiar estado del perfil |
| `!setnombre [nombre]` | Cambiar nombre del perfil |
| `!jid @usuario` | Ver JID de un usuario |

### 🎲 Diversión
`!dado` · `!moneda` · `!8ball` · `!ship` · `!insulto`

---

## 🗂️ Estructura del proyecto

```
rage-bot/
├── index.js              # Punto de entrada
├── config.js             # Configuración
├── package.json
├── assets/               # Recursos estáticos
└── src/
    ├── lib/
    │   ├── handler.js    # Manejador de mensajes
    │   └── utils.js      # Utilidades
    └── commands/
        ├── basicos.js    # Comandos generales + menú
        ├── grupo.js      # Admin de grupos
        ├── musica.js     # Descargar canciones 🆕
        ├── owner.js      # Comandos del creador 🆕
        ├── stickers.js   # Stickers
        └── diversion.js  # Juegos y diversión
```

---

## 🔧 Mantener activo en Termux

```bash
# Instalar termux-services o usar screen/tmux
pkg install tmux
tmux new -s ragebot
npm start
# Ctrl+B, luego D para salir sin cerrar
```

---

Hecho con ❤️ por **51917611323**
