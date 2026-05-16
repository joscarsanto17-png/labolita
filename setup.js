// api/setup.js - Corre esto UNA VEZ para registrar el webhook
// Visita: https://TU-APP.vercel.app/api/setup

const TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL;

export default async function handler(req, res) {
  try {
    // Registrar webhook
    const response = await fetch(
      `https://api.telegram.org/bot${TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `${APP_URL}/api/webhook`,
          allowed_updates: ["message", "callback_query"],
        }),
      }
    );
    const data = await response.json();

    // Configurar comandos del bot
    await fetch(`https://api.telegram.org/bot${TOKEN}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "jugar", description: "🎡 Abrir el juego" },
          { command: "balance", description: "💰 Ver tu saldo" },
          { command: "historial", description: "📋 Últimas jugadas" },
          { command: "depositar", description: "💳 Depositar saldo" },
          { command: "ayuda", description: "📞 Soporte" },
        ],
      }),
    });

    res.status(200).json({
      ok: true,
      message: "✅ Bot configurado correctamente",
      webhook: data,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
