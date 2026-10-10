import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { isAdminPattern } from "../lib/admin.js";

export const config = { api: { bodyParser: false } };
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const val = v => Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
function parseForm(req) {
 const form = formidable({ multiples: false, maxFileSize: 15 * 1024 * 1024, keepExtensions: true });
 return new Promise((resolve, reject) => form.parse(req, (err, fields, files) => err ? reject(err) : resolve({ fields, files })));
}
async function translateOnce(text, from, to) {
 if (!text || !String(text).trim()) return "";
 const response = await fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(String(text)) + "&langpair=" + from + "|" + to);
 if (!response.ok) throw new Error("Automatic translation is temporarily unavailable.");
 const result = await response.json();
 if (result.responseStatus !== 200 || !result.responseData?.translatedText) throw new Error("Could not translate this submission.");
 return result.responseData.translatedText.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
}
export default async function handler(req, res) {
 res.setHeader("Cache-Control", "no-store");
 if (req.method === "POST") {
  let temp;
  try {
   const { fields, files } = await parseForm(req);
   const title = val(fields.title).trim(), description = val(fields.description).trim();
   const raw = files.image, file = Array.isArray(raw) ? raw[0] : raw;
   if (!title || title.length > 120 || description.length > 500 || !file) return res.status(400).json({error:"Укажи название (до 120 символов), описание (до 500) и картинку."});
   temp = file.filepath;
   const ext = path.extname(file.originalFilename || "").toLowerCase();
   if (!new Set([".png",".jpg",".jpeg",".webp",".gif"]).has(ext)) return res.status(400).json({error:"Разрешены PNG, JPG, JPEG, WEBP и GIF."});
   const image_path = "submissions/" + crypto.randomUUID() + ext;
   const buffer = await fs.readFile(file.filepath);
   const { error: uploadError } = await supabase.storage.from("artworks").upload(image_path, buffer, {contentType:file.mimetype || "application/octet-stream", upsert:false});
   if (uploadError) return res.status(500).json({error:uploadError.message});
   const { data, error } = await supabase.from("artwork_tickets").insert({title,description,image_path}).select("id").single();
   if (error) { await supabase.storage.from("artworks").remove([image_path]); return res.status(500).json({error:/artwork_tickets|does not exist|schema cache/i.test(error.message || "") ? "Сначала выполни SQL-файл tickets.sql в Supabase." : error.message}); }
   return res.status(200).json({ok:true,id:data.id});
  } catch(e) { return res.status(500).json({error:e.message || "Ошибка сервера."}); }
  finally { if(temp) await fs.unlink(temp).catch(()=>{}); }
 }
 const code = String(req.headers["x-admin-code"] || "");
 if (!await isAdminPattern(code)) return res.status(403).json({error:"Нет доступа."});
 if (req.method === "GET") {
  const {data,error}=await supabase.from("artwork_tickets").select("*").eq("status","pending").order("created_at",{ascending:true});
  if(error)return res.status(500).json({error:error.message});
  return res.status(200).json((data||[]).map(ticket=>({...ticket,image_url:supabase.storage.from("artworks").getPublicUrl(ticket.image_path).data.publicUrl})));
 }
 if (req.method === "PATCH") {
  try {
   const id=String(req.body?.id || ""), action=String(req.body?.action || "");
   if(!id || !["approve","reject"].includes(action))return res.status(400).json({error:"Некорректный запрос."});
   const {data:ticket,error:findError}=await supabase.from("artwork_tickets").select("*").eq("id",id).eq("status","pending").maybeSingle();
   if(findError)return res.status(500).json({error:findError.message});
   if(!ticket)return res.status(404).json({error:"Заявка уже обработана или не найдена."});
   if(action==="reject"){
    const {error}=await supabase.from("artwork_tickets").update({status:"rejected",reviewed_at:new Date().toISOString()}).eq("id",id).eq("status","pending");
    if(error)return res.status(500).json({error:error.message});
    await supabase.storage.from("artworks").remove([ticket.image_path]);
    return res.status(200).json({ok:true});
   }
   const title_en=await translateOnce(ticket.title,"ru","en");
   const description_en=ticket.description ? await translateOnce(ticket.description,"ru","en") : "";
   const {data:art,error:insertError}=await supabase.from("artworks").insert({title:ticket.title,title_en,description:ticket.description,description_en,image_path:ticket.image_path}).select("id").single();
   if(insertError)return res.status(500).json({error:insertError.message});
   const {error:updateError}=await supabase.from("artwork_tickets").update({status:"approved",reviewed_at:new Date().toISOString(),artwork_id:art.id}).eq("id",id).eq("status","pending");
   if(updateError){await supabase.from("artworks").delete().eq("id",art.id);return res.status(500).json({error:updateError.message});}
   return res.status(200).json({ok:true,artworkId:art.id});
  } catch(e){return res.status(500).json({error:e.message || "Ошибка сервера."});}
 }
 res.setHeader("Allow","GET, POST, PATCH"); return res.status(405).json({error:"Method not allowed"});
}