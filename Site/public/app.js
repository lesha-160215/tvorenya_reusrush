const $ = id => document.getElementById(id);
const gallery=$("gallery"),empty=$("empty"),search=$("search"),clearSearch=$("clearSearch"),searchInfo=$("searchInfo"),template=$("artTemplate"),loader=$("loader"),modal=$("adminModal");
let lang=location.pathname.toLowerCase().startsWith("/english")?"en":"ru";
let adminCode=sessionStorage.getItem("adminCode")||"",timer,credits={ru:"",en:""};
const W={
ru:{search:"Поиск по названию...",credits:"Создано",admin:"Администрирование",hint:"Введи код, чтобы открыть управление работами.",code:"Код администратора",login:"Войти",wrong:"Неверный код.",checking:"Проверяю…",logout:"Выйти",newWork:"Новая работа",title:"Название",desc:"Описание",titlePh:"Название работы",descPh:"Описание работы",choose:"Выбрать картинку",publish:"Выложить",uploading:"Выкладываю…",published:"Работа опубликована ✓",manage:"Опубликованные работы",edit:"✎ Редактировать",remove:"🗑 Удалить",save:"Сохранить",cancel:"Отмена",saving:"Сохраняю…",confirm:"Точно удалить эту публикацию?",emptyTitle:"Ничего не найдено",emptyText:"Попробуй другое название.",loadError:"Не удалось загрузить работы.",found:"Найдено",editCredits:"Изменить кредиты",creditsSaved:"Кредиты сохранены ✓",language:"English",noCredits:"Кредиты пока не заполнены.",replace:"Заменить картинку (необязательно)",listError:"Не удалось загрузить список публикаций.",connection:"Ошибка соединения.",failed:"Не удалось сохранить.",patternHint:"Проведи линию по точкам. Можно оставить пустым.",done:"Готово",patternWrong:"Неверный графический пароль.",patternButton:"Изменить графический пароль",patternEditorHint:"Нарисуй узор из 4–9 точек. Если оставить пустым, пароль будет удалён.",patternSaved:"Графический пароль сохранён."},
en:{search:"Search by title...",credits:"Credits",admin:"Administration",hint:"Enter the code to manage artworks.",code:"Admin code",login:"Log in",wrong:"Incorrect code.",checking:"Checking…",logout:"Log out",newWork:"New artwork",title:"Title",desc:"Description",titlePh:"Artwork title",descPh:"Artwork description",choose:"Choose image",publish:"Publish",uploading:"Publishing…",published:"Artwork published ✓",manage:"Published artworks",edit:"✎ Edit",remove:"🗑 Delete",save:"Save",cancel:"Cancel",saving:"Saving…",confirm:"Delete this artwork?",emptyTitle:"Nothing found",emptyText:"Try another title.",loadError:"Could not load artworks.",found:"Found",editCredits:"Edit credits",creditsSaved:"Credits saved ✓",language:"Русский",noCredits:"Credits have not been added yet.",replace:"Replace image (optional)",listError:"Could not load publications.",connection:"Connection error.",failed:"Could not save.",patternHint:"Draw a pattern by connecting dots. You can leave it empty.",done:"Done",patternWrong:"Incorrect pattern.",patternButton:"Change pattern password",patternEditorHint:"Draw a pattern using 4–9 dots. Leave it empty to remove the password.",patternSaved:"Pattern password saved."}
};
const t=k=>W[lang][k]||W.ru[k]||k, titleOf=a=>lang==="en"?(a.title_en||a.title||""):(a.title||""), descOf=a=>lang==="en"?(a.description_en||a.description||""):(a.description||"");
function createPatternPad(container){
 const points=[];let drawing=false;
 container.innerHTML='<svg class="pattern-lines" viewBox="0 0 300 300" aria-hidden="true"></svg>'+Array.from({length:9},(_,i)=>'<div class="pattern-dot-cell"><span class="pattern-dot" data-point="'+i+'"></span></div>').join('');
 const svg=container.querySelector("svg");
 function reset(){points.length=0;drawing=false;container.querySelectorAll(".pattern-dot").forEach(d=>d.classList.remove("active"));svg.innerHTML="";}
 function addPoint(index){
  if(index<0||points.includes(index))return;
  points.push(index);container.querySelector('[data-point="'+index+'"]').classList.add("active");
  if(points.length>1){const a=points[points.length-2],b=index,line=document.createElementNS("http://www.w3.org/2000/svg","line");line.setAttribute("x1",String((a%3)*100+50));line.setAttribute("y1",String(Math.floor(a/3)*100+50));line.setAttribute("x2",String((b%3)*100+50));line.setAttribute("y2",String(Math.floor(b/3)*100+50));svg.appendChild(line);}
 }
 function nearest(e){
  const r=container.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let best=-1,dist=Infinity;
  for(let i=0;i<9;i++){const px=(i%3+.5)*r.width/3,py=(Math.floor(i/3)+.5)*r.height/3,d=Math.hypot(x-px,y-py);if(d<dist){dist=d;best=i;}}
  return dist<Math.min(r.width,r.height)*.14?best:-1;
 }
 container.addEventListener("pointerdown",e=>{e.preventDefault();reset();drawing=true;try{container.setPointerCapture(e.pointerId);}catch{}addPoint(nearest(e));});
 container.addEventListener("pointermove",e=>{if(!drawing)return;e.preventDefault();addPoint(nearest(e));});
 const finish=()=>{drawing=false;};
 container.addEventListener("pointerup",finish);container.addEventListener("pointercancel",finish);
 return {getPattern:()=>points.join("-"),reset};
}
const loginPatternPad=createPatternPad($("loginPattern"));
const adminPatternPad=createPatternPad($("adminPattern"));

