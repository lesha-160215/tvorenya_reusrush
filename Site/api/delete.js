import { createClient } from "@supabase/supabase-js";
import { isAdminPattern } from "./_admin.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const code = String(req.headers["x-admin-code"] || "");

    if (!await isAdminPattern(code)) {
      return res.status(403).json({ error: "Нет доступа." });
    }

    const id = String(req.query.id || "");
    if (!id) return res.status(400).json({ error: "Не указан ID." });

    const { data: artwork, error: findError } = await supabase
      .from("artworks")
      .select("image_path")
      .eq("id", id)
      .single();

    if (findError || !artwork) {
      return res.status(404).json({ error: "Работа не найдена." });
    }

    const { error: deleteError } = await supabase
      .from("artworks")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    await supabase.storage.from("artworks").remove([artwork.image_path]);

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Ошибка сервера." });
  }
}