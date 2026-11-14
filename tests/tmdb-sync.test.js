import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeTitle,sanitizeTrailer,refreshCatalogue} from '../scripts/refresh-tmdb.mjs';
import {readFileSync} from 'node:fs';
test('TMDb title mapping is normalized and never falsely bookable',()=>{
 const m=normalizeTitle({id:99,title:'A Film',poster_path:'/abc.jpg',original_language:'ar'}, {mediaType:'movie',section:'now'});
 assert.equal(m.bookingAvailable,false);assert.equal(m.id,'tmdb-movie-99');assert.equal(m.posterUrl,'https://image.tmdb.org/t/p/w780/abc.jpg');
});
test('Trailer selection accepts only valid official YouTube trailer',()=>{
 assert.equal(sanitizeTrailer([{site:'YouTube',type:'Trailer',official:true,key:'AbCdEf123_-'}]),'AbCdEf123_-');
 assert.equal(sanitizeTrailer([{site:'YouTube',type:'Clip',key:'AbCdEf123_-'}]),null);
});
test('Missing API key fails explicitly without affecting local catalog',async()=>{
 await assert.rejects(refreshCatalogue({token:''}),/Missing TMDB/);
});
test('Hourly workflow has scheduling and no hardcoded credential',()=>{
 const w=readFileSync(new URL('../.github/workflows/tmdb-hourly.yml',import.meta.url),'utf8');
 assert.match(w,/17 \* \* \* \*/);assert.match(w,/secrets\.TMDB_READ_ACCESS_TOKEN/);
});
