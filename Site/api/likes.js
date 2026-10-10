import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});
const validVoter = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const artworkId = String(req.body?.artworkId || "");
    const voterId = String(req.body?.voterId || "");
    const liked = req.body?.liked === true;
    if (!/^\d+$/.test(artworkId) || !validVoter(voterId)) {
      return res.status(400).json({ error: "Invalid artwork or visitor ID." });
    }

    const { data: artwork, error: artworkError } = await supabase
      .from("artworks").select("id").eq("id", artworkId).maybeSingle();
    if (artworkError) return res.status(500).json({ error: artworkError.message });
    if (!artwork) return res.status(404).json({ error: "Artwork not found." });

    if (liked) {
      const { error } = await supabase.from("artwork_likes")
        .upsert({ artwork_id: Number(artworkId), voter_id: voterId }, { onConflict: "artwork_id,voter_id", ignoreDuplicates: true });
      if (error) return res.status(500).json({ error: error.message });
    } else {
      const { error } = await supabase.from("artwork_likes")
        .delete().eq("artwork_id", Number(artworkId)).eq("voter_id", voterId);
      if (error) return res.status(500).json({ error: error.message });
    }

    const [{ count, error: countError }, { data: ownLike, error: ownError }] = await Promise.all([
      supabase.from("artwork_likes").select("*", { count: "exact", head: true }).eq("artwork_id", Number(artworkId)),
      supabase.from("artwork_likes").select("id").eq("artwork_id", Number(artworkId)).eq("voter_id", voterId).maybeSingle()
    ]);
    if (countError || ownError) return res.status(500).json({ error: countError?.message || ownError?.message });
    return res.status(200).json({ ok: true, count: count || 0, liked: Boolean(ownLike) });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Server error." });
  }
}