function switchLanguage(){location.href=(lang==="ru"?"/English":"/Russian")+location.search+location.hash;}
function applyText(){
 document.documentElement.lang=lang;
 $("languageBtn").textContent=t("language");
 $("creditsBtn").textContent=t("credits");
 $("creditsHeading").textContent=t("credits");
 $("editCreditsBtn").textContent=t("editCredits");
 $("saveCredits").textContent=t("save");
 $("creditsRuLabel").childNodes[0].textContent=lang==="en"?"Text in Russian":"Текст на русском";
 $("creditsEnLabel").childNodes[0].textContent=lang==="en"?"Text in English":"Текст на английском";
 search.placeholder=t("search");
 $("emptyTitle").textContent=t("emptyTitle");
 $("emptyText").textContent=t("emptyText");
 $("loginView").querySelector("h1").textContent=t("admin");
 $("loginView").querySelector(".muted").textContent=t("hint");
 $("loginPatternHint").textContent=t("patternHint");
 $("loginDone").textContent=t("done");
 $("patternSettingsBtn").textContent=t("patternButton");
 $("patternEditorHint").textContent=t("patternEditorHint");
 $("savePattern").textContent=t("done");
 $("loginForm").querySelector('button[type="submit"]').textContent=t("done");
 $("adminView").querySelector(".admin-title h1").textContent=t("newWork");
 $("logoutBtn").textContent=t("logout");
 $("uploadForm").querySelector(".publish").textContent=t("publish");
 document.querySelector(".manage-heading").textContent=t("manage");
 uploadForm.elements.title.placeholder=t("titlePh");
 uploadForm.elements.title_en.placeholder="Artwork title";
 uploadForm.elements.description.placeholder=t("descPh");
 uploadForm.elements.description_en.placeholder="Artwork description";
 uploadForm.querySelectorAll("[data-lang-field]").forEach(field=>{field.hidden=(field.dataset.lang!==lang);});
 $("fileName").textContent=imageInput.files[0]?.name||t("choose");
 document.querySelectorAll("[data-field-language]").forEach(el=>{
   const wrap=el.closest(".language-input");
   const ru=wrap?.querySelector('[data-lang-field][data-lang="ru"]');
   const en=wrap?.querySelector('[data-lang-field][data-lang="en"]');
   const showEnglish=lang==="en";
   if(ru) ru.hidden=showEnglish;
   if(en) en.hidden=!showEnglish;
   el.textContent=showEnglish?"EN":"RU";
 });
}

