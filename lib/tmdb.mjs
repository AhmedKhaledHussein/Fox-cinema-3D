/** FOX CINEMA TMDb integration. All access tokens remain server-side. */
const ROOT='https://api.themoviedb.org/3';
const SAFE_VIDEO=/^[A-Za-z0-9_-]{11}$/;
export function isVideoKey(key){return typeof key==='string'&&SAFE_VIDEO.test(key)}
export function officialTrailer(videos=[]){
 const v=Array.isArray(videos)?videos:[];
 return v.filter(x=>x?.site==='YouTube'&&x.type==='Trailer'&&isVideoKey(x.key))
  .sort((a,b)=>Number(Boolean(b.official))-Number(Boolean(a.official)))[0]?.key||null;
}
export function titleKey(s){return String(s||'').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
export function pickExactTitle(results,title,year){
 const key=titleKey(title),y=Number(year);
 return (Array.isArray(results)?results:[]).find(x=>{
  const matches=[x.title,x.original_title,x.name,x.original_name].some(v=>titleKey(v)===key);
  const release=Number(String(x.release_date||x.first_air_date||'').slice(0,4));
  return matches&&(!y||!release||Math.abs(y-release)<=1);
 })||null;
}
export function sanitizeMovie(item,{section,mediaType='movie'}={}){
 if(!item||!Number.isInteger(Number(item.id))||Number(item.id)<=0||!item.title&&!item.name)return null;
 const id=Number(item.id),poster=String(item.poster_path||''),backdrop=String(item.backdrop_path||'');
 const imagePath=p=>/^\/[A-Za-z0-9_./-]+\.(jpg|jpeg|png|webp)$/i.test(p);
 return {
  id:`tmdb-${mediaType}-${id}`,tmdbId:id,mediaType,section,isLive:true,bookingAvailable:false,
  title:String(item.title||item.name||'').slice(0,180),
  arabic:String(item.arabicTitle||item.title||item.name||'').slice(0,180),
  genre:'Cinema',language:item.original_language==='ar'?'Arabic':item.original_language==='en'?'English':String(item.original_language||'Other'),
  runtime:0,rating:'NR',format:['Standard'],
  posterUrl:imagePath(poster)?`https://image.tmdb.org/t/p/w780${poster}`:'',
  backdropUrl:imagePath(backdrop)?`https://image.tmdb.org/t/p/w1280${backdrop}`:'',
  story:String(item.overview||'').slice(0,1200),storyArabic:String(item.overview||'').slice(0,1200),cast:'',
  releaseDate:String(item.release_date||item.first_air_date||''),coming:section==='upcoming',
  posterSource:`https://www.themoviedb.org/${mediaType}/${id}`,
  trailer:null,voteAverage:Math.round(Number(item.vote_average||0)*10)/10
 };
}
export async function queryTmdb(route,params={},config={}){
 const token=config.token??process.env.TMDB_READ_ACCESS_TOKEN;
 if(!token){const err=new Error('TMDB_NOT_CONFIGURED');err.status=503;throw err;}
 if(!/^\/(?:movie|tv|discover|search)\/[a-zA-Z0-9_/-]+$/.test(route)){throw new Error('TMDB_INVALID_ROUTE');}
 const url=new URL(ROOT+route);
 for(const [k,v] of Object.entries(params)){if(v!==undefined&&v!==null)url.searchParams.set(k,String(v))}
 const headers={Accept:'application/json'};
 if(token.length>60||token.includes('.'))headers.Authorization=`Bearer ${token}`;
 else url.searchParams.set('api_key',token);
 const fetcher=config.fetcher||fetch;
 const response=await fetcher(url.toString(),{headers,signal:AbortSignal.timeout(9000)});
 if(!response.ok){const err=new Error(response.status===401?'TMDB_AUTH_REJECTED':'TMDB_UPSTREAM_ERROR');err.status=response.status;throw err;}
 return response.json();
}
export async function lookupCurated(movie,config={}){
 if(!movie?.title)return null;
 const results=await queryTmdb('/search/movie',{query:movie.title,language:'en-US',include_adult:'false'},config);
 const found=pickExactTitle(results.results,movie.title,String(movie.releaseDate||'').slice(0,4));
 return found||null;
}
export async function movieTrailer(type,id,config={}){
 if(!['movie','tv'].includes(type)||!Number.isSafeInteger(Number(id))||Number(id)<=0)throw new Error('TMDB_INVALID_ID');
 const endpoint=`/${type}/${Number(id)}/videos`;
 const english=await queryTmdb(endpoint,{language:'en-US'},config);
 let key=officialTrailer(english.results);
 if(!key){const alternate=await queryTmdb(endpoint,{language:'ar-EG'},config);key=officialTrailer(alternate.results);}
 return key;
}
export function safeVideoUrl(key){return isVideoKey(key)?`https://www.youtube.com/watch?v=${key}`:null}
