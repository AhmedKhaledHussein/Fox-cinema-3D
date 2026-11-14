/** Resolve a curated FOX movie to a verified TMDb film poster; never guess wrong artwork. */
import {movies} from '../public/catalog.js';
import {lookupCurated} from '../lib/tmdb.mjs';
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='GET')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 const id=String(req.query?.id||'').slice(0,90);
 const film=movies.find(m=>m.id===id);
 if(!film)return res.status(404).json({error:'UNKNOWN_TITLE'});
 if(!process.env.TMDB_READ_ACCESS_TOKEN)return res.status(503).json({error:'TMDB_NOT_CONFIGURED'});
 try{
  const match=await lookupCurated(film);
  res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
  const path=match?.poster_path;
  const posterUrl=path&&/^\/[A-Za-z0-9_./-]+\.(jpg|jpeg|png|webp)$/i.test(path)?`https://image.tmdb.org/t/p/w780${path}`:null;
  return res.status(200).json({id,matched:!!match,posterUrl,tmdbId:match?.id||null,source:match?`https://www.themoviedb.org/movie/${match.id}`:null});
 }catch(e){console.error('TMDb title lookup error:',e.message);return res.status(503).json({error:'TMDB_UNAVAILABLE'});}
}
