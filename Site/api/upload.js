import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";import fs from "fs/promises";import path from "path";import crypto from "crypto";import { isAdminPattern } from "./_admin.js";
export const config={api:{bodyParser:false}};
const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
function parseForm(req){const form=formidable({multiples:false,maxFileSize:15*1024*1024,keepExtensions:true});return new Promise((resolve,reject)=>form.parse(req,(err,fields,files)=>err?reject(err):resolve({fields,files})));}
const val=v=>Array.isArray(v)?String(v[0]??""):String(v??"");

async function translateOnce(text, from, to) {
 if (!text || !String(text).trim()) return "";
 const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(String(text)) + "&langpair=" + from + "|" + to;
 const response = await fetch(url);
 if (!response.ok) throw new Error("Сервис автоматического перевода временно недоступен. Попробуй сохранить публикацию ещё раз.");
 const result = await response.json();
 if (result.responseStatus !== 200 || !result.responseData?.translatedText) throw new Error("Не удалось автоматически перевести публикацию. Попробуй ещё раз.");
 return result.responseData.translatedText.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
}
export default async function handler(req,res){
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 let temp;
 try{
  const {fields,files}=await parseForm(req),code=val(fields.code);
  if(!await isAdminPattern(code))return res.status(403).json({error:"Неверный графический пароль."});
  const title=val(fields.title).trim(),description=val(fields.description).trim();let title_en=val(fields.title_en).trim(),description_en=val(fields.description_en).trim();
  // Translate once on creation; saved English text is stored in Supabase and is never regenerated automatically.
  if(!title_en) title_en=await translateOnce(title,"ru","en");
  if(!description_en && description) description_en=await translateOnce(description,"ru","en");
  const raw=files.image,file=Array.isArray(raw)?raw[0]:raw;if(!title||!file)return res.status(400).json({error:"Нужно указать русское название и картинку."});
  temp=file.filepath;const ext=path.extname(file.originalFilename||"").toLowerCase();if(!new Set([".png",".jpg",".jpeg",".webp",".gif"]).has(ext))return res.status(400).json({error:"Разрешены PNG, JPG, JPEG, WEBP и GIF."});
  const image_path=new Date().getFullYear()+"/"+crypto.randomUUID()+ext,buffer=await fs.readFile(file.filepath);
  const {error:upErr}=await supabase.storage.from("artworks").upload(image_path,buffer,{contentType:file.mimetype||"application/octet-stream",upsert:false});if(upErr)return res.status(500).json({error:upErr.message});
  const {data,error}=await supabase.from("artworks").insert({title,title_en,description,description_en,image_path}).select("id,title,title_en,description,description_en,image_path,created_at").single();
  if(error){await supabase.storage.from("artworks").remove([image_path]);return res.status(500).json({error:/title_en|description_en|column/i.test(error.message||"")?"Сначала выполни SQL-миграцию bilingual_credits.sql в Supabase.":error.message});}
  const {data:pub}=supabase.storage.from("artworks").getPublicUrl(image_path);return res.status(200).json({ok:true,artwork:{...data,image_url:pub.publicUrl}});
 }catch(e){return res.status(500).json({error:e.message||"Ошибка сервера."});}finally{if(temp)await fs.unlink(temp).catch(()=>{});}
}