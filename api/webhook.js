// La Bolita - Telegram Bot Webhook
// Deploy en Vercel - api/webhook.js

const TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL; // tu URL de Vercel

async function sendMessage(chatId, text, extra = {}) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
  });
}

async function sendGame(chatId) {
  // Abre el juego como Mini App
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "🎡 <b>LA BOLITA</b>\n\n¡Toca el botón para jugar!",
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          {
            text: "🎡 JUGAR AHORA",
            web_app: { url: `${APP_URL}/game` }
          }
        ]]
      }
    }),
  });
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text || "";
  const firstName = msg.from?.first_name || "Jugador";

  if (text === "/start") {
    await sendMessage(chatId,
      `🎡 <b>¡Bienvenido a La Bolita, ${firstName}!</b>\n\n` +
      `🎮 El juego más emocionante de RD\n\n` +
      `<b>Comandos:</b>\n` +
      `▶️ /jugar — Abrir el juego\n` +
      `💰 /balance — Ver tu saldo\n` +
      `📋 /historial — Últimas jugadas\n` +
      `📞 /ayuda — Soporte\n\n` +
      `<i>Apuesta mínima: $5 | Pago: ×10</i>`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: "🎡 JUGAR AHORA", web_app: { url: `${APP_URL}/game` } }
          ]]
        }
      }
    );
  }

  else if (text === "/jugar") {
    await sendGame(chatId);
  }

  else if (text === "/balance") {
    // En producción esto viene de tu base de datos
    await sendMessage(chatId,
      `💰 <b>Tu Balance</b>\n\n` +
      `Saldo disponible: <b>$500</b>\n\n` +
      `Para depositar escribe /depositar`
    );
  }

  else if (text === "/historial") {
    await sendMessage(chatId,
      `📋 <b>Últimas Jugadas</b>\n\n` +
      `Ronda #1 — Número 7 — <b>+$50</b> ✅\n` +
      `Ronda #2 — Número 3 — <b>-$15</b> ❌\n` +
      `Ronda #3 — Número 11 — <b>+$100</b> ✅\n\n` +
      `<i>Conecta una base de datos para historial real</i>`
    );
  }

  else if (text === "/depositar") {
    await sendMessage(chatId,
      `💳 <b>Cómo Depositar</b>\n\n` +
      `1️⃣ Envía USDT a esta dirección:\n` +
      `<code>TU_WALLET_AQUI</code>\n\n` +
      `2️⃣ Envía el comprobante a @TU_USUARIO\n\n` +
      `3️⃣ Tu balance se acredita en minutos ⚡\n\n` +
      `<i>Mínimo de depósito: $10</i>`
    );
  }

  else if (text === "/ayuda") {
    await sendMessage(chatId,
      `📞 <b>Soporte</b>\n\n` +
      `¿Tienes algún problema?\n` +
      `Contáctanos: @TU_SOPORTE\n\n` +
      `⏰ Horario: 24/7`
    );
  }

  else {
    await sendMessage(chatId,
      `Escribe /jugar para comenzar 🎡`
    );
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "La Bolita Bot activo ✅" });
  }

  try {
    const { message, callback_query } = req.body;
    if (message) await handleMessage(message);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(200).json({ ok: true });
  }
}
