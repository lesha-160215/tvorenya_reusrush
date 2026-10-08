import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const config = {
  api: {
    bodyParser: false
  }
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function parseForm(req) {
  const form = formidable({
    multiples: false,
    maxFileSize: 15 * 1024 * 1024,
    keepExtensions: true
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function value(v) {
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fields, files } = await parseForm(req);

    const code = value(fields.code);
    if (!process.env.ADMIN_CODE || code !== process.env.ADMIN_CODE) {
      return res.status(403).json({ error: "Неверный код администратора." });
    }

    const title = value(fields.title).trim();
    const description = value(fields.description).trim();

    const uploaded = files.image;
    const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;

    if (!title || !file) {
      return res.status(400).json({ error: "Нужно указать название и картинку." });
    }

    const ext = path.extname(file.originalFilename || "").toLowerCase();
    const allowed = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

    if (!allowed.has(ext)) {
      await fs.unlink(file.filepath).catch(() => {});
      return res.status(400).json({ error: "Разрешены PNG, JPG, JPEG, WEBP и GIF." });
    }

    const imagePath = `${new Date().getFullYear()}/${crypto.randomUUID()}${ext}`;
    const buffer = await fs.readFile(file.filepath);

    const { error: uploadError } = await supabase.storage
      .from("artworks")
      .upload(imagePath, buffer, {
        contentType: file.mimetype || "application/octet-stream",
        upsert: false
      });

    await fs.unlink(file.filepath).catch(() => {});

    if (uploadError) {
      return res.status(500).json({ error: uploadError.message });
    }

    const { data, error: dbError } = await supabase
      .from("artworks")
      .insert({
        title,
        description,
        image_path: imagePath
      })
      .select("id,title,description,image_path,created_at")
      .single();

    if (dbError) {
      await supabase.storage.from("artworks").remove([imagePath]);
      return res.status(500).json({ error: dbError.message });
    }

    const { data: publicUrl } = supabase.storage
      .from("artworks")
      .getPublicUrl(imagePath);

    return res.status(200).json({
      ok: true,
      artwork: { ...data, image_url: publicUrl.publicUrl }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Ошибка сервера." });
  }
}