import { createClient } from "@supabase/supabase-js";import formidable from "formidable";import fs from "fs/promises";import path from "path";import crypto from "crypto";
export const config={api:{bodyParser:false}};
const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
function parseForm(req){const f=formidable({multiples:false,maxFileSize:15*1024*1024,keepExtensions:true});return new Promise((resolve,reject)=>f.parse(req,(e,fields,files)=>e?reject(e):resolve({fields,files})));}
const val=v=>Array.isArray(v)?String(v[0]??""):String(v??"");
export default async function handler(req,res){
 if(req.method!=="PATCH")return res.status(405).json({error:"Method not allowed"});
 if(!process.env.ADMIN_CODE||String(req.headers["x-admin-code"]||"")!==process.env.ADMIN_CODE)return res.status(403).json({error:"Нет доступа."});
 const id=String(req.query.id||"");if(!id)return res.status(400).json({error:"Не указан ID публикации."});
 let temp,newPath;
 try{
  const {fields,files}=await parseForm(req),title=val(fields.title).trim(),title_en=val(fields.title_en).trim(),description=val(fields.description).trim(),description_en=val(fields.description_en).trim();
  if(!title||title.length>120||title_en.length>120||description.length>500||description_en.length>500)return res.status(400).json({error:"Название обязательно (до 120 символов), описания — до 500."});
  const {data:old,error:findErr}=await supabase.from("artworks").select("image_path").eq("id",id).maybeSingle();if(findErr)return res.status(500).json({error:findErr.message});if(!old)return res.status(404).json({error:"Публикация не найдена."});
  let image_path=old.image_path;const raw=files.image,file=Array.isArray(raw)?raw[0]:raw;
  if(file){temp=file.filepath;const ext=path.extname(file.originalFilename||"").toLowerCase();if(!new Set([".png",".jpg",".jpeg",".webp",".gif"]).has(ext))return res.status(400).json({error:"Разрешены PNG, JPG, JPEG, WEBP и GIF."});newPath=new Date().getFullYear()+"/"+crypto.randomUUID()+ext;const buf=await fs.readFile(file.filepath);const {error}=await supabase.storage.from("artworks").upload(newPath,buf,{contentType:file.mimetype||"application/octet-stream",upsert:false});if(error)return res.status(500).json({error:error.message});image_path=newPath;}
  const {data,error}=await supabase.from("artworks").update({title,title_en,description,description_en,image_path}).eq("id",id).select("id,title,title_en,description,description_en,image_path,created_at").maybeSingle();
  if(error||!data){if(newPath)await supabase.storage.from("artworks").remove([newPath]);return res.status(error?500:404).json({error:error?.message||"Публикация не найдена."});}
  if(newPath&&old.image_path)await supabase.storage.from("artworks").remove([old.image_path]);const {data:pub}=supabase.storage.from("artworks").getPublicUrl(data.image_path);return res.status(200).json({ok:true,artwork:{...data,image_url:pub.publicUrl}});
 }catch(e){if(newPath)await supabase.storage.from("artworks").remove([newPath]);return res.status(500).json({error:e.message||"Ошибка сервера."});}finally{if(temp)await fs.unlink(temp).catch(()=>{});}
}