/** Safe TMDb credits normalization. No invented roles, portrait URLs or people. */
const portraitPath=/^\/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp)$/i;
export function normalizeCast(payload,{type='movie',isAnimation=false,limit=24}={}){
 const seen=new Set();
 return (Array.isArray(payload?.cast)?payload.cast:[])
  .filter(person=>Number.isSafeInteger(Number(person?.id))&&Number(person.id)>0&&typeof person?.name==='string'&&person.name.trim())
  .sort((a,b)=>(Number(a.order??a.cast_id??9999)-Number(b.order??b.cast_id??9999)))
  .flatMap(person=>{
   if(seen.has(person.id))return [];seen.add(person.id);
   const roles=Array.isArray(person.roles)?person.roles:[];
   const characters=roles.map(r=>typeof r?.character==='string'?r.character.trim():'').filter(Boolean);
   const role=characters.length?[...new Set(characters)].slice(0,2).join(' / '):String(person.character||'').trim();
   const voice=/\bvoice\b|صوت|دوبلاج/i.test(role)||Boolean(isAnimation&&role&&person.known_for_department==='Acting');
   const profile=String(person.profile_path||'');
   return [{id:Number(person.id),name:person.name.trim().slice(0,140),character:role.slice(0,220),voice,
    portrait:portraitPath.test(profile)?`https://image.tmdb.org/t/p/w342${profile}`:null,
    url:`https://www.themoviedb.org/person/${Number(person.id)}`}];
  }).slice(0,Math.max(0,Math.min(40,limit)));
}
export function normalizeCastResponse(payload,config={}){
 return {source:'TMDb',type:config.type==='tv'?'tv':'movie',cast:normalizeCast(payload,config)};
}
