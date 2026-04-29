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

  const name = String(body.name || '').trim();
  const company = String(body.company || '').trim();
  const contactType = body.contact_type === 'telegram' ? 'telegram' : 'phone';
  const contact = String(body.contact || '').trim();

  if (!name || !company || !contact) {
    return res.status(400).json({ error: 'Обязательные поля не заполнены' });
  }

  const contactLabel = contactType === 'telegram' ? 'Telegram' : 'Телефон';

  const text = [
    '📝 <b>Новая заявка с hrasc-lab.ru</b>',
    '',
    `<b>ФИО:</b> ${escapeHtml(name)}`,
    `<b>Компания:</b> ${escapeHtml(company)}`,
    `<b>Контакт (${contactLabel}):</b> ${escapeHtml(contact)}`,
  ].join('\n');

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!tgRes.ok) {
      const upstream = await tgRes.text().catch(() => '');
      console.error('Telegram API error', tgRes.status, upstream);
      return res.status(500).json({ error: 'Telegram API error' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram fetch failed', err);
    return res.status(500).json({ error: 'Upstream error' });
  }
}
