import { createClient } from "@supabase/supabase-js";
import { isAdminPattern } from "../lib/admin.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "credits")
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        error: /site_settings|does not exist|schema cache/i.test(error.message || "")
          ? "Нужно выполнить SQL-миграцию bilingual_credits.sql в Supabase."
          : error.message
      });
    }

    const value = data?.value || {};
    return res.status(200).json({
      ru: typeof value.ru === "string" ? value.ru : "",
      en: typeof value.en === "string" ? value.en : ""
    });
  }

  if (req.method === "POST") {
    const code = String(req.headers["x-admin-code"] || "");
    if (!await isAdminPattern(code)) {
      return res.status(403).json({ error: "Нет доступа." });
    }

    const ru = String(req.body?.ru || "");
    const en = String(req.body?.en || "");
    if (ru.length > 5000 || en.length > 5000) {
      return res.status(400).json({ error: "Текст слишком длинный (максимум 5000 символов)." });
    }

    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "credits", value: { ru, en }, updated_at: new Date().toISOString() });

    if (error) {
      return res.status(500).json({
        error: /site_settings|does not exist|schema cache/i.test(error.message || "")
          ? "Нужно выполнить SQL-миграцию bilingual_credits.sql в Supabase."
          : error.message
      });
    }

    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
