import test from 'node:test';import assert from 'node:assert/strict';
import {mergeCatalogue,inMode} from '../public/catalog-live.js';
test('TMDb titles render as discovery only and do not become bookable',()=>{
 const arr=[];const r=mergeCatalogue(arr,{schema:1,generatedAt:'2026-11-14T01:00:00Z',titles:[{id:'tmdb-movie-10',tmdbId:10,title:'Example',arabic:'مثال',section:'now',mediaType:'movie',posterUrl:'https://image.tmdb.org/t/p/w780/abc.jpg'}]});
 assert.equal(r.added,1);assert.equal(arr[0].bookingAvailable,false);assert.equal(inMode(arr[0],'now'),true);assert.equal(inMode(arr[0],'series'),false);
});
test('Reject unsafe content and duplicate catalogue rows',()=>{
 const a=[];const item={id:'tmdb-tv-12',tmdbId:12,title:'Series',section:'series',mediaType:'tv',trailer:'<script>'};
 mergeCatalogue(a,{schema:1,titles:[item,item]});assert.equal(a.length,1);assert.equal(a[0].trailer,null);
});
