import { isAdminPattern, setAdminPattern, validPattern } from "./_admin.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const current = String(req.headers["x-admin-code"] || "");
  const next = String(req.body?.pattern ?? "");
  if (!validPattern(next)) return res.status(400).json({ error: "Pattern must connect 4 to 9 different dots." });
  const result = await setAdminPattern(current, next);
  if (!result.ok) return res.status(result.status).json({ error: result.error || "Access denied." });
  return res.status(200).json({ ok: true });
}
