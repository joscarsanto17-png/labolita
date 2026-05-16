# 🎡 La Bolita — Telegram Bot

## Pasos para subir a Vercel

### PASO 1 — Subir el código a GitHub
1. Ve a github.com y crea una cuenta (gratis)
2. Crea un repositorio nuevo llamado `labolita`
3. Sube todos estos archivos

### PASO 2 — Conectar con Vercel
1. Ve a vercel.com (ya tienes cuenta ✅)
2. Toca "Add New Project"
3. Conecta tu GitHub y selecciona el repo `labolita`
4. Toca "Deploy"

### PASO 3 — Agregar las variables de entorno
En Vercel > Tu proyecto > Settings > Environment Variables agrega:

| Variable | Valor |
|---|---|
| BOT_TOKEN | Tu token de BotFather |
| APP_URL | https://labolita.vercel.app |

### PASO 4 — Activar el webhook
Visita esta URL en tu navegador UNA SOLA VEZ:
```
https://TU-APP.vercel.app/api/setup
```
Si ves `✅ Bot configurado correctamente` — ¡listo!

### PASO 5 — Probar el bot
1. Abre Telegram
2. Busca @LaBolitaRD_bot
3. Escribe /start
4. ¡Debe responder!

## Comandos disponibles
- /start — Bienvenida
- /jugar — Abre el juego
- /balance — Ver saldo
- /historial — Últimas jugadas
- /depositar — Info de depósito
- /ayuda — Soporte

## Personalizar
- Cambia `TU_WALLET_AQUI` por tu wallet de USDT
- Cambia `@TU_SOPORTE` por tu usuario de Telegram
- Cambia `@TU_USUARIO` por tu usuario para recibir comprobantes
