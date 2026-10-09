
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const q = String(req.query.q || "").trim();

  let query = supabase
    .from("artworks")
    .select("id,title,description,image_path,created_at")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({
      error: error.message
    });
  }

  const result = (data || []).map(item => {
    const { data: publicUrl } = supabase.storage
      .from("artworks")
      .getPublicUrl(item.image_path);

    return {
      ...item,
      image_url: publicUrl.publicUrl
    };
  });

  return res.status(200).json(result);
}
