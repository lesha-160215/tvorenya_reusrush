
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const code = String(req.headers["x-admin-code"] || "");

  if (!process.env.ADMIN_CODE || code !== process.env.ADMIN_CODE) {
    return res.status(403).json({ error: "Нет доступа." });
  }

  const id = String(req.query.id || "");
  const title = String(req.body?.title || "").trim();
  const description = String(req.body?.description || "").trim();

  if (!id) {
    return res.status(400).json({ error: "Не указан ID публикации." });
  }

  if (!title || title.length > 120 || description.length > 500) {
    return res.status(400).json({
      error: "Название обязательно (до 120 символов), описание — до 500."
    });
  }

  try {
    const { data, error } = await supabase
      .from("artworks")
      .update({ title, description })
      .eq("id", id)
      .select("id,title,description,image_path,created_at")
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Публикация не найдена." });
    }

    return res.status(200).json({ ok: true, artwork: data });
  } catch {
    return res.status(500).json({ error: "Ошибка сервера." });
  }
}
