import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mergeCatalogue,uniqueMoviesForMode,titleIdentity,releaseYear} from '../public/catalog-live.js';
import {officialTrailer,movieTrailer} from '../lib/tmdb.mjs';
const official='https://image.tmdb.org/t/p/w780/poster.jpg';
const makeFilm=(id,title,opts={})=>({id,title,arabic:title,mediaType:'movie',releaseDate:'2026-11-11',genre:'Drama',language:'Arabic',format:['Standard'],runtime:105,coming:false,isLive:false,...opts});
const tmdb=(id,title,opts={})=>({id:`tmdb-movie-${id}`,tmdbId:id,title,arabic:title,mediaType:'movie',section:'now',releaseDate:'2026-11-10',posterUrl:official,...opts});
test('V9: duplicate local and live titles become one card and adopt original official poster',()=>{
 const catalog=[makeFilm('hadoota','Hadoota')];
 const result=mergeCatalogue(catalog,{schema:1,generatedAt:'2026-11-14T00:00:00Z',titles:[tmdb(123,'Hadoota')]});
 assert.equal(result.added,0);
 assert.equal(catalog.length,1);
 assert.equal(catalog[0].id,'hadoota');
 assert.equal(catalog[0].posterUrl,official);
 assert.equal(catalog[0].tmdbId,123);
 assert.equal(uniqueMoviesForMode(catalog,'now').length,1);
 assert.equal(catalog[0].isLive,false); // preserve demo booking path
});
test('V9: all feed categories deduplicate, movies and TV remain distinct, different-year remakes stay distinct',()=>{
 const a=[makeFilm('film-2026','Moon Rising')];
 const result=mergeCatalogue(a,{schema:1,titles:[
  tmdb(11,'Moon Rising'),tmdb(11,'Moon Rising',{section:'discover'}),
  tmdb(12,'Moon Rising',{releaseDate:'1998-10-14'}),
  {...tmdb(13,'Moon Rising'),id:'tmdb-tv-13',mediaType:'tv',section:'series'},
 ]});
 assert.equal(result.added,2);
 assert.equal(a.length,3);
 assert.equal(uniqueMoviesForMode(a,'now').length,2); // a genuine older remake remains a separate film
 assert.equal(uniqueMoviesForMode(a,'series').length,1);
});
test('V9: no conflation of different films simply because words are similar',()=>{
 assert.notEqual(titleIdentity('Cat in the Hat'),titleIdentity('Hat in the Cat'));
 assert.equal(releaseYear({releaseDate:'2026-11-14'}),2026);
 const a=[makeFilm('film-1','How to Rob a Bank')];
 const data={schema:1,titles:[tmdb(15,'How to Rob a Bank Again')]};
 mergeCatalogue(a,data);
 assert.equal(a.length,2);
});
test('V9: video selection prefers official trailers; uses official teaser only if no trailer exists',()=>{
 const vids=[{site:'YouTube',type:'Teaser',key:'aaaAAA11111',official:true},
  {site:'YouTube',type:'Trailer',key:'bbbBBB22222',official:false},
  {site:'YouTube',type:'Trailer',key:'cccCCC33333',official:true},
  {site:'Vimeo',type:'Trailer',key:'dddDDD44444',official:true},
  {site:'YouTube',type:'Clip',key:'eeeEEE55555',official:true}];
 assert.equal(officialTrailer(vids),'cccCCC33333');
 assert.equal(officialTrailer(vids.filter(v=>v.type!=='Trailer')),'aaaAAA11111');
 assert.equal(officialTrailer([{site:'YouTube',type:'Clip',key:'aaaAAA11111'}]),null);
});
test('V9: movie trailer API asks TMDb for language-balanced official results',async()=>{
 const calls=[];
 const key='fooBAR12934';
 const trailer=await movieTrailer('movie',42,{token:'test-example-token',fetcher:async url=>{
   calls.push(url);
   return {ok:true,json:async()=>({results:[{site:'YouTube',type:'Trailer',key,official:true}]})};
 }});
 assert.equal(trailer,key);
 assert.ok(calls[0].includes('include_video_language='));
 assert.equal(calls.length,1);
});
test('V9: controls align at consistent height; film is never stretched inside the cinema',()=>{
 const css=fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const three=fs.readFileSync(new URL('../public/theater-three.js',import.meta.url),'utf8');
 assert.match(css,/--fox-control-height:46px/);
 assert.match(css,/grid-template-columns:max-content minmax\(0,1fr\)/);
 assert.match(css,/filter-bar\{[^}]*grid-template-columns:minmax\(150px,1\.4fr\)/);
 assert.match(css,/theater-trailer-iframe\{[\s\S]*?width:1280px!important;height:720px!important/);
 assert.match(three,/three\.module\.js/);
 assert.match(three,/toFov:58/);
 assert.match(three,/videoRevealTimer/);
 assert.match(app,/uniqueMoviesForMode\(movies,state\.filmMode\)/);
});
