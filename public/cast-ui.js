/** Accessible, safe actor and character cards. All dynamic text escaped. */
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function castLoading(lang='en'){
 return `<div class="cast-loading" role="status">${lang==='ar'?'جارٍ تحميل طاقم العمل…':'Loading cast & characters…'}</div>`;
}
export function castMarkup(data,lang='en'){
 const cast=Array.isArray(data?.cast)?data.cast:[];
 if(!cast.length)return `<div class="cast-empty">${lang==='ar'?'لا توجد معلومات مؤكدة عن طاقم العمل لهذا العنوان في TMDb حاليًا.':'Verified cast information is not available on TMDb for this title yet.'}</div>`;
 return `<div class="cast-grid">${cast.slice(0,24).map(p=>{
   const id=Number(p.id),valid=Number.isSafeInteger(id)&&id>0;
   const name=esc(p.name||'');
   const character=esc(p.character|| (lang==='ar'?'الدور غير معلن':'Role not announced'));
   const portrait=typeof p.portrait==='string'&&/^https:\/\/image\.tmdb\.org\/t\/p\/w342\/[\w.\/-]+$/.test(p.portrait)?p.portrait:null;
   const initials=esc(String(p.name||'').split(' ').filter(Boolean).slice(0,2).map(s=>s.charAt(0)).join('').toUpperCase());
   return `<article class="cast-person"><a class="cast-link" href="${valid?'https://www.themoviedb.org/person/'+id:'https://www.themoviedb.org/'}" target="_blank" rel="noopener noreferrer" aria-label="${name}"><span class="cast-avatar">${portrait?`<img src="${esc(portrait)}" loading="lazy" decoding="async" alt="${name}" onerror="this.style.display='none'"/>`:''}<span class="cast-initials">${initials}</span></span><strong class="cast-name">${name}</strong></a><span class="cast-role-label">${p.voice?(lang==='ar'?'أداء صوتي':'Voice of'):(lang==='ar'?'الشخصية':'As')}</span><span class="cast-character">${character}</span></article>`;
  }).join('')}</div>`;
}