async function loadArtworks(q=""){
 try{
  const r=await fetch("/api/artworks",{cache:"no-store"});if(!r.ok)throw Error();let arts=await r.json();
  if(q){const n=q.toLocaleLowerCase();arts=arts.filter(a=>[a.title,a.title_en,a.description,a.description_en].some(v=>String(v||"").toLocaleLowerCase().includes(n)));}
  gallery.innerHTML="";empty.classList.toggle("hidden",arts.length>0);
  if(q){searchInfo.textContent=t("found")+": "+arts.length+" — «"+q+"»";searchInfo.classList.remove("hidden");}else searchInfo.classList.add("hidden");
  arts.forEach((a,i)=>{const node=template.content.cloneNode(true),card=node.querySelector(".art-card"),img=node.querySelector("img"),h=node.querySelector("h2"),p=node.querySelector("p");img.src=a.image_url;img.alt=titleOf(a);h.textContent=titleOf(a);const d=descOf(a);if(d)p.textContent=d;else p.remove();card.style.animationDelay=Math.min(i*.055,.6)+"s";if(adminCode){const b=document.createElement("button");b.type="button";b.className="art-edit-button";b.textContent="✎";b.title=t("edit");b.addEventListener("click",openAdmin);card.appendChild(b);}gallery.appendChild(node);});
 }catch{$("emptyTitle").textContent=t("loadError");$("emptyText").textContent="";empty.classList.remove("hidden");}
}
function openAdmin(){modal.classList.remove("hidden");if(adminCode)showAdmin();else{$("loginView").classList.remove("hidden");$("adminView").classList.add("hidden");$("loginDone").focus();}}
function closeAdmin(){modal.classList.add("hidden");}
function showAdmin(){$("loginView").classList.add("hidden");$("adminView").classList.remove("hidden");$("loginError").textContent="";loadManageList();}
function expireAdmin(){adminCode="";sessionStorage.removeItem("adminCode");closeAdmin();loadArtworks(search.value.trim());}
$("adminBtn").addEventListener("click",openAdmin);$("closeModal").addEventListener("click",closeAdmin);
$("patternSettingsBtn").addEventListener("click",()=>{$("patternEditor").classList.toggle("hidden");adminPatternPad.reset();$("patternStatus").textContent="";});
$("savePattern").addEventListener("click",async()=>{const button=$("savePattern"),status=$("patternStatus"),pattern=adminPatternPad.getPattern();button.disabled=true;status.textContent=t("saving");try{const r=await fetch("/api/pattern",{method:"POST",headers:{"Content-Type":"application/json","x-admin-code":adminCode},body:JSON.stringify({pattern})}),j=await r.json().catch(()=>({}));if(r.status===403){expireAdmin();return;}if(!r.ok){status.textContent=j.error||t("failed");return;}adminCode=pattern||"__EMPTY_PATTERN__";sessionStorage.setItem("adminCode",adminCode);status.textContent=t("patternSaved");adminPatternPad.reset();}catch{status.textContent=t("connection");}finally{button.disabled=false;}});

