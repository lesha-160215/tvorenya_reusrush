export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const code = String(req.body?.code || "");
  if (code === process.env.ADMIN_CODE) return res.status(200).json({ ok: true });
  return res.status(403).json({ ok: false });
}