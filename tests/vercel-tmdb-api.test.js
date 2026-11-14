import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCatalogue} from '../api/catalog.js';
import {officialTrailer,pickExactTitle,sanitizeMovie,queryTmdb,safeVideoUrl} from '../lib/tmdb.mjs';
import titleHandler from '../api/title.js';
import trailerHandler from '../api/trailer.js';

const makeFetch=(responder=()=>({results:[{id:78,title:'The Cinema Movie',poster_path:'/poster.jpg',original_language:'en',release_date:'2026-11-14'}]}))=>async(input,options)=>{
 assert.match(input,/^https:\/\/api\.themoviedb\.org\/3\//);
 assert.equal(options.headers.Authorization,'Bearer '+('A'.repeat(80)));
 return {ok:true,status:200,json:async()=>responder(new URL(input))};
};
function mockResponse(){return {headers:{},statusCode:200,jsonBody:null,setHeader(k,v){this.headers[k]=v;},status(s){this.statusCode=s;return this;},json(body){this.jsonBody=body;return this;}}}

test('live catalogue builds distinct TMDb posters with non-bookable movies and TV shows',async()=>{
 const data=await buildCatalogue({token:'A'.repeat(80),fetcher:makeFetch()});
 assert.equal(data.schema,1);
 assert.equal(data.titles.length,2);
 assert.ok(data.titles.every(x=>x.bookingAvailable===false));
 assert.ok(data.titles.every(x=>x.posterUrl==='https://image.tmdb.org/t/p/w780/poster.jpg'));
 assert.equal(data.count,2);
});

test('real poster paths are validated, and no invented cinema availability is attached',()=>{
 const a=sanitizeMovie({id:19,title:'New title',poster_path:'https://evil.invalid/x',original_language:'ar'},{section:'now',mediaType:'movie'});
 assert.equal(a.posterUrl,'');assert.equal(a.bookingAvailable,false);
 assert.equal(a.language,'Arabic');
});

test('trailer URL is only generated from valid verified YouTube IDs',()=>{
 assert.equal(officialTrailer([{site:'YouTube',type:'Teaser',key:'abc123def45'},{site:'YouTube',type:'Trailer',key:'abc123def45',official:true}]),'abc123def45');
 assert.equal(safeVideoUrl('abc123def45'),'https://www.youtube.com/watch?v=abc123def45');
 assert.equal(safeVideoUrl('javascript:bad'),null);
});

test('curated film matching rejects similarly named / wrong-year movies',()=>{
 const a=[{id:1,title:'Movie Four',release_date:'2024-10-10'},{id:2,title:'Movie Four',release_date:'2026-10-10'}];
 assert.equal(pickExactTitle(a,'Movie Four','2026').id,2);
 assert.equal(pickExactTitle(a,'Different Movie','2026'),null);
});

test('TMDb credentials stay in server side headers and never in URLs',async()=>{
 let called=false;
 await queryTmdb('/movie/popular',{region:'EG'},{token:'A'.repeat(80),fetcher:async(url,options)=>{
  called=true;assert.equal(new URL(url).searchParams.has('api_key'),false);
  assert.equal(options.headers.Authorization,'Bearer '+('A'.repeat(80)));
  return {ok:true,json:async()=>({results:[]})};
 }});
 assert.ok(called);
});

test('API endpoints reject requests without Vercel secret rather than revealing it',async()=>{
 const old=process.env.TMDB_READ_ACCESS_TOKEN;delete process.env.TMDB_READ_ACCESS_TOKEN;
 try{
  const res1=mockResponse();await titleHandler({method:'GET',query:{id:'godzilla-minus-zero'}},res1);
  assert.equal(res1.statusCode,503);assert.deepEqual(res1.jsonBody,{error:'TMDB_NOT_CONFIGURED'});
  const res2=mockResponse();await trailerHandler({method:'GET',query:{curated:'godzilla-minus-zero'}},res2);
  assert.equal(res2.statusCode,503);
 }finally{if(old)process.env.TMDB_READ_ACCESS_TOKEN=old;}
});
