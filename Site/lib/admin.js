import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
export function normalizePattern(value) {
  const text = String(value ?? "");
  return text === "__EMPTY_PATTERN__" ? "" : text;
}
export function validPattern(value) {
  const pattern = normalizePattern(value);
  if (!pattern) return true;
  const points = pattern.split("-");
  return points.length >= 4 && points.length <= 9 && points.every(p => /^[0-8]$/.test(p)) && new Set(points).size === points.length;
}
const hashPattern = value => crypto.createHash("sha256").update(normalizePattern(value)).digest("hex");
async function getPatternHash() {
  const { data, error } = await supabase.from("site_settings").select("value").eq("key", "admin_pattern").maybeSingle();
  if (error) throw error;
  return typeof data?.value?.hash === "string" ? data.value.hash : "";
}
export async function isAdminPattern(value) {
  try {
    const savedHash = await getPatternHash();
    const candidate = normalizePattern(value);
    if (!savedHash) return candidate === "";
    const candidateHash = Buffer.from(hashPattern(candidate), "hex");
    const expectedHash = Buffer.from(savedHash, "hex");
    return candidateHash.length === expectedHash.length && crypto.timingSafeEqual(candidateHash, expectedHash);
  } catch {
    return false;
  }
}
export async function setAdminPattern(current, next) {
  if (!await isAdminPattern(current)) return { ok: false, status: 403 };
  if (!validPattern(next)) return { ok: false, status: 400, error: "A pattern must connect 4 to 9 different dots." };
  const pattern = normalizePattern(next);
  const { error } = await supabase.from("site_settings").upsert({
    key: "admin_pattern",
    value: { hash: pattern ? hashPattern(pattern) : "" },
    updated_at: new Date().toISOString()
  });
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true };
}
