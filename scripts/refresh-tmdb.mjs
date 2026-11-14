/** TMDb public catalogue snapshot builder. Credentials only from GitHub Actions secret / process env.
 * Source: TMDb (https://www.themoviedb.org/). Listings are NOT cinema tickets/showtimes.
 */
import fs from 'node:fs/promises';
import {movies as curatedMovies} from '../public/catalog.js';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const TOKEN=process.env.TMDB_READ_ACCESS_TOKEN||process.env.TMDB_API_KEY;
const BASE='https://api.themoviedb.org/3';
export const SNAPSHOT_VERSION=1;
const hold=ms=>new Promise(r=>setTimeout(r,ms));
export function sanitizeTrailer(videos=[]){
  const c=videos.filter(v=>v.site==='YouTube'&&/^[A-Za-z0-9_-]{11}$/.test(v.key)&&v.type==='Trailer');
  c.sort((a,b)=>Number(b.official)-Number(a.official));
  return c[0]?.key||null;
}
export function normalizeTitle(m,{mediaType='movie',section='now'}={}){
  const title=String(m.title||m.name||m.original_title||m.original_name||'Untitled').slice(0,180);
  const id=Number(m.id);
  if(!Number.isInteger(id)||id<=0)throw Error('Invalid TMDb title ID');
  const poster=m.poster_path&&/^\/[A-Za-z0-9._/-]+$/.test(m.poster_path)?`https://image.tmdb.org/t/p/w780${m.poster_path}`:'';
  const backdrop=m.backdrop_path&&/^\/[A-Za-z0-9._/-]+$/.test(m.backdrop_path)?`https://image.tmdb.org/t/p/w1280${m.backdrop_path}`:'';
  return {id:`tmdb-${mediaType}-${id}`,tmdbId:id,mediaType,isLive:true,bookingAvailable:false,
    title,arabic:String(m.arabicTitle||m.original_title||m.original_name||title).slice(0,180),
    genre:'Cinema',language:m.original_language==='ar'?'Arabic':m.original_language==='en'?'English':String(m.original_language||'Other'),
    runtime:Number(m.runtime)||0,rating:'NR',format:['Standard'],
    posterUrl:poster,backdropUrl:backdrop,posterSource:`https://www.themoviedb.org/${mediaType}/${id}`,
    story:String(m.overview||'').slice(0,1200),storyArabic:String(m.overviewArabic||m.overview||'').slice(0,1200),
    cast:'',releaseDate:String(m.release_date||m.first_air_date||''),
    coming:section==='upcoming',section,trailer:sanitizeTrailer(m.videos?.results||m.trailers||[]),
    voteAverage:Math.round(Number(m.vote_average||0)*10)/10};
}
export async function refreshCatalogue({fetcher=fetch,token=TOKEN,now=new Date()}={}){
 if(!token)throw Error('Missing TMDB_READ_ACCESS_TOKEN GitHub Actions secret (or TMDB_API_KEY)');
 const auth=token.includes('.')||token.length>60?{Authorization:`Bearer ${token}`} : null;
 async function request(route,params={}){
  const url=new URL(BASE+route);for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
  if(!auth)url.searchParams.set('api_key',token);
  for(let attempt=0;attempt<3;attempt++){
    const r=await fetcher(url.toString(),{headers:{...auth,Accept:'application/json','User-Agent':'FOX-Cinema-Demo-Sync/1.0'},signal:AbortSignal.timeout(18000)});
    if(r.ok)return r.json();
    if((r.status===429||r.status>=500)&&attempt<2){await hold((attempt+1)*1500);continue;}
    throw Error(`TMDb ${r.status}: ${route}`);
  }
 }
 const endpoints=[
  {route:'/movie/now_playing',mediaType:'movie',section:'now',params:{region:'EG',language:'en-US'}},
  {route:'/movie/upcoming',mediaType:'movie',section:'upcoming',params:{region:'EG',language:'en-US'}},
  {route:'/movie/popular',mediaType:'movie',section:'discover',params:{language:'en-US'}},
  {route:'/discover/movie',mediaType:'movie',section:'arabic',params:{with_original_language:'ar',sort_by:'popularity.desc',language:'en-US',include_adult:'false'}},
  {route:'/tv/popular',mediaType:'tv',section:'series',params:{language:'en-US'}},
  {route:'/tv/on_the_air',mediaType:'tv',section:'series',params:{language:'en-US'}},
  {route:'/discover/tv',mediaType:'tv',section:'series',params:{with_original_language:'ar',sort_by:'popularity.desc',language:'en-US'}},
 ];
 const all=new Map();
 for(const e of endpoints){
  for(let page=1;page<=2;page++){
   const batch=await request(e.route,{...e.params,page});
   for(const item of batch.results||[]){if(!item?.id||all.has(`${e.mediaType}:${item.id}`))continue;all.set(`${e.mediaType}:${item.id}`,normalizeTitle(item,e));}
  }
 }
 // Enrich most visible movies/TV with official video metadata and localized titles. No guesswork for missing trailers.
 const enrichment=[...all.values()].slice(0,150);
 let cursor=0;
 async function enrich(){while(cursor<enrichment.length){const item=enrichment[cursor++];try{
    const [details,videos]=await Promise.all([
      request(`/${item.mediaType}/${item.tmdbId}`,{language:'ar-EG'}),
      request(`/${item.mediaType}/${item.tmdbId}/videos`,{language:'en-US',include_video_language:'en,ar,xx'})
    ]);
    item.arabic=details.title||details.name||item.arabic;
    item.storyArabic=details.overview||item.story;
    item.runtime=details.runtime||(details.episode_run_time?.[0])||0;
    item.trailer=sanitizeTrailer(videos.results||[]);
   }catch(e){console.warn(`Enrichment failed for ${item.id}: ${e.message}`);}await hold(70);}}
 await Promise.all([enrich(),enrich(),enrich(),enrich()]);
 // Connect locally curated demo titles to correctly matched TMDb official trailers.
 // Strict matching on English title and release year prevents wrong-film playback.
 const curated={};
 for(const m of curatedMovies.slice(0,55)){
   try{
     const response=await request('/search/movie',{query:m.title,language:'en-US',include_adult:'false'});
     const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
     const expectedYear=String(m.releaseDate||'').slice(0,4);
     const match=(response.results||[]).find(x=>normalize(x.title)===normalize(m.title)&&(!expectedYear||String(x.release_date||'').startsWith(expectedYear)));
     if(!match)continue;
     const video=await request(`/movie/${match.id}/videos`,{language:'en-US',include_video_language:'en,ar,xx'});
     const trailer=sanitizeTrailer(video.results||[]);
     const officialPoster=match.poster_path?`https://image.tmdb.org/t/p/w780${match.poster_path}`:null;
     if(trailer||officialPoster)curated[m.id]={trailer,posterUrl:officialPoster,tmdbId:match.id};
   }catch(error){console.warn(`Curated match skipped for ${m.id}: ${error.message}`);}
   await hold(70);
 }
 const result={schema:SNAPSHOT_VERSION,source:'TMDb',generatedAt:now.toISOString(),region:'EG',
  disclaimer:'TMDb movie lists are discovery data; they do not confirm local cinema showtimes or booking availability.',
  count:all.size,titles:[...all.values()],curated};
 return result;
}
const main=process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]);
if(main){
 try{
  const data=await refreshCatalogue();const outfile=path.resolve('public/data/entertainment.json');
  await fs.mkdir(path.dirname(outfile),{recursive:true});await fs.writeFile(outfile,JSON.stringify(data,null,2)+'\n');
  console.log(`TMDb sync wrote ${data.count} titles to ${outfile}`);
 }catch(e){console.error(e.message);process.exitCode=1;}
}
