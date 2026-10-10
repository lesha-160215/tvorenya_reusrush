export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const code = String(req.headers["x-admin-code"] || "");
  if (!process.env.ADMIN_CODE || code !== process.env.ADMIN_CODE) {
    return res.status(403).json({ error: "Неверный код администратора." });
  }

  const text = String(req.body?.text || "").trim();
  const source = String(req.body?.source || "");
  const target = String(req.body?.target || "");
  if (!text) return res.status(400).json({ error: "Сначала введи текст для перевода." });
  if (text.length > 500) return res.status(400).json({ error: "Максимальная длина текста — 500 символов." });
  if (!["ru", "en"].includes(source) || !["ru", "en"].includes(target) || source === target) {
    return res.status(400).json({ error: "Неправильное направление перевода." });
  }

  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", text);
    url.searchParams.set("langpair", `${source}|${target}`);
    const response = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!response.ok) return res.status(502).json({ error: "Сервис перевода временно недоступен." });
    const data = await response.json();
    const translated = String(data?.responseData?.translatedText || "").trim();
    if (!translated || Number(data?.responseStatus) !== 200) {
      return res.status(502).json({ error: "Не удалось перевести текст. Попробуй позже." });
    }
    return res.status(200).json({ translatedText: translated });
  } catch {
    return res.status(502).json({ error: "Не удалось связаться с сервисом перевода." });
  }
}
