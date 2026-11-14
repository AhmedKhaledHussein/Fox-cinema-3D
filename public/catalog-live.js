/** Safe conversion of the read-only hourly TMDb snapshot into FOX's presentation model.
 * Never invent ticket availability, venue assignments or showtimes for third-party data.
 */
const allowedSections=new Set(['now','upcoming','discover','arabic','series']);
export function mergeCatalogue(movies,snapshot){
 if(snapshot?.schema!==1||!Array.isArray(snapshot.titles))return {added:0,generatedAt:null};
 const seen=new Set(movies.map(m=>m.id));let added=0;
 // Verified TMDb lookups may add official trailer info to original demo film entries.
 for(const movie of movies){const c=snapshot.curated?.[movie.id];if(!c)continue;
  if(/^[A-Za-z0-9_-]{11}$/.test(c.trailer||''))movie.trailer=c.trailer;
  if(/^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\/[^\s]+$/.test(c.posterUrl||''))movie.posterUrl=c.posterUrl;
 }
 for(const item of snapshot.titles.slice(0,600)){
  if(!item||!/^tmdb-(movie|tv)-\d+$/.test(item.id)||!allowedSections.has(item.section)||seen.has(item.id))continue;
  if(!item.title||typeof item.title!=='string')continue;
  const safe={
   id:item.id,tmdbId:Number(item.tmdbId),title:item.title.slice(0,180),arabic:(item.arabic||item.title).slice(0,180),
   story:String(item.story||''),storyArabic:String(item.storyArabic||item.story||''),
   language:String(item.language||'Other'),genre:item.genre||'Cinema',runtime:Number(item.runtime)||0,rating:'NR',
   format:['Standard'],coming:item.section==='upcoming',mediaType:item.mediaType==='tv'?'tv':'movie',
   section:item.section,isLive:true,bookingAvailable:false,cast:'',
   posterUrl:/^https:\/\/image\.tmdb\.org\/t\/p\/(w\d+|original)\/[^\s]+$/.test(item.posterUrl)?item.posterUrl:'',
   backdropUrl:/^https:\/\/image\.tmdb\.org\/t\/p\/(w\d+|original)\/[^\s]+$/.test(item.backdropUrl)?item.backdropUrl:'',
   trailer:/^[A-Za-z0-9_-]{11}$/.test(item.trailer||'')?item.trailer:null,
   releaseDate:String(item.releaseDate||''),posterSource:`https://www.themoviedb.org/${item.mediaType==='tv'?'tv':'movie'}/${Number(item.tmdbId)}`,
  };movies.push(safe);seen.add(safe.id);added++;
 }
 return {added,generatedAt:snapshot.generatedAt||null};
}
export function inMode(m,mode){
 switch(mode){
  case 'now':return m.section==='now'||(!m.isLive&&!m.coming);
  case 'coming':return m.section==='upcoming'||(!m.isLive&&m.coming);
  case 'explore':return m.isLive&&m.mediaType==='movie';
  case 'series':return m.isLive&&m.mediaType==='tv';
  case 'arabic':return m.section==='arabic'||m.language==='Arabic';
  default:return !m.coming;
 }
}
