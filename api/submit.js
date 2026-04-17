const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('Missing env vars: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return res.status(500).json({ error: 'Server is not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const fio = String(body.fio || '').trim();
  const company = String(body.company || '').trim();
  const position = String(body.position || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const message = String(body.message || '').trim();
  const consent = body.consent === true;

  if (!fio || !company || !position || !email) {
    return res.status(400).json({ error: 'Обязательные поля не заполнены' });
  }
  if (!email.includes('@')) {
    return res.status(400).json({ error: 'Некорректный email' });
  }
  if (!consent) {
    return res.status(400).json({ error: 'Нет согласия на обработку персональных данных' });
  }

  const lines = [
    '🔔 <b>Новая заявка с hrasc-lab.ru</b>',
    '',
    `<b>ФИО:</b> ${escapeHtml(fio)}`,
    `<b>Компания:</b> ${escapeHtml(company)}`,
    `<b>Должность:</b> ${escapeHtml(position)}`,
    `<b>Email:</b> ${escapeHtml(email)}`,
  ];
  if (phone) lines.push(`<b>Телефон:</b> ${escapeHtml(phone)}`);
  if (message) {
    lines.push('');
    lines.push('<b>Сообщение:</b>');
    lines.push(escapeHtml(message));
  }

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!tgRes.ok) {
      const text = await tgRes.text().catch(() => '');
      console.error('Telegram API error', tgRes.status, text);
      return res.status(500).json({ error: 'Telegram API error' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram fetch failed', err);
    return res.status(500).json({ error: 'Upstream error' });
  }
}
