/** TMDb credits, retrieved server-side. The API token is never exposed to visitors. */
import {movies} from '../public/catalog.js';
import {lookupCurated,queryTmdb} from '../lib/tmdb.mjs';
import {normalizeCastResponse} from '../lib/cast.mjs';
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='GET')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 if(!process.env.TMDB_READ_ACCESS_TOKEN)return res.status(503).json({error:'TMDB_NOT_CONFIGURED'});
 const curated=String(req.query?.curated||'').slice(0,96);
 let type='movie',id=0,isAnimation=false;
 if(curated){
  const film=movies.find(m=>m.id===curated);
  if(!film)return res.status(404).json({error:'UNKNOWN_TITLE'});
  isAnimation=film.genre==='Animation';
  try{const match=await lookupCurated(film);if(!match){res.setHeader('Cache-Control','public, s-maxage=1200');return res.status(200).json({source:'TMDb',cast:[],verified:false});}id=Number(match.id);isAnimation=isAnimation||match.genre_ids?.includes(16);}
  catch{ return res.status(503).json({error:'TMDB_UNAVAILABLE'}); }
 }else{
  type=String(req.query?.type||'');id=Number(req.query?.id);
  if(!['movie','tv'].includes(type)||!Number.isSafeInteger(id)||id<=0)return res.status(400).json({error:'INVALID_TITLE'});
 }
 try{
  let payload=await queryTmdb(`/${type}/${id}/${type==='tv'?'aggregate_credits':'credits'}`,{language:'en-US'});
  if(type==='tv'&&!Array.isArray(payload?.cast))payload=await queryTmdb(`/tv/${id}/credits`,{language:'en-US'});
  res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=86400');
  return res.status(200).json({...normalizeCastResponse(payload,{type,isAnimation,limit:24}),verified:true,tmdbId:id});
 }catch(e){console.error('TMDb cast lookup error:',e.message);return res.status(503).json({error:'TMDB_UNAVAILABLE'});}
}
