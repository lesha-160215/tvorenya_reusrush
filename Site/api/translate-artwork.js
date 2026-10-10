import { createClient } from "@supabase/supabase-js";
import { isAdminPattern } from "../lib/admin.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function translateOnce(text) {
  if (!text || !String(text).trim()) return "";
  const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(String(text)) + "&langpair=ru|en";
  const response = await fetch(url);
  if (!response.ok) throw new Error("Translation service is temporarily unavailable.");
  const result = await response.json();
  if (result.responseStatus !== 200 || !result.responseData?.translatedText) throw new Error("Could not translate this artwork.");
  return result.responseData.translatedText.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!await isAdminPattern(req.headers["x-admin-code"] || "")) return res.status(403).json({ error: "Access denied." });
  const id = String(req.query.id || "");
  if (!id) return res.status(400).json({ error: "Missing artwork ID." });
  const { data: old, error: findError } = await supabase.from("artworks").select("id,title,title_en,description,description_en").eq("id", id).maybeSingle();
  if (findError) return res.status(500).json({ error: findError.message });
  if (!old) return res.status(404).json({ error: "Artwork not found." });
  try {
    const updates = {};
    if (!old.title_en || old.title_en === old.title) updates.title_en = await translateOnce(old.title);
    if (old.description && (!old.description_en || old.description_en === old.description)) updates.description_en = await translateOnce(old.description);
    if (Object.keys(updates).length) {
      const { data, error } = await supabase.from("artworks").update(updates).eq("id", id).select("id,title,title_en,description,description_en").single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ artwork: data });
    }
    return res.status(200).json({ artwork: old });
  } catch (error) {
    return res.status(502).json({ error: error.message || "Translation failed." });
  }
}
