import { createClient } from "@supabase/supabase-js";
const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
 const q=String(req.query.q||"").trim();
 let data,error;
 const extended=()=>{let query=supabase.from("artworks").select("id,title,title_en,description,description_en,image_path,created_at").order("created_at",{ascending:true}).order("id",{ascending:true});if(q)query=query.or("title.ilike.%"+q+"%,title_en.ilike.%"+q+"%");return query;};
 ({data,error}=await extended());
 if(error && /title_en|description_en|column/i.test(error.message||"")){
   let query=supabase.from("artworks").select("id,title,description,image_path,created_at").order("created_at",{ascending:true}).order("id",{ascending:true});if(q)query=query.ilike("title","%"+q+"%");({data,error}=await query);
 }
 if(error)return res.status(500).json({error:error.message});
 const voterId=String(req.headers["x-voter-id"]||"");
 const {data:likes}=await supabase.from("artwork_likes").select("artwork_id,voter_id");
 const result=await Promise.all((data||[]).map(async item=>{const {data:pub}=supabase.storage.from("artworks").getPublicUrl(item.image_path);const itemLikes=(likes||[]).filter(l=>String(l.artwork_id)===String(item.id));return {...item,title_en:item.title_en||"",description_en:item.description_en||"",image_url:pub.publicUrl,likes_count:itemLikes.length,liked:itemLikes.some(l=>l.voter_id===voterId)};}));
 return res.status(200).json(result);
}