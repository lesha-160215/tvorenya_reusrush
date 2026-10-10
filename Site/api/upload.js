import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";import fs from "fs/promises";import path from "path";import crypto from "crypto";
export const config={api:{bodyParser:false}};
const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
function parseForm(req){const form=formidable({multiples:false,maxFileSize:15*1024*1024,keepExtensions:true});return new Promise((resolve,reject)=>form.parse(req,(err,fields,files)=>err?reject(err):resolve({fields,files})));}
const val=v=>Array.isArray(v)?String(v[0]??""):String(v??"");
export default async function handler(req,res){
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 let temp;
 try{
  const {fields,files}=await parseForm(req),code=val(fields.code);
  if(!process.env.ADMIN_CODE||code!==process.env.ADMIN_CODE)return res.status(403).json({error:"Неверный код администратора."});
  const title=val(fields.title).trim(),title_en=val(fields.title_en).trim(),description=val(fields.description).trim(),description_en=val(fields.description_en).trim();
  const raw=files.image,file=Array.isArray(raw)?raw[0]:raw;if(!title||!file)return res.status(400).json({error:"Нужно указать русское название и картинку."});
  temp=file.filepath;const ext=path.extname(file.originalFilename||"").toLowerCase();if(!new Set([".png",".jpg",".jpeg",".webp",".gif"]).has(ext))return res.status(400).json({error:"Разрешены PNG, JPG, JPEG, WEBP и GIF."});
  const image_path=new Date().getFullYear()+"/"+crypto.randomUUID()+ext,buffer=await fs.readFile(file.filepath);
  const {error:upErr}=await supabase.storage.from("artworks").upload(image_path,buffer,{contentType:file.mimetype||"application/octet-stream",upsert:false});if(upErr)return res.status(500).json({error:upErr.message});
  const {data,error}=await supabase.from("artworks").insert({title,title_en,description,description_en,image_path}).select("id,title,title_en,description,description_en,image_path,created_at").single();
  if(error){await supabase.storage.from("artworks").remove([image_path]);return res.status(500).json({error:/title_en|description_en|column/i.test(error.message||"")?"Сначала выполни SQL-миграцию bilingual_credits.sql в Supabase.":error.message});}
  const {data:pub}=supabase.storage.from("artworks").getPublicUrl(image_path);return res.status(200).json({ok:true,artwork:{...data,image_url:pub.publicUrl}});
 }catch(e){return res.status(500).json({error:e.message||"Ошибка сервера."});}finally{if(temp)await fs.unlink(temp).catch(()=>{});}
}