/** TMDb discovery integration — stable deduplication without inventing showtimes.
 * Curated cinema demo titles keep their local ids/booking demos; verified TMDb
 * duplicates contribute artwork and trailers rather than becoming a second card.
 */
const allowedSections = new Set(['now', 'upcoming', 'discover', 'arabic', 'series']);
export function titleIdentity(value) {
  return String(value || '').normalize('NFKD').toLocaleLowerCase('en')
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[\p{P}\p{S}\p{Z}]/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}
export function releaseYear(movie) {
  const m = String(movie?.releaseDate || '').match(/^(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}
const hasOfficialPoster = m => /^https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)\/[^\s]+$/i.test(m?.posterUrl || '');
const isVideo = v => /^[A-Za-z0-9_-]{11}$/.test(v || '');
function matchedTitle(a,b) {
  if (a.mediaType === 'tv' !== (b.mediaType === 'tv')) return false;
  if (a.tmdbId && b.tmdbId && Number(a.tmdbId) === Number(b.tmdbId)) return true;
  const aa = new Set([a.title,a.originalTitle,a.arabic].map(titleIdentity).filter(Boolean));
  const bb = [b.title,b.originalTitle,b.arabic].map(titleIdentity).filter(Boolean);
  if (!bb.some(x => aa.has(x))) return false;
  const ya=releaseYear(a), yb=releaseYear(b);
  return !ya || !yb || Math.abs(ya-yb) <= 1;
}
export function mergeOfficialMetadata(existing, incoming) {
  if (hasOfficialPoster(incoming) && !hasOfficialPoster(existing)) existing.posterUrl=incoming.posterUrl;
  if (incoming.backdropUrl && !existing.backdropUrl) existing.backdropUrl=incoming.backdropUrl;
  if (isVideo(incoming.trailer) && !isVideo(existing.trailer)) existing.trailer=incoming.trailer;
  if (!existing.tmdbId && incoming.tmdbId) existing.tmdbId=incoming.tmdbId;
  if (incoming.posterSource && hasOfficialPoster(incoming) && !existing.officialPosterSource) {
    existing.officialPosterSource=incoming.posterSource;
  }
}
function mapTitle(item) {
  return {
    id:item.id,tmdbId:Number(item.tmdbId),title:item.title.slice(0,180),
    originalTitle:String(item.originalTitle||'').slice(0,180),
    arabic:String(item.arabic||item.title).slice(0,180),
    story:String(item.story||''),storyArabic:String(item.storyArabic||item.story||''),
    language:String(item.language||'Other'),genre:String(item.genre||'Cinema'),runtime:Number(item.runtime)||0,rating:'NR',
    format:['Standard'],coming:item.section==='upcoming',mediaType:item.mediaType==='tv'?'tv':'movie',
    section:item.section,isLive:true,bookingAvailable:false,cast:'',
    posterUrl:hasOfficialPoster(item)?item.posterUrl:'',
    backdropUrl:/^https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)\/[^\s]+$/.test(item.backdropUrl||'')?item.backdropUrl:'',
    trailer:isVideo(item.trailer)?item.trailer:null,releaseDate:String(item.releaseDate||''),
    posterSource:`https://www.themoviedb.org/${item.mediaType==='tv'?'tv':'movie'}/${Number(item.tmdbId)}`
  };
}
export function mergeCatalogue(movies,snapshot) {
  if(snapshot?.schema!==1||!Array.isArray(snapshot.titles)) return {added:0,updated:0,merged:0,generatedAt:null};
  let added=0,updated=0,merged=0;
  for (const local of movies) {
    const curated=snapshot.curated?.[local.id];
    if (!curated) continue;
    if (isVideo(curated.trailer) && local.trailer!==curated.trailer){local.trailer=curated.trailer;updated++;}
    if (hasOfficialPoster(curated) && !hasOfficialPoster(local)){local.posterUrl=curated.posterUrl;updated++;}
    if(curated.tmdbId && !local.tmdbId)local.tmdbId=Number(curated.tmdbId);
  }
  for(const item of snapshot.titles.slice(0,1000)) {
    if(!item || !/^tmdb-(movie|tv)-\d+$/.test(item.id) || !allowedSections.has(item.section) ||
       !Number.isInteger(Number(item.tmdbId)) || Number(item.tmdbId)<=0 ||
       typeof item.title!=='string' || !item.title.trim()) continue;
    const film=mapTitle(item);
    const existing=movies.find(m=>m.id===film.id || matchedTitle(m,film));
    if(existing) {
      if(existing.id!==film.id)merged++;
      if(existing.isLive && existing.id===film.id) {
        for(const [k,v] of Object.entries(film))if(existing[k]!==v){existing[k]=v;updated++;}
      } else mergeOfficialMetadata(existing,film);
      continue;
    }
    movies.push(film);added++;
  }
  return {added,updated,merged,generatedAt:snapshot.generatedAt||null};
}
export function inMode(m,mode) {
  switch(mode){
    case 'now':return m.section==='now'||(!m.isLive&&!m.coming);
    case 'coming':return m.section==='upcoming'||(!m.isLive&&m.coming);
    case 'explore':return m.isLive&&m.mediaType==='movie';
    case 'series':return m.isLive&&m.mediaType==='tv';
    case 'arabic':return m.section==='arabic'||m.language==='Arabic';
    default:return !m.coming;
  }
}
/** Avoid duplicate posters/cards even if live feed sections overlap in multiple windows. */
export function uniqueMoviesForMode(movies,mode) {
 const filtered=movies.filter(m=>inMode(m,mode));
 const out=[];
 for(const item of filtered) {
   const found=out.find(o=>o.id===item.id||matchedTitle(o,item));
   if(found){mergeOfficialMetadata(found,item);continue;}
   out.push(item);
 }
 // Official posters first, including after matching locally curated titles.
 return out.sort((a,b)=>Number(hasOfficialPoster(b))-Number(hasOfficialPoster(a)));
}