modal.addEventListener("click",e=>{if(e.target===modal)closeAdmin();});$("languageBtn").addEventListener("click",switchLanguage);
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeAdmin();$("creditsModal").classList.add("hidden");}});
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();const code=loginPatternPad.getPattern();$("loginDone").disabled=true;$("loginError").textContent=t("checking");try{const r=await fetch("/api/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});if(!r.ok){$("loginError").textContent=t("wrong");loginPatternPad.reset();return;}adminCode=code||"__EMPTY_PATTERN__";sessionStorage.setItem("adminCode",adminCode);showAdmin();loadArtworks(search.value.trim());loadCredits();}catch{$("loginError").textContent=t("connection");}finally{$("loginDone").disabled=false;}});
$("logoutBtn").addEventListener("click",()=>{adminCode="";sessionStorage.removeItem("adminCode");closeAdmin();loadArtworks(search.value.trim());});
const uploadForm=$("uploadForm"),imageInput=$("imageInput"),fileName=$("fileName"),uploadStatus=$("uploadStatus"),manageList=$("manageList");
imageInput.addEventListener("change",()=>fileName.textContent=imageInput.files[0]?.name||t("choose"));

uploadForm.addEventListener("submit",async e=>{e.preventDefault();if(!adminCode)return;uploadStatus.textContent=t("uploading");const fd=new FormData(uploadForm);fd.append("code",adminCode);try{const r=await fetch("/api/upload",{method:"POST",body:fd}),j=await r.json().catch(()=>({}));if(r.status===403){expireAdmin();return;}if(!r.ok){uploadStatus.textContent=j.error||t("failed");return;}uploadForm.reset();fileName.textContent=t("choose");uploadForm.querySelectorAll("[data-lang-field]").forEach(field=>{field.hidden=(field.dataset.lang!==lang);});uploadStatus.textContent=t("published");await loadArtworks(search.value.trim());await loadManageList();}catch{uploadStatus.textContent=t("connection");}});
async function loadManageList(){if(!adminCode)return;try{const r=await fetch("/api/artworks",{cache:"no-store"});if(!r.ok)throw Error();const arts=await r.json();manageList.innerHTML=arts.map(a=>'<div class="manage-item" data-id="'+esc(a.id)+'"><img src="'+esc(a.image_url)+'" alt=""><div class="manage-item-content"><div class="title">'+esc(titleOf(a))+'</div><div class="manage-actions"><button type="button" class="edit">'+esc(t("edit"))+'</button><button type="button" class="delete">'+esc(t("remove"))+'</button></div></div></div>').join("");manageList.querySelectorAll(".edit").forEach(b=>b.addEventListener("click",()=>{const item=b.closest(".manage-item"),a=arts.find(x=>String(x.id)===item.dataset.id);if(a)showEditor(item,a);}));manageList.querySelectorAll(".delete").forEach(b=>b.addEventListener("click",()=>deleteArtwork(b.closest(".manage-item").dataset.id,b)));}catch{manageList.innerHTML='<p class="status">'+t("listError")+'</p>';}}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function showEditor(item,a){
 const english=lang==="en", active=english?"en":"ru", inactive=english?"ru":"en";
 item.innerHTML='<form class="edit-form" enctype="multipart/form-data"><input type="hidden" name="language" value="'+lang+'">'+
 '<div class="language-input"><label>'+t("title")+' <span class="field-language">'+(english?'EN':'RU')+'</span><input name="title" data-edit="title" data-lang="ru" maxlength="120" required value="'+esc(a.title||'')+'" '+(english?'hidden':'')+'><input name="title_en" data-edit="title" data-lang="en" maxlength="120" placeholder="Artwork title" value="'+esc(a.title_en||'')+'" '+(!english?'hidden':'')+'></label></div>'+
 '<div class="language-input"><label>'+t("desc")+' <span class="field-language">'+(english?'EN':'RU')+'</span><textarea name="description" data-edit="description" data-lang="ru" maxlength="500" '+(english?'hidden':'')+'>'+esc(a.description||'')+'</textarea><textarea name="description_en" data-edit="description" data-lang="en" maxlength="500" placeholder="Artwork description" '+(!english?'hidden':'')+'>'+esc(a.description_en||'')+'</textarea></label></div>'+
 '<label class="file-picker"><input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><span>'+t("replace")+'</span></label>'+
 '<div class="manage-actions"><button type="submit" class="save">'+t("save")+'</button><button type="button" class="cancel">'+t("cancel")+'</button><button type="button" class="delete">'+t("remove")+'</button></div><div class="edit-status status"></div></form>';
 const form=item.querySelector("form"),status=item.querySelector(".edit-status");
 form.querySelector('input[type="file"]').addEventListener("change",e=>{if(e.target.files[0])e.target.nextElementSibling.textContent=e.target.files[0].name;});
 form.querySelector(".cancel").addEventListener("click",loadManageList);form.querySelector(".delete").addEventListener("click",()=>deleteArtwork(a.id,form.querySelector(".delete")));
 form.addEventListener("submit",async e=>{e.preventDefault();const save=form.querySelector(".save");save.disabled=true;status.textContent=t("saving");const fd=new FormData(form);const imageFile=form.querySelector('input[type="file"]');if(!imageFile.files.length||!imageFile.files[0]||imageFile.files[0].size===0)fd.delete("image");try{const r=await fetch("/api/edit?id="+encodeURIComponent(a.id),{method:"PATCH",headers:{"x-admin-code":adminCode},body:fd}),j=await r.json().catch(()=>({}));if(r.status===403){expireAdmin();return;}if(!r.ok){status.textContent=j.error||t("failed");save.disabled=false;return;}await loadManageList();await loadArtworks(search.value.trim());}catch{status.textContent=t("connection");save.disabled=false;}});
}

async function deleteArtwork(id,b){if(!confirm(t("confirm")))return;b.disabled=true;try{const r=await fetch("/api/delete?id="+encodeURIComponent(id),{method:"DELETE",headers:{"x-admin-code":adminCode}}),j=await r.json().catch(()=>({}));if(r.status===403){expireAdmin();return;}if(!r.ok){alert(j.error||t("failed"));b.disabled=false;return;}await loadManageList();await loadArtworks(search.value.trim());}catch{alert(t("connection"));b.disabled=false;}}
search.addEventListener("input",()=>{clearTimeout(timer);clearSearch.style.display=search.value?"block":"none";timer=setTimeout(()=>loadArtworks(search.value.trim()),220);});
clearSearch.addEventListener("click",()=>{search.value="";clearSearch.style.display="none";loadArtworks();search.focus();});
$("creditsBtn").addEventListener("click",()=>{$("creditsModal").classList.remove("hidden");loadCredits();});$("closeCredits").addEventListener("click",()=>$("creditsModal").classList.add("hidden"));$("creditsModal").addEventListener("click",e=>{if(e.target===$("creditsModal"))$("creditsModal").classList.add("hidden");});
$("editCreditsBtn").addEventListener("click",()=>{$("creditsEditor").classList.toggle("hidden");$("creditsRuInput").value=credits.ru||"";$("creditsEnInput").value=credits.en||"";});
async function loadCredits(){try{const r=await fetch("/api/credits",{cache:"no-store"});if(!r.ok)throw Error();credits=await r.json();}catch{credits={ru:"",en:""};}$("creditsText").textContent=(lang==="en"?credits.en:credits.ru)||t("noCredits");$("editCreditsBtn").classList.toggle("hidden",!adminCode);}
$("saveCredits").addEventListener("click",async()=>{const status=$("creditsStatus");status.textContent=t("saving");try{const r=await fetch("/api/credits",{method:"POST",headers:{"Content-Type":"application/json","x-admin-code":adminCode},body:JSON.stringify({ru:$("creditsRuInput").value,en:$("creditsEnInput").value})}),j=await r.json().catch(()=>({}));if(r.status===403){expireAdmin();return;}if(!r.ok){status.textContent=j.error||t("failed");return;}credits={ru:$("creditsRuInput").value,en:$("creditsEnInput").value};$("creditsText").textContent=(lang==="en"?credits.en:credits.ru)||t("noCredits");status.textContent=t("creditsSaved");}catch{status.textContent=t("connection");}});
window.addEventListener("load",()=>{applyText();setTimeout(()=>loader.classList.add("done"),500);loadArtworks();loadCredits();});
