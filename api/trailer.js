/** Returns a verified official YouTube trailer key, never raw video bytes or API credentials. */
import {movies} from '../public/catalog.js';
import {lookupCurated,movieTrailer,safeVideoUrl} from '../lib/tmdb.mjs';
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='GET')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 if(!process.env.TMDB_READ_ACCESS_TOKEN)return res.status(503).json({error:'TMDB_NOT_CONFIGURED'});
 const curatedId=String(req.query?.curated||'').slice(0,90);
 try{
  let type,id;
  if(curatedId){
   const film=movies.find(m=>m.id===curatedId);
   if(!film)return res.status(404).json({error:'UNKNOWN_TITLE'});
   const match=await lookupCurated(film);
   if(!match)return res.status(200).json({trailer:null,reason:'UNVERIFIED_TITLE'});
   id=match.id;type='movie';
  }else{
   type=String(req.query?.type||'');id=Number(req.query?.id);
   if(!['movie','tv'].includes(type)||!Number.isSafeInteger(id)||id<=0)return res.status(400).json({error:'INVALID_TITLE'});
  }
  const key=await movieTrailer(type,id);
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({trailer:key,url:safeVideoUrl(key),source:'TMDb',tmdbId:id});
 }catch(e){console.error('TMDb trailer fetch error:',e.message);return res.status(503).json({error:'TMDB_UNAVAILABLE'});}
}
