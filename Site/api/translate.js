export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { text, from, to } = req.body || {};
  if (typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "Text is required" });
  if (!(["ru", "en"].includes(from) && ["ru", "en"].includes(to) && from !== to)) return res.status(400).json({ error: "Unsupported language pair" });
  if (text.length > 5000) return res.status(413).json({ error: "Text is too long" });
  try {
    const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=" + from + "|" + to;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Translation service unavailable");
    const data = await response.json();
    if (data.responseStatus !== 200 || !data.responseData?.translatedText) throw new Error(data.responseDetails || "No translation returned");
    return res.status(200).json({ translation: data.responseData.translatedText });
  } catch (error) {
    return res.status(502).json({ error: error.message || "Translation failed" });
  }
}
