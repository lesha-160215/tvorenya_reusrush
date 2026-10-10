import { createClient } from "@supabase/supabase-js";import formidable from "formidable";import fs from "fs/promises";import path from "path";import crypto from "crypto";import { isAdminPattern } from "./_admin.js";
export const config={api:{bodyParser:false}};
const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
function parseForm(req){const f=formidable({multiples:false,maxFileSize:15*1024*1024,keepExtensions:true});return new Promise((resolve,reject)=>f.parse(req,(e,fields,files)=>e?reject(e):resolve({fields,files})));}
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
 if(req.method!=="PATCH")return res.status(405).json({error:"Method not allowed"});
 if(!await isAdminPattern(req.headers["x-admin-code"]||""))return res.status(403).json({error:"Нет доступа."});
 const id=String(req.query.id||"");if(!id)return res.status(400).json({error:"Не указан ID публикации."});
 let temp,newPath;
 try{
  const {fields,files}=await parseForm(req),title=val(fields.title).trim(),description=val(fields.description).trim();let title_en=val(fields.title_en).trim(),description_en=val(fields.description_en).trim();
  if(!title||title.length>120||title_en.length>120||description.length>500||description_en.length>500)return res.status(400).json({error:"Название обязательно (до 120 символов), описания — до 500."});
  const {data:old,error:findErr}=await supabase.from("artworks").select("image_path,title_en,description_en").eq("id",id).maybeSingle();if(findErr)return res.status(500).json({error:findErr.message});if(!old)return res.status(404).json({error:"Публикация не найдена."});
  // Keep an existing translation unless the admin explicitly supplied an edited English version.
  if(!title_en) title_en=old.title_en || await translateOnce(title,"ru","en");
  if(!description_en && description) description_en=old.description_en || await translateOnce(description,"ru","en");
  let image_path=old.image_path;const raw=files.image,file=Array.isArray(raw)?raw[0]:raw;
  if(file && Number(file.size)>0 && file.originalFilename){temp=file.filepath;const ext=path.extname(file.originalFilename||"").toLowerCase();if(!new Set([".png",".jpg",".jpeg",".webp",".gif"]).has(ext))return res.status(400).json({error:"Разрешены PNG, JPG, JPEG, WEBP и GIF."});newPath=new Date().getFullYear()+"/"+crypto.randomUUID()+ext;const buf=await fs.readFile(file.filepath);const {error}=await supabase.storage.from("artworks").upload(newPath,buf,{contentType:file.mimetype||"application/octet-stream",upsert:false});if(error)return res.status(500).json({error:error.message});image_path=newPath;}
  const {data,error}=await supabase.from("artworks").update({title,title_en,description,description_en,image_path}).eq("id",id).select("id,title,title_en,description,description_en,image_path,created_at").maybeSingle();
  if(error||!data){if(newPath)await supabase.storage.from("artworks").remove([newPath]);return res.status(error?500:404).json({error:error?.message||"Публикация не найдена."});}
  if(newPath&&old.image_path)await supabase.storage.from("artworks").remove([old.image_path]);const {data:pub}=supabase.storage.from("artworks").getPublicUrl(data.image_path);return res.status(200).json({ok:true,artwork:{...data,image_url:pub.publicUrl}});
 }catch(e){if(newPath)await supabase.storage.from("artworks").remove([newPath]);return res.status(500).json({error:e.message||"Ошибка сервера."});}finally{if(temp)await fs.unlink(temp).catch(()=>{});}
}
