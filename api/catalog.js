/** Vercel Function. TMDb discovery data is not a real cinema showtime feed. */
import {queryTmdb,sanitizeMovie} from '../lib/tmdb.mjs';

const SECTIONS=[
 {path:'/movie/now_playing',type:'movie',section:'now',params:{language:'en-US',region:'EG'}},
 {path:'/movie/upcoming',type:'movie',section:'upcoming',params:{language:'en-US',region:'EG'}},
 {path:'/movie/popular',type:'movie',section:'discover',params:{language:'en-US'}},
 {path:'/discover/movie',type:'movie',section:'arabic',params:{language:'en-US',with_original_language:'ar',sort_by:'popularity.desc',include_adult:false}},
 {path:'/tv/popular',type:'tv',section:'series',params:{language:'en-US'}},
 {path:'/tv/on_the_air',type:'tv',section:'series',params:{language:'en-US'}},
 {path:'/discover/tv',type:'tv',section:'series',params:{language:'en-US',with_original_language:'ar',sort_by:'popularity.desc',include_adult:false}}
];

export async function buildCatalogue(config={}){
 const results=await Promise.allSettled(SECTIONS.map(async s=>({section:s,items:(await queryTmdb(s.path,{...s.params,page:1},config)).results||[]})));
 const good=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
 if(!good.length)throw results[0]?.reason||new Error('TMDB_UNAVAILABLE');
 const map=new Map();
 for(const {section:s,items} of good)for(const item of items){
  const title=sanitizeMovie(item,{section:s.section,mediaType:s.type});
  if(title&&!map.has(title.id))map.set(title.id,title);
 }
 return {schema:1,source:'TMDb',generatedAt:new Date().toISOString(),region:'EG',
  disclaimer:'Discovery data, not verified Egypt cinema tickets, showtimes, or admission availability.',
  count:map.size,titles:[...map.values()],curated:{},partial:good.length!==SECTIONS.length};
}
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
 if(!process.env.TMDB_READ_ACCESS_TOKEN)return res.status(503).json({error:'TMDB_NOT_CONFIGURED'});
 try{
  const data=await buildCatalogue();
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json(data);
 }catch(e){console.error('TMDb catalogue error:',e.message);return res.status(e.status===401?502:503).json({error:'TMDB_UNAVAILABLE'});}
}
